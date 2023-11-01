import fs from "fs";
import { spawn, exec, ChildProcess } from "child_process";
import mongoose from "mongoose";
import { ethers } from "ethers";
import * as passwordGenerator from "secure-random-password";
import Docker from "dockerode";

import {
  KeeperCreationInput,
  KeeperStatus,
  TransactionData,
  KeeperBalances,
} from "../../types";

import KeeperModel from "../../models/keeper.model";
import TransactionModel from "../../models/transaction.model";

import Wallet from "../wallets/Wallet";
import { getCIDFile, getLogsFile, getWalletFile } from "../files";
import { networks, systems } from "../systems";
import Covalent from "../external/Covalent";
import NotificationService from "../notifications/NotificationService";
import Transaction from "../transaction/Transaction";

let docker = new Docker({ socketPath: "/var/run/docker.sock" });

const notMain = async () => {
  console.log("trying to get service");
  try {
    const service = docker.getService("hardcore_wozniak");

    const serviceTasks = await docker.listTasks({
      service: service.ID,
    });

    //console.log(await service.logs({ stdout: true, stderr: true }));
    console.log(serviceTasks[0].Status.State);
  } catch (err) {
    console.log(err);
  }
};

//notMain()

class Keeper {
  docker: Docker;
  transactionInterval = 60 * 1000;
  transactionsMapping: Map<string, Transaction> = new Map();

  _id: mongoose.Types.ObjectId | undefined;

  network: string | undefined;
  system: string | undefined;
  collateral: string | undefined;
  options: string[] | undefined;

  wallet: Wallet | undefined;

  status: KeeperStatus;
  tries: number;

  serviceName: string | undefined;
  passwordSecretName: string | undefined;
  service: Docker.Service | undefined;

  containerId: string | undefined;
  container: ChildProcess | undefined;

  rpcUri: string | undefined;
  systemImage: string | undefined;
  covalentIdentifier: string | undefined;

  systemCoinAddress: string | undefined;
  collateralAddress: string | undefined;

  startingTime: Date | undefined;

  haveSetLogs: boolean;

  notificationService: NotificationService;

  balances: KeeperBalances = {
    native: BigInt(0),
    system: BigInt(0),
    systemCoinJoin: BigInt(0),
    collateral: BigInt(0),
    collateralCoinJoin: BigInt(0),
  };

  constructor(notificationService: NotificationService) {
    console.log(`constructing a keeper`);
    this.status = KeeperStatus.INITIALIZING;
    this.tries = 0;
    this.haveSetLogs = false;
    this.notificationService = notificationService;
    this.docker = new Docker({ socketPath: "/var/run/docker.sock" });
  }

  async load(_id: mongoose.Types.ObjectId) {
    this._id = _id;
    try {
      const keeper = await KeeperModel.findOne({ _id: this._id });
      if (keeper) {
        this.network = keeper.network;
        this.system = keeper.system;
        this.collateral = keeper.collateral;
        this.options = keeper.options;
        this.wallet = new Wallet();
        await this.wallet.load(keeper.wallet);
        this.status = keeper.status;
        this.serviceName = keeper.serviceName;
        this.tries = keeper.tries;
        this.setSystemParams();
      } else {
        throw new Error("Can't find the keeper");
      }
    } catch (err) {
      throw err;
    }
    this.setSystemParams();
    // run the container
    this.handleService();
  }

  async save() {
    // save the current state of the keeper
    if (!this._id) {
      throw new Error("Can't save the keeper without id");
    }
    return KeeperModel.updateOne(
      { _id: this._id },
      {
        $set: {
          system: this.system,
          network: this.network,
          collateral: this.collateral,
          wallet: this.wallet,
          status: this.status,
          options: this.options,
          containerId: this.containerId,
          serviceName: this.serviceName,
        },
      }
    );
  }

  async create({
    system,
    network,
    collateral,
    privateKey,
    options,
  }: KeeperCreationInput) {
    const password = passwordGenerator.randomPassword({ length: 32 });

    if (!password) {
      throw new Error("Wallet password is not provided");
    }
    this.wallet = new Wallet();
    await this.wallet.generateKeyPassFile(privateKey, password);
    //await wallet.load();

    this.serviceName = `${network}${collateral}_${this.wallet.address}`;
    this.passwordSecretName = `${this.serviceName}_wp`;

    docker.createSecret({
      Name: this.passwordSecretName,
      Data: btoa(password),
    });

    // create the keeper - set properties
    const keeperDoc = new KeeperModel({
      system,
      network,
      collateral,
      wallet: this.wallet.address,
      options,
      serviceName: this.serviceName,
    });
    keeperDoc.save();
    console.log(`keeper saved. keeper id: ${keeperDoc._id}`);

    // save the current state of the keeper
    this._id = keeperDoc._id;
    this.network = keeperDoc.network;
    this.system = keeperDoc.system;
    this.collateral = keeperDoc.collateral;
    this.options = keeperDoc.options;
    this.status = keeperDoc.status;
    this.tries = keeperDoc.tries;

    this.setSystemParams();
    // run the container
    this.handleService();
  }

  setSystemParams() {
    if (!this.network || !this._id) {
      throw new Error("Keeper is not initialized properly");
    }
    type ObjectKey = keyof typeof networks;
    const networkName = this.network.toLowerCase() as ObjectKey;
    this.rpcUri = networks[networkName].rpc_uri;
    const selectedSystem = systems.find((sys) => sys.name === this.system);
    this.systemImage = selectedSystem?.image;
    const selectedNetwork = selectedSystem?.networks.find(
      (system) => system.name.toLowerCase() == networkName.toLowerCase()
    );
    this.covalentIdentifier = selectedNetwork?.covalentNetworkIdentifier;
    this.systemCoinAddress = selectedNetwork?.systemCoin;
    this.collateralAddress = selectedNetwork?.collaterals.find(
      (collateral) =>
        collateral.name.toLowerCase() === this.collateral?.toLowerCase()
    )?.address;
    if (!this.rpcUri) {
      throw new Error("Can't find proper RPC URI");
    }
    if (!this.systemImage) {
      throw new Error("Can't find proper system image");
    }
    console.log(`system rpc uri setted: ${this.rpcUri}`);
    console.log(`system image setted: ${this.systemImage}`);
    this.handleTransactions();
    this.handleBalances();
  }

  async handleService() {
    // Check if service exists
    if (!this.serviceName) {
      throw new Error("Keeper is not initialized properly");
    }
    this.service = docker.getService(this.serviceName);
    await this.changeKeeperStatus(KeeperStatus.RUNNING);
    try {
      console.log(await this.service.inspect());
    } catch (err) {
      await this.createService();
    }
  }

  async createService() {
    console.log(
      this.serviceName,
      this.wallet,
      this._id,
      this.rpcUri,
      this.systemImage,
      this.wallet?.address,
      this.collateral,
      this.options
    );
    if (
      !this.serviceName ||
      !this._id ||
      !this.rpcUri ||
      !this.systemImage ||
      !this.wallet?.address ||
      !this.collateral ||
      !this.options
    ) {
      throw new Error("Keeper is not initialized properly");
    }

    const secrets = await docker.listSecrets();
    const secretId = secrets.find((secret) => {
      if (secret.Spec) {
        return secret.Spec.Name === this.passwordSecretName;
      }
    })?.ID;

    const serviceParams = {
      Name: this.serviceName,
      TaskTemplate: {
        ContainerSpec: {
          Image: this.systemImage,
          Args: [
            "--rpc-uri",
            this.rpcUri,
            "--eth-from",
            ethers.getAddress(String(this.wallet?.address)),
            "--eth-key",
            `key_file=/keystore/key-${this.wallet.address.toLowerCase()}.json,pass_file=/run/secrets/wallet_password`,
            "--safe-engine-system-coin-target",
            "ALL",
            "--type=collateral",
            "--collateral-type",
            this.collateral,
            ...this.options.map((option) => `--${option}`),
          ],
          Secrets: [
            {
              File: {
                Name: "wallet_password", // The target filename
                UID: "0", // The UID of the file
                GID: "0", // The GID of the file
                Mode: 444, // The file permissions (e.g., 444 for read-only)
              },
              SecretName: this.passwordSecretName,
              SecretID: secretId,
            },
          ],
          Mounts: [
            {
              Type: "bind",
              // TODO: change it to be read from .env
              Source: process.env.WALLET_SOURCE_MOUNT,
              Target: "/keystore",
            },
          ],
        },
      },
    };

    console.log(JSON.stringify(serviceParams));

    try {
      // @ts-ignore
      docker.createService(serviceParams);
    } catch (err) {
      console.log(err);
    }
  }

  async stopContainer() {
    if (!this.serviceName)
      throw new Error("Can't stop a container with no service name.");
    try {
      await this.service?.remove();
      await this.changeKeeperStatus(KeeperStatus.STOPPED);
    } catch (err) {
      console.error(err);
    }
  }

  async export() {
    const keeperAddress = this.wallet?.address;
    if (!keeperAddress) {
      throw new Error("Keeper address does not exist.");
    }
    return getWalletFile(keeperAddress).toString();
  }

  async changeKeeperStatus(newStatus: KeeperStatus) {
    const keeperAddress = this.wallet?.address;
    if (keeperAddress) {
      if (this.status !== newStatus) {
        await this.notificationService.create(keeperAddress, {
          context: "keeper",
          name: "Status Change",
          params: [this.getStatus(), this.getStatusName(newStatus)],
        });
      }
    }

    this.status = newStatus;
    await KeeperModel.updateOne(
      { _id: this._id },
      {
        status: newStatus,
      }
    );
  }

  handleBalances() {
    this.getKeeperBalances();
    setInterval(() => {
      if (this.status !== KeeperStatus.STOPPED) {
        this.getKeeperBalances();
      }
    }, this.transactionInterval);
  }

  async getKeeperBalances() {
    if (!this.collateralAddress || !this.systemCoinAddress) {
      throw new Error("Can't getting proper addresses");
    }
    if (!this.rpcUri) {
      throw new Error("Can't get balances before getting rpc uri");
    }
    const keeperAddress = this.wallet ? `0x${this.wallet?.address}` : "";

    if (!keeperAddress) {
      throw new Error(
        "Can't get balances because keepr address does not exists"
      );
    }

    try {
      const provider = new ethers.JsonRpcProvider(this.rpcUri);

      this.balances.native = await provider.getBalance(keeperAddress);

      const erc20BalanceAbi = [
        {
          constant: true,
          inputs: [
            {
              name: "_owner",
              type: "address",
            },
          ],
          name: "balanceOf",
          outputs: [
            {
              name: "balance",
              type: "uint256",
            },
          ],
          type: "function",
        },
      ];

      const systemCoin = new ethers.Contract(
        this.systemCoinAddress,
        erc20BalanceAbi,
        provider
      );

      this.balances.system = await systemCoin.balanceOf(keeperAddress);

      const collateralCoin = new ethers.Contract(
        this.collateralAddress,
        erc20BalanceAbi,
        provider
      );

      this.balances.collateral = await collateralCoin.balanceOf(keeperAddress);
    } catch (err) {
      console.log(err);
    }
  }

  handleTransactions() {
    this.getKeeperTransactions();
    setInterval(() => {
      if (this.status !== KeeperStatus.STOPPED) {
        this.getKeeperTransactions();
      }
    }, this.transactionInterval);
  }

  async getKeeperTransactions() {
    if (!this.covalentIdentifier) {
      throw new Error("Can't find the covalent identifier");
    }
    if (!this.wallet?.address) {
      throw new Error("Can't find the keeperAddress");
    }
    const covalent = new Covalent(this.covalentIdentifier);
    // TODO: huge potential for improvement of performance
    try {
      const { data } = await covalent.getKeeperTransactions(
        `0x${this.wallet?.address}`
      );
      const transactions = data.data.items;
      transactions.forEach(async (txData: TransactionData) => {
        if (!this.transactionsMapping.has(txData.tx_hash)) {
          const transaction = new Transaction(this.notificationService);
          await transaction.loadOrCreate(String(this.wallet?.address), txData);
          this.transactionsMapping.set(txData.tx_hash, transaction);
        }
      });
    } catch (err) {
      console.error(err);
    }
  }

  async getLogs() {
    try {
      const logs = await this.service?.logs({
        stderr: true,
        stdout: true,
        timestamps: true,
      });

      const formattedLogs = String(logs).replace(/\S*2023\S*/g, (foo) => {
        const pattern = /.*2023/g;
        const result = foo.replace(pattern, "2023");

        return `\n${result}`;
      });

      return formattedLogs;
    } catch (err) {
      console.error(err);
      return "";
    }
  }

  getStatusName(status: KeeperStatus) {
    switch (status) {
      case KeeperStatus.INITIALIZING:
        return "Initializing";
      case KeeperStatus.PREPARING:
        return "Preparing";
      case KeeperStatus.RUNNING:
        return "Running";
      case KeeperStatus.STOPPING:
        return "Stopping";
      case KeeperStatus.FAILED:
        return "Failed";
      case KeeperStatus.STOPPED:
        return "Stopped";
      case KeeperStatus.RECOVERING:
        return "Recovering";
    }
  }

  getStatus() {
    return this.getStatusName(this.status);
  }

  async getTaskStatus() {
    if (this.status === KeeperStatus.STOPPED) return "";
    console.log("trying to get service");
    try {
      const service = docker.getService(String(this.serviceName));

      const serviceTasks = await docker.listTasks({
        service: service.ID,
      });

      //console.log(await service.logs({ stdout: true, stderr: true }));
      return serviceTasks[0].Status.State;
    } catch (err) {
      return "";
      console.log(err);
    }
  }

  getTransactions() {
    try {
      return Array.from(this.transactionsMapping.values()).map(
        async (transaction) => {
          const directEvents = transaction.getDirectEvents();
          return {
            processed: transaction.processed,
            keeperAddress: transaction.keeperAddress,
            data: transaction.data,
            hash: transaction.hash,
            directEvents: directEvents,
          };
        }
      );
    } catch (err) {
      return [];
    }
  }

  getBalances() {
    return {
      native: String(this.balances.native),
      system: String(this.balances.system),
      systemCoinJoin: String(this.balances.systemCoinJoin),
      collateral: String(this.balances.collateral),
      collateralCoinJoin: String(this.balances.collateralCoinJoin),
    };
  }

  async get() {
    if (!this.wallet?.address) {
      return;
    }
    return {
      _id: this._id,
      collateral: this.collateral,
      network: this.network,
      system: this.system,
      wallet: this.wallet?.address,
      status: this.getStatus(),
      options: this.options,
      logs: this.getLogs(),
      transactions: this.getTransactions(),
      balances: this.getBalances(),
      taskStatus: this.getTaskStatus(),
      unseenNotifsCount:
        await this.notificationService.getUnseenNotificationsCountOfKeeper(
          this.wallet?.address
        ),
      notifications: (
        await this.notificationService.getKeeperNotifications(
          this.wallet?.address
        )
      ).map((notif) => {
        const nNotif = {
          _id: notif._id,
          keeperAddress: notif.keeperAddress,
          payload: {
            context: notif.payload.context,
            name: notif.payload.name,
            params: notif.payload.params,
            stringifiedParams: JSON.stringify(notif.payload.params),
          },
          seen: notif.seen,
          createdAt: notif.createdAt,
        };

        return nNotif;
      }),
    };
  }
}

export default Keeper;
