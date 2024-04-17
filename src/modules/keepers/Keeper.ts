import fs from "fs";
import { spawn, exec, ChildProcess } from "child_process";
import mongoose from "mongoose";
import { ethers } from "ethers";
import * as passwordGenerator from "secure-random-password";
import Docker from "dockerode";

import parentLogger from "../../lib/logger";

import {
  KeeperCreationInput,
  KeeperStatus,
  TransactionData,
  KeeperBalances,
} from "../../types";

import KeeperModel from "../../models/keeper.model";
import TransactionModel from "../../models/transaction.model";

import Wallet from "../wallets/Wallet";
import { getWalletFile } from "../files";
import { networks, systems } from "../systems";
import Covalent from "../external/Covalent";
import NotificationService from "../notifications/NotificationService";
import Transaction from "../transaction/Transaction";

let docker = new Docker({ socketPath: "/var/run/docker.sock" });

const logger = parentLogger.child({
  module: "keeper",
});

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
  fromBlock: number | undefined | string;
  selector: string | undefined;

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
    const constructorLogger = logger.child({
      method: "constructor",
    });
    constructorLogger.trace(`Instantiating a keeper`);
    this.status = KeeperStatus.INITIALIZING;
    this.tries = 0;
    this.haveSetLogs = false;
    this.notificationService = notificationService;
    this.docker = new Docker({ socketPath: "/var/run/docker.sock" });
    constructorLogger.info("Keeper instantiated.");
  }

  async load(_id: mongoose.Types.ObjectId) {
    const loadLogger = logger.child({
      method: "load",
      keeperId: _id,
    });

    this._id = _id;
    loadLogger.debug(`keeper id has been setted: ${_id}`);
    try {
      loadLogger.trace(`trying to find the keeper from the database`);
      const keeper = await KeeperModel.findOne({ _id: this._id });
      if (keeper) {
        loadLogger.debug(`keeper found in the database`, {
          keeperId: _id,
          keeper,
        });
        this.network = keeper.network;
        this.system = keeper.system;
        this.collateral = keeper.collateral;
        this.options = keeper.options;
        this.wallet = new Wallet();

        try {
          loadLogger.trace(`Loading the keeper wallet`);
          await this.wallet.load(keeper.wallet);
          loadLogger.trace(`Keeper wallet loaded`);
        } catch (err) {
          loadLogger.error(`Failed to load the wallet`, {
            error: err,
          });
          throw err;
        }

        this.status = keeper.status;
        this.serviceName = keeper.serviceName;
        this.passwordSecretName = `${this.serviceName}_wp`;
        this.tries = keeper.tries;

        loadLogger.trace(`Setting the system params`);
        this.setSystemParams();
      } else {
        loadLogger.error(`Couldn't find the keeper`, {
          keeperId: _id,
        });
        throw new Error("Couldn't find the keeper");
      }
    } catch (err) {
      loadLogger.error(`Failed to load the keeper`, {
        error: err,
      });
      throw err;
    }
    loadLogger.trace(`Setting the system params`);
    this.setSystemParams();
    loadLogger.debug("System params setted");

    // run the container
    loadLogger.trace(`Handling the keeper service`);
    this.handleService();
    loadLogger.debug("Keeper service handled");
  }

  async save() {
    const saveLogger = logger.child({
      method: "save",
      keeperId: this._id,
    });
    // save the current state of the keeper
    saveLogger.trace("Saving the keeper state");
    if (!this._id) {
      saveLogger.error("Can't save the keeper without id");
      throw new Error("Can't save the keeper without id");
    }

    try {
      saveLogger.trace("Updating the keeper state", {
        system: this.system,
        network: this.network,
        collateral: this.collateral,
        wallet: this.wallet,
        status: this.status,
        options: this.options,
        containerId: this.containerId,
        serviceName: this.serviceName,
      });
      const updateResult = await KeeperModel.updateOne(
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
      saveLogger.info("Keeper state got updated", {
        updateResult,
        system: this.system,
        network: this.network,
        collateral: this.collateral,
        wallet: this.wallet,
        status: this.status,
        options: this.options,
        containerId: this.containerId,
        serviceName: this.serviceName,
      });
      return updateResult;
    } catch (err) {
      saveLogger.error("Failed to Update the keeper state", {
        error: err,
      });
      throw err;
    }
  }

  async create({
    system,
    network,
    collateral,
    privateKey,
    options,
  }: KeeperCreationInput) {
    const createLogger = logger.child({
      method: "create",
      system,
      network,
      collateral,
      privateKey,
      options,
    });

    createLogger.trace("Generating a random password");
    const password = passwordGenerator.randomPassword({ length: 32 });
    createLogger.info("A random password generated", {
      length: 32,
    });

    if (!password) {
      createLogger.error("Wallet password is not provided.");
      throw new Error("Wallet password is not provided");
    }
    createLogger.trace("Creating a new wallet instance");
    this.wallet = new Wallet();
    createLogger.debug("Wallet instance created");
    try {
      createLogger.trace("Generating key pass file");
      await this.wallet.generateKeyPassFile(privateKey, password);
      createLogger.debug("Key pass file generated");
    } catch (err) {
      createLogger.error("Failed to generate key pass file", {
        error: err,
      });
      throw err;
    }
    //await wallet.load();

    const serviceName = `${network}${collateral}_${this.wallet.address}`;
    createLogger.trace("Setting keeper service name", {
      serviceName,
    });
    this.serviceName = serviceName;
    createLogger.debug("Service name setted", {
      serviceName,
    });
    const passwordName = `${this.serviceName}_wp`;
    createLogger.trace("Setting keeper password name", {
      passwordName,
    });
    this.passwordSecretName = passwordName;
    createLogger.debug("Password name setted", {
      passwordName,
    });

    createLogger.trace("Creating the docker secret for password of wallet");
    docker.createSecret({
      Name: this.passwordSecretName,
      Data: btoa(password),
    });
    createLogger.debug("Wallet password secret created");

    try {
      // create the keeper - set properties

      createLogger.trace("Creating the keeper document");
      const keeperDoc = new KeeperModel({
        system,
        network,
        collateral,
        wallet: this.wallet.address,
        options,
        serviceName: this.serviceName,
      });
      await keeperDoc.save();
      createLogger.debug("Keeper document created", {
        keeperDoc,
      });

      createLogger.trace("Setting keeper params");
      // save the current state of the keeper
      this._id = keeperDoc._id;
      this.network = keeperDoc.network;
      this.system = keeperDoc.system;
      this.collateral = keeperDoc.collateral;
      this.options = keeperDoc.options;
      this.status = keeperDoc.status;
      this.tries = keeperDoc.tries;
      createLogger.debug("Keeper doc created", {
        keeperDoc,
      });
    } catch (err) {
      createLogger.error("Failed to create keeper document", {
        error: err,
      });
      throw err;
    }

    createLogger.trace(`Setting the system params`);
    this.setSystemParams();
    createLogger.debug("System params setted");

    // run the container
    createLogger.trace(`Handling the keeper service`);
    this.handleService();
    createLogger.debug("Keeper service handled");
  }

  setSystemParams() {
    const setSystemParamsLogger = logger.child({
      method: "setSystemParams",
      keeperId: this._id,
    });

    if (!this.network || !this._id) {
      setSystemParamsLogger.error(
        "Keeper is not initialized properly with no id or network"
      );
      throw new Error("Keeper is not initialized properly");
    }
    type ObjectKey = keyof typeof networks;

    setSystemParamsLogger.trace("finding lower case network name");
    const networkName = this.network.toLowerCase() as ObjectKey;
    setSystemParamsLogger.debug("found network name in lowercase", {
      networkName,
    });
    this.rpcUri = networks[networkName].rpc_uri;
    setSystemParamsLogger.trace("finding selected system");
    const selectedSystem = systems.find((sys) => sys.name === this.system);
    setSystemParamsLogger.debug("found selected system", {
      selectedSystem,
    });
    setSystemParamsLogger.trace("finding system image");
    this.systemImage = selectedSystem?.image;
    setSystemParamsLogger.debug("found system image", {
      systemImage: this.systemImage,
    });

    setSystemParamsLogger.trace("finding selected network");
    const selectedNetwork = selectedSystem?.networks.find(
      (system) => system.name.toLowerCase() == networkName.toLowerCase()
    );
    setSystemParamsLogger.debug("found selected network", {
      selectedNetwork,
    });

    setSystemParamsLogger.trace("setting from-block and selector");

    this.fromBlock = selectedNetwork?.fromBlock;
    this.selector = selectedNetwork?.selector;
    setSystemParamsLogger.debug("setted from-block and selector", {
      fromBlock: selectedNetwork?.fromBlock,
      selector: selectedNetwork?.selector,
    });

    setSystemParamsLogger.trace("setting covalent network identifier");
    this.covalentIdentifier = selectedNetwork?.covalentNetworkIdentifier;
    setSystemParamsLogger.debug("setted covalent network identifier", {
      covalentIdentifier: this.covalentIdentifier,
    });

    setSystemParamsLogger.trace("setting system coin address");
    this.systemCoinAddress = selectedNetwork?.systemCoin;
    setSystemParamsLogger.debug("setted system coin address", {
      systemCoinAddress: this.systemCoinAddress,
    });

    setSystemParamsLogger.trace("setting collateral address");
    this.collateralAddress = selectedNetwork?.collaterals.find(
      (collateral) =>
        collateral.name.toLowerCase() === this.collateral?.toLowerCase()
    )?.address;
    setSystemParamsLogger.debug("setted collateral address", {
      collateralAddress: this.collateralAddress,
    });

    if (!this.rpcUri) {
      setSystemParamsLogger.error("Can't find proper RPC URI");
      throw new Error("Can't find proper RPC URI");
    }
    if (!this.systemImage) {
      setSystemParamsLogger.error("Can't find proper system image");
      throw new Error("Can't find proper system image");
    }
    setSystemParamsLogger.info("system rpc-uri and image setted", {
      rpcUri: this.rpcUri,
      systemImage: this.systemImage,
    });

    setSystemParamsLogger.trace(`Handling transactions`);
    this.handleTransactions();

    setSystemParamsLogger.trace(`Handling balances`);
    this.handleBalances();
  }

  async handleService() {
    // Check if service exists

    const handleServiceLogger = logger.child({
      method: "handleService",
      keeperId: this._id,
    });

    handleServiceLogger.trace("Checking if service name exists");

    if (!this.serviceName) {
      handleServiceLogger.error(
        "Keeper is not initialized properly. Service name does not exists."
      );
      throw new Error("Keeper is not initialized properly");
    }
    handleServiceLogger.trace("Getting Docker service");
    this.service = docker.getService(this.serviceName);

    await this.changeKeeperStatus(KeeperStatus.RUNNING);

    try {
      handleServiceLogger.trace("Inspecting service");
      const serviceInfo = await this.service.inspect();
      handleServiceLogger.debug("Service inspected", { serviceInfo });
    } catch (err) {
      handleServiceLogger.error("Failed to inspect service", { error: err });
      handleServiceLogger.trace("Creating service");
      await this.createService();
    }

    handleServiceLogger.debug("Service handling completed");
  }

  async createService() {
    const createServiceLogger = logger.child({
      method: "createService",
      keeperId: this._id,
    });

    createServiceLogger.trace("Checking initialization parameters");

    createServiceLogger.debug("Initialization parameters:", {
      serviceName: this.serviceName,
      wallet: this.wallet,
      _id: this._id,
      rpcUri: this.rpcUri,
      systemImage: this.systemImage,
      walletAddress: this.wallet?.address,
      collateral: this.collateral,
      options: this.options,
    });

    if (
      !this.serviceName ||
      !this._id ||
      !this.rpcUri ||
      !this.systemImage ||
      !this.wallet?.address ||
      !this.collateral ||
      !this.options
    ) {
      createServiceLogger.error("Keeper is not initialized properly");
      throw new Error("Keeper is not initialized properly");
    }

    createServiceLogger.trace("Listing Docker secrets");
    const secrets = await docker.listSecrets();

    const secretId = secrets.find((secret) => {
      if (secret.Spec) {
        return secret.Spec.Name === this.passwordSecretName;
      }
    })?.ID;

    createServiceLogger.debug("Found secret ID:", { secretId });

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
            ...(this.fromBlock ? ["--from-block", String(this.fromBlock)] : []),
            ...(this.selector ? ["--network", String(this.selector)] : []),
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
              Source: process.env.WALLET_SOURCE_MOUNT,
              Target: "/keystore",
            },
            {
              Type: "bind",
              Source: process.env.WALLET_SOURCE_MOUNT,
              Target: "/app/logs",
            },
          ],
          StopGracePeriod: 120000000000,
        },
      },
    };

    createServiceLogger.debug("Service parameters:", { serviceParams });

    try {
      createServiceLogger.trace("Creating Docker service");
      // @ts-ignore
      docker.createService(serviceParams);
      createServiceLogger.debug("Docker service created");
    } catch (err) {
      createServiceLogger.error("Failed to create Docker service", {
        error: err,
      });
      throw err;
    }
  }

  async stopContainer() {
    const stopContainerLogger = logger.child({
      method: "stopContainer",
      keeperId: this._id,
    });

    stopContainerLogger.trace("Checking if service name exists");
    if (!this.serviceName) {
      stopContainerLogger.error("Can't stop a container with no service name.");
      throw new Error("Can't stop a container with no service name.");
    }
    try {
      stopContainerLogger.trace("Removing service");
      await this.service?.remove();
      stopContainerLogger.debug("Service removed");
      stopContainerLogger.trace("Changing keeper status to STOPPED");
      await this.changeKeeperStatus(KeeperStatus.STOPPED);
      stopContainerLogger.debug("Keeper status changed to STOPPED");
    } catch (err) {
      stopContainerLogger.error("Failed to stop container", { error: err });
      throw err;
    }
  }

  async export() {
    const exportLogger = logger.child({
      method: "export",
      keeperId: this._id,
    });

    exportLogger.trace("Checking if keeper address exists");
    const keeperAddress = this.wallet?.address;
    if (!keeperAddress) {
      exportLogger.error("Keeper address does not exist.");
      throw new Error("Keeper address does not exist.");
    }
    exportLogger.debug("Getting wallet file for keeper address:", {
      keeperAddress,
    });
    const walletFile = getWalletFile(keeperAddress).toString();
    exportLogger.debug("Wallet file obtained");

    return walletFile;
  }

  async changeKeeperStatus(newStatus: KeeperStatus) {
    const changeStatusLogger = logger.child({
      method: "changeKeeperStatus",
      keeperId: this._id,
      newStatus,
    });

    changeStatusLogger.trace("Checking if keeper address exists");

    const keeperAddress = this.wallet?.address;
    if (keeperAddress) {
      if (this.status !== newStatus) {
        changeStatusLogger.trace("Creating notification for status change");

        await this.notificationService.create(keeperAddress, {
          context: "keeper",
          name: "Status Change",
          params: [this.getStatus(), this.getStatusName(newStatus)],
        });

        changeStatusLogger.debug("Notification created");
      }
    }

    try {
      changeStatusLogger.trace("Updating keeper status");

      this.status = newStatus;
      await KeeperModel.updateOne(
        { _id: this._id },
        {
          status: newStatus,
        }
      );

      changeStatusLogger.debug("Keeper status updated");
    } catch (err) {
      changeStatusLogger.error("Failed to update keeper status", {
        error: err,
      });
      throw err;
    }
  }

  handleBalances() {
    const handleBalancesLogger = logger.child({
      method: "handleBalances",
      keeperId: this._id,
    });

    handleBalancesLogger.trace("Starting handleBalances function");

    this.getKeeperBalances();

    handleBalancesLogger.debug("Keeper balances fetched initially");

    const intervalId = setInterval(() => {
      try {
        if (this.status !== KeeperStatus.STOPPED) {
          handleBalancesLogger.trace("Fetching keeper balances");
          this.getKeeperBalances();
          handleBalancesLogger.debug("Keeper balances fetched");
        } else {
          handleBalancesLogger.trace(
            "Keeper is stopped, skipping balance fetching"
          );
        }
      } catch (err) {
        handleBalancesLogger.error(
          "Error occurred while fetching keeper balances",
          { error: err }
        );
      }
    }, this.transactionInterval);

    handleBalancesLogger.debug("Interval set for fetching balances", {
      intervalId,
    });
  }

  async getKeeperBalances() {
    const getKeeperBalancesLogger = logger.child({
      method: "getKeeperBalances",
      keeperId: this._id,
    });

    try {
      getKeeperBalancesLogger.trace("Checking addresses and URI");

      if (!this.collateralAddress || !this.systemCoinAddress) {
        getKeeperBalancesLogger.error("Can't get proper addresses");
        throw new Error("Can't getting proper addresses");
      }
      if (!this.rpcUri) {
        getKeeperBalancesLogger.error(
          "Can't get balances before getting rpc uri"
        );
        throw new Error("Can't get balances before getting rpc uri");
      }
      const keeperAddress = this.wallet ? `0x${this.wallet?.address}` : "";

      if (!keeperAddress) {
        getKeeperBalancesLogger.error(
          "Can't get balances because keeper address does not exist"
        );
        throw new Error(
          "Can't get balances because keepr address does not exists"
        );
      }

      getKeeperBalancesLogger.trace("Creating JSON-RPC provider");

      const provider = new ethers.JsonRpcProvider(this.rpcUri);

      getKeeperBalancesLogger.trace("Fetching native balance");

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

      getKeeperBalancesLogger.trace("Fetching system balance");

      this.balances.system = await systemCoin.balanceOf(keeperAddress);

      const collateralCoin = new ethers.Contract(
        this.collateralAddress,
        erc20BalanceAbi,
        provider
      );

      getKeeperBalancesLogger.trace("Fetching collateral balance");

      this.balances.collateral = await collateralCoin.balanceOf(keeperAddress);

      getKeeperBalancesLogger.debug("Balances fetched successfully", {
        balances: this.balances,
      });
    } catch (err) {
      console.log(err);
    }
  }

  handleTransactions() {
    const handleTransactionsLogger = logger.child({
      method: "handleTransactions",
      keeperId: this._id,
    });

    handleTransactionsLogger.trace("Starting handleTransactions function");

    this.getKeeperTransactions();

    handleTransactionsLogger.debug("Keeper transactions fetched initially");

    const intervalId = setInterval(() => {
      try {
        if (this.status !== KeeperStatus.STOPPED) {
          handleTransactionsLogger.trace("Fetching keeper transactions");
          this.getKeeperTransactions();
          handleTransactionsLogger.debug("Keeper transactions fetched");
        } else {
          handleTransactionsLogger.trace(
            "Keeper is stopped, skipping transaction fetching"
          );
        }
      } catch (err) {
        handleTransactionsLogger.error(
          "Error occurred while fetching keeper transactions",
          { error: err }
        );
      }
    }, this.transactionInterval);

    handleTransactionsLogger.debug("Interval set for fetching transactions", {
      intervalId,
    });
  }

  async getKeeperTransactions() {
    const getKeeperTransactionsLogger = logger.child({
      method: "getKeeperTransactions",
      keeperId: this._id,
    });

    try {
      getKeeperTransactionsLogger.trace(
        "Checking covalent identifier and keeper address"
      );

      if (!this.covalentIdentifier) {
        getKeeperTransactionsLogger.error("Can't find the covalent identifier");
        throw new Error("Can't find the covalent identifier");
      }
      if (!this.wallet?.address) {
        getKeeperTransactionsLogger.error("Can't find the keeperAddress");
        throw new Error("Can't find the keeperAddress");
      }
      const covalent = new Covalent(this.covalentIdentifier);

      getKeeperTransactionsLogger.trace(
        "Fetching keeper transactions from Covalent"
      );

      // TODO: huge potential for improvement of performance
      const { data } = await covalent.getKeeperTransactions(
        `0x${this.wallet?.address}`
      );
      const transactions = data.data.items;

      getKeeperTransactionsLogger.debug("Fetched keeper transactions", {
        transactions,
      });

      transactions.forEach(async (txData: TransactionData) => {
        if (!this.transactionsMapping.has(txData.tx_hash)) {
          getKeeperTransactionsLogger.trace("Creating or loading transaction");

          const transaction = new Transaction(this.notificationService);
          await transaction.loadOrCreate(String(this.wallet?.address), txData);
          this.transactionsMapping.set(txData.tx_hash, transaction);

          getKeeperTransactionsLogger.debug("Transaction created or loaded", {
            txData,
          });
        }
      });

      getKeeperTransactionsLogger.debug("All transactions processed");
    } catch (err) {
      console.error(err);
    }
  }

  async getLogs() {
    const getLogsLogger = logger.child({
      method: "getLogs",
      keeperId: this._id,
    });

    try {
      getLogsLogger.trace("Fetching logs from Docker service");

      const logs = await this.service?.logs({
        stderr: true,
        stdout: true,
        timestamps: true,
      });

      getLogsLogger.debug("Logs fetched:", { logs });

      const formattedLogs = String(logs).replace(/\S*2023\S*/g, (foo) => {
        const pattern = /.*2023/g;
        const result = foo.replace(pattern, "2023");

        return `\n${result}`;
      });

      return logs;
      //return formattedLogs;
    } catch (err) {
      getLogsLogger.error("Error occurred while fetching logs", { error: err });
      return "";
    }
  }
  getStatusName(status: KeeperStatus) {
    const getStatusNameLogger = logger.child({
      method: "getStatusName",
      status,
    });

    getStatusNameLogger.trace("Mapping status to status name");

    switch (status) {
      case KeeperStatus.INITIALIZING:
        getStatusNameLogger.debug("Mapped status to status name:", {
          statusName: "Initializing",
        });
        return "Initializing";
      case KeeperStatus.PREPARING:
        getStatusNameLogger.debug("Mapped status to status name:", {
          statusName: "Preparing",
        });
        return "Preparing";
      case KeeperStatus.RUNNING:
        getStatusNameLogger.debug("Mapped status to status name:", {
          statusName: "Running",
        });
        return "Running";
      case KeeperStatus.STOPPING:
        getStatusNameLogger.debug("Mapped status to status name:", {
          statusName: "Stopping",
        });
        return "Stopping";
      case KeeperStatus.FAILED:
        getStatusNameLogger.debug("Mapped status to status name:", {
          statusName: "Failed",
        });
        return "Failed";
      case KeeperStatus.STOPPED:
        getStatusNameLogger.debug("Mapped status to status name:", {
          statusName: "Stopped",
        });
        return "Stopped";
      case KeeperStatus.RECOVERING:
        getStatusNameLogger.debug("Mapped status to status name:", {
          statusName: "Recovering",
        });
        return "Recovering";
      default:
        getStatusNameLogger.warn("Status not recognized:", { status });
        return "Unknown";
    }
  }

  getStatus() {
    const getStatusLogger = logger.child({
      method: "getStatus",
      keeperId: this._id,
    });

    getStatusLogger.trace("Getting status");

    const statusName = this.getStatusName(this.status);

    getStatusLogger.debug("Status obtained:", { status: statusName });

    return statusName;
  }

  async getTaskStatus() {
    const getTaskStatusLogger = logger.child({
      method: "getTaskStatus",
      keeperId: this._id,
    });

    getTaskStatusLogger.trace("Checking if keeper is stopped");

    if (this.status === KeeperStatus.STOPPED) {
      getTaskStatusLogger.debug("Keeper is stopped, returning empty string");
      return "";
    }

    getTaskStatusLogger.debug(
      "Keeper is not stopped, proceeding to get service"
    );
    try {
      getTaskStatusLogger.trace("Getting Docker service");

      const service = docker.getService(String(this.serviceName));
      getTaskStatusLogger.debug("Docker service obtained:", {
        serviceId: service.ID,
      });

      getTaskStatusLogger.trace("Listing tasks for the service");

      const serviceTasks = await docker.listTasks({
        service: service.ID,
      });
      getTaskStatusLogger.debug("Tasks listed:", { serviceTasks });

      const taskStatus = serviceTasks[0]?.Status?.State || "";
      getTaskStatusLogger.debug("Task status obtained:", { taskStatus });

      //console.log(await service.logs({ stdout: true, stderr: true }));
      return taskStatus;
    } catch (err) {
      getTaskStatusLogger.error("Error occurred while getting task status", {
        error: err,
      });
      return "";
    }
  }

  getTransactions() {
    const getTransactionsLogger = logger.child({
      method: "getTransactions",
      keeperId: this._id,
    });

    try {
      getTransactionsLogger.trace("Mapping transactions");

      const mappedTransactions = Array.from(
        this.transactionsMapping.values()
      ).map(async (transaction) => {
        const directEvents = transaction.getDirectEvents();
        return {
          processed: transaction.processed,
          keeperAddress: transaction.keeperAddress,
          data: transaction.data,
          hash: transaction.hash,
          directEvents: directEvents,
        };
      });
      getTransactionsLogger.debug("Transactions mapped:", {
        transactions: mappedTransactions,
      });

      return mappedTransactions;
    } catch (err) {
      getTransactionsLogger.error("Error occurred while mapping transactions", {
        error: err,
      });

      return [];
    }
  }

  getBalances() {
    const getBalancesLogger = logger.child({
      method: "getBalances",
      keeperId: this._id,
    });

    try {
      getBalancesLogger.debug("Getting balances");
      const balances = {
        native: String(this.balances.native),
        system: String(this.balances.system),
        systemCoinJoin: String(this.balances.systemCoinJoin),
        collateral: String(this.balances.collateral),
        collateralCoinJoin: String(this.balances.collateralCoinJoin),
      };
      getBalancesLogger.debug("Balances obtained:", { balances });
      return balances;
    } catch (err) {
      getBalancesLogger.error("Error occurred while getting balances", {
        error: err,
      });
      console.error(err); // Logging error to console
      return {};
    }
  }

  async get() {
    const getLogger = logger.child({
      method: "get",
      keeperId: this._id,
    });

    try {
      getLogger.debug("Getting keeper data");

      if (!this.wallet?.address) {
        getLogger.debug("Wallet address not found, returning");

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
    } catch (err) {
      getLogger.error("Error occurred while getting keeper data", {
        error: err,
      });
      console.error(err); // Logging error to console
      return {};
    }
  }
}

export default Keeper;
