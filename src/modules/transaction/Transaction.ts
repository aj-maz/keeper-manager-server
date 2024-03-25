import { ethers } from "ethers";
import TransactionModel from "../../models/transaction.model";

import { TransactionData, DecodedParam } from "../../types";

import NotificationService from "../notifications/NotificationService";
import parentLogger from "../../lib/logger";

const logger = parentLogger.child({
  module: "transaction",
});

class Transaction {
  keeperAddress: string | undefined;
  data: TransactionData | undefined;
  processed: boolean;
  hash: string | undefined;

  notificationService: NotificationService;

  constructor(notificationService: NotificationService) {
    const constructorLogger = logger.child({
      method: "constructor",
    });

    constructorLogger.trace("Initializing Transaction instance");

    try {
      this.processed = false;
      this.notificationService = notificationService;

      constructorLogger.info("Transaction instance initialized successfully");
    } catch (error) {
      constructorLogger.error(
        "Error occurred while initializing Transaction instance",
        { error }
      );
      throw error;
    }
  }

  async loadOrCreate(keeperAddress: string, data: TransactionData) {
    const loadOrCreateLogger = logger.child({
      method: "loadOrCreate",
      keeperAddress,
      txHash: data.tx_hash,
    });

    loadOrCreateLogger.trace("Loading or creating transaction");

    try {
      this.hash = data.tx_hash;

      if (await this.exists()) {
        loadOrCreateLogger.debug("Transaction exists, loading it");
        await this.load(data.tx_hash);
      } else {
        loadOrCreateLogger.debug("Transaction does not exist, creating it");
        await this.create(keeperAddress, data);
      }
    } catch (error) {
      loadOrCreateLogger.error(
        "Error occurred while loading or creating transaction",
        { error }
      );
      throw error;
    }
  }

  async exists() {
    const existsLogger = logger.child({
      method: "exists",
      txHash: this.hash,
    });

    existsLogger.trace("Checking if transaction exists");

    try {
      const existedTransaction = await TransactionModel.findOne({
        hash: this.hash,
      });
      const transactionExists = !!existedTransaction;

      existsLogger.debug("Transaction existence checked", {
        transactionExists,
      });

      return transactionExists;
    } catch (error) {
      existsLogger.error(
        "Error occurred while checking transaction existence",
        { error }
      );
      throw error;
    }
  }

  async load(txHash: string) {
    const loadLogger = logger.child({
      method: "load",
      txHash,
    });

    loadLogger.trace("Loading transaction");

    try {
      this.hash = txHash;

      loadLogger.debug("Checking if transaction exists");
      if (!(await this.exists())) {
        loadLogger.error("Transaction does not exist");
        throw new Error("Transaction does not exist");
      }

      const existedTransaction = await TransactionModel.findOne({
        hash: this.hash,
      });

      this.keeperAddress = existedTransaction?.keeperAddress;
      this.data = existedTransaction?.data;
      this.processed = existedTransaction
        ? existedTransaction.processed
        : false;

      loadLogger.debug("Transaction loaded successfully");

      await this.process();
    } catch (error) {
      loadLogger.error("Error occurred while loading transaction", { error });
      throw error;
    }
  }

  async create(keeperAddress: string, data: TransactionData) {
    const createLogger = logger.child({
      method: "create",
      keeperAddress,
      txHash: data.tx_hash,
    });

    createLogger.trace("Creating transaction");

    try {
      this.keeperAddress = keeperAddress;
      this.data = data;
      this.hash = this.data.tx_hash;

      createLogger.debug("Checking if transaction exists");

      if (await this.exists()) {
        createLogger.error("Transaction already exists");
        throw new Error("transaction already exists");
      }

      createLogger.debug("Creating new transaction model");
      const transaction = new TransactionModel({
        processed: this.processed,
        keeperAddress: this.keeperAddress,
        data: this.data,
        hash: this.data.tx_hash,
      });
      createLogger.debug("Saving transaction to the database");
      await transaction.save();
      createLogger.debug("Transaction created successfully");
      await this.process();
    } catch (error) {
      createLogger.error("Error occurred while creating transaction", {
        error,
      });
      throw error;
    }
  }

  getDirectEvents() {
    const getDirectEventsLogger = logger.child({
      method: "getDirectEvents",
    });
    getDirectEventsLogger.trace("Getting direct events");

    try {
      if (!this.data) {
        getDirectEventsLogger.error("Transaction is not created or loaded!");
        throw new Error("Transaction is not created or loaded!");
      }

      const toAddress = this.data.to_address;
      const logs = this.data.log_events
        ? this.data.log_events.filter(
            (events: any) => events.sender_address === toAddress
          )
        : [];

      getDirectEventsLogger.debug("Direct events retrieved successfully");
      return logs;
    } catch (error) {
      getDirectEventsLogger.error(
        "Error occurred while getting direct events",
        { error }
      );
      throw error;
    }
  }

  async process() {
    const processLogger = logger.child({ method: "process" });
    processLogger.trace("Processing transaction");

    try {
      if (!this.keeperAddress || !this.data) {
        processLogger.error("Transaction is not created or loaded!");
        throw new Error("Transaction is not created or loaded!");
      }
      if (!this.processed) {
        const directEvents = this.getDirectEvents();

        if (directEvents.length === 1) {
          processLogger.debug("Creating notifications for direct events");
          directEvents.forEach(async (event) => {
            try {
              await this.notificationService.create(
                String(this.keeperAddress),
                {
                  name: event.decoded ? event.decoded.name : "unknown",
                  context: "transaction",
                  params: event.decoded ? event.decoded.params : [],
                },
                ethers.id(
                  JSON.stringify({ hash: this.hash, ...event.decoded.params })
                ),
                this.data ? new Date(this.data.block_signed_at) : undefined
              );
            } catch (error) {
              processLogger.error(
                "Error occurred while creating notification",
                { error }
              );
              throw error;
            }
          });
        }

        processLogger.debug("Updating transaction processed status");
        this.processed = true;
        await TransactionModel.updateOne(
          { hash: this.hash },
          {
            $set: { processed: true },
          }
        );
      }

      processLogger.debug("Transaction processed successfully");
    } catch (error) {
      processLogger.error("Error occurred while processing transaction", {
        error,
      });
      throw error;
    }

    // change processed both object and db
  }
}

export default Transaction;
