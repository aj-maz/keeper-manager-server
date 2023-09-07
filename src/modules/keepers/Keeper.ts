import fs from "fs";
import { spawn, exec, ChildProcess } from "child_process";
import mongoose from "mongoose";
import { ethers } from "ethers";
import axios from "axios";

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

const RECOVER_LIMIT = 10;

class Keeper {
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
    this.status = KeeperStatus.INITIALIZING;
    this.tries = 0;
    this.haveSetLogs = false;
    this.notificationService = notificationService;

    setInterval(() => {
      try {
        this.setLogs();
      } catch (err) {
        console.log(err);
      }
    }, 15 * 1000);
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
    this.handleContainer();
  }

  async restartKeeper() {
    console.log(`resetting the keeper ${this._id}`);
    await this.resetTries();
    await this.changeKeeperStatus(KeeperStatus.PREPARING);
    this.handleContainer();
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
    const password = process.env.PASSWORD;
    if (!password) {
      throw new Error("Wallet password is not provided");
    }
    this.wallet = new Wallet();
    await this.wallet.generateKeyPassFile(privateKey, password);
    //await wallet.load();

    // create the keeper - set properties
    const keeperDoc = new KeeperModel({
      system,
      network,
      collateral,
      wallet: this.wallet.address,
      options,
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
    this.handleContainer();
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
    //this.handleTransactions();
    this.handleBalances();
  }

  containerExists() {
    if (!this._id) {
      throw new Error("Keeper is not initialized properly");
    }
    return fs.existsSync(getCIDFile(this._id));
  }

  setContainerId() {
    if (!this._id) {
      return;
      //throw new Error("Keeper is not initialized properly");
    }
    if (this.containerExists()) {
      this.containerId = fs.readFileSync(getCIDFile(this._id)).toString();
      console.log(`container id setted: ${this.containerId}`);
    }
  }

  async handleContainer() {
    if (this.status === KeeperStatus.STOPPED) {
      return;
    }
    if (this.containerExists()) {
      this.setContainerId();
      await this.startContainer();
    } else {
      await this.runContainer();
    }
  }

  async isContainerRunning() {
    if (!this.containerId)
      throw new Error("Can't check the container without container id");
    return new Promise((resolve, reject) => {
      // Use the `docker ps` command to list running containers and grep for the container ID
      const cmd = `docker ps --quiet --filter "id=${this.containerId}"`;
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          // If there's an error running the command, reject the promise
          reject(error);
          return;
        }
        // If the container ID is in the output, it means the container is running
        const isRunning = this.containerId?.includes(stdout.trim());
        resolve(isRunning);
      });
    });
  }

  async startContainer() {
    if (!this.containerId) {
      throw new Error("Can't start the keeper with no containerId");
    }
    this.handleTries();

    if (await this.isContainerRunning()) {
      await this.changeKeeperStatus(KeeperStatus.RUNNING);
    } else if (this.tries > 0) {
      await this.changeKeeperStatus(KeeperStatus.RECOVERING);
    } else {
      await this.changeKeeperStatus(KeeperStatus.PREPARING);
    }
    this.container = spawn("docker", ["start", "-a", this.containerId]);

    this.handleContainerEvents();
  }

  async runContainer() {
    await this.changeKeeperStatus(KeeperStatus.PREPARING);
    this.container = spawn("docker", this.getRunningContainerArray());
    this.handleContainerEvents();
  }

  async setLogs() {
    if (!this._id) {
      return;
    }
    this.setContainerId();
    if (!this.haveSetLogs && fs.existsSync(getCIDFile(this._id))) {
      console.log(
        `docker logs -f ${this.containerId} > ${getLogsFile(this._id)} 2>&1`
      );
      exec(
        `docker logs -f ${this.containerId} > ${getLogsFile(this._id)} 2>&1`,
        (error, stdout, stderr) => {
          console.log(error, stdout, stderr);
          if (error) {
            console.log(`can't catch docker logs`, error);
            return;
          }
          this.haveSetLogs = true;
        }
      );
    }
  }

  async handleRunningStatus() {
    if (this.status !== KeeperStatus.STOPPING) {
      this.startingTime = new Date();
      await this.changeKeeperStatus(KeeperStatus.RUNNING);
    }
  }

  async stopContainer() {
    if (!this._id) throw new Error("Can't stop a container with no id.");
    await this.changeKeeperStatus(KeeperStatus.STOPPING);
    const containerId = fs.readFileSync(getCIDFile(this._id)).toString();
    exec(`docker stop ${containerId}`, async (error, stdout, stderr) => {
      if (error) {
        return;
      }
    });
  }

  getRunningContainerArray() {
    // TODO: must add options to this
    if (
      !this.wallet?.path ||
      !this._id ||
      !this.rpcUri ||
      !this.systemImage ||
      !this.wallet.address ||
      !this.collateral ||
      !this.options
    ) {
      throw new Error("Keeper is not initialized properly");
    }
    return [
      "run",
      "-v",
      `${this.wallet.keystore}:/keystore`,
      "--cidfile",
      getCIDFile(this._id),
      this.systemImage,
      "--rpc-uri",
      this.rpcUri,
      "--safe-engine-system-coin-target",
      "ALL",
      "--eth-from",
      ethers.getAddress(this.wallet.address),
      "--eth-key",
      `key_file=/keystore/key-${this.wallet.address.toLowerCase()}.json,pass_file=/keystore/${this.wallet.address.toLowerCase()}.pass`,
      "--collateral-type",
      this.collateral,
      ...this.options.map((option) => `--${option}`),
    ];
  }

  handleContainerEvents() {
    if (!this.container) {
      throw new Error("Can't handle container events before container exists");
    }

    this.container.stdout?.on("data", async (data) => {
      await this.handleRunningStatus();
      await this.setLogs();
    });

    this.container.stderr?.on("data", async (data) => {
      await this.handleRunningStatus();
      await this.setLogs();
    });

    this.container.on("exit", async (r) => {
      console.log(`keeper is exiting `, r);
      if (this.status !== KeeperStatus.STOPPING) {
        await this.changeKeeperStatus(KeeperStatus.FAILED);
        await this.handleTries();
        if (RECOVER_LIMIT > this.tries) {
          console.log(
            `recovering keeper ${this._id} for the ${this.tries} time`
          );
          this.handleContainer();
        } else {
          console.log(
            `giving up on recovering keeper ${this._id} after ${this.tries} failed attempt`
          );
        }
      } else {
        await this.handleTries();
        await this.changeKeeperStatus(KeeperStatus.STOPPED);
      }
    });
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

  async handleTries() {
    if (
      (this.startingTime &&
        Number(new Date()) - Number(this.startingTime) > 10 * 60 * 1000) ||
      this.status === KeeperStatus.STOPPED
    ) {
      this.tries = 0;
    } else {
      this.tries += 1;
    }
    await KeeperModel.updateOne(
      { _id: this._id },
      {
        tries: this.tries,
      }
    );
  }

  async resetTries() {
    this.tries = 0;
    await KeeperModel.updateOne(
      { _id: this._id },
      {
        tries: this.tries,
      }
    );
  }

  handleBalances() {
    this.getKeeperBalances();
    setInterval(() => {
      this.getKeeperBalances();
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
      this.getKeeperTransactions();
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

  getLogs() {
    if (!this._id) throw new Error("Can't get logs of a not setted keeper");
    const logsFile = getLogsFile(this._id);
    const logs = fs.readFileSync(logsFile).toString();
    return logs;
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
