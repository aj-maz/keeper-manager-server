import { ethers } from "ethers";
import TransactionModel from "../../models/transaction.model";

import { TransactionData, DecodedParam } from "../../types";

import NotificationService from "../notifications/NotificationService";

class Transaction {
  keeperAddress: string | undefined;
  data: TransactionData | undefined;
  processed: boolean;
  hash: string | undefined;

  notificationService: NotificationService;

  constructor(notificationService: NotificationService) {
    this.processed = false;
    this.notificationService = notificationService;
  }

  async loadOrCreate(keeperAddress: string, data: TransactionData) {
    this.hash = data.tx_hash;
    if (await this.exists()) {
      await this.load(data.tx_hash);
    } else {
      await this.create(keeperAddress, data);
    }
  }

  async exists() {
    const existedTransaction = await TransactionModel.findOne({
      hash: this.hash,
    });
    return !!existedTransaction;
  }

  async load(txHash: string) {
    this.hash = txHash;
    if (!(await this.exists())) {
      throw new Error("transaction does not exists");
    }
    const existedTransaction = await TransactionModel.findOne({
      hash: this.hash,
    });

    this.keeperAddress = existedTransaction?.keeperAddress;
    this.data = existedTransaction?.data;
    this.processed = existedTransaction ? existedTransaction.processed : false;
    await this.process();
  }

  async create(keeperAddress: string, data: TransactionData) {
    this.keeperAddress = keeperAddress;
    this.data = data;
    this.hash = this.data.tx_hash;
    if (await this.exists()) {
      throw new Error("transaction already exists");
    }
    const transaction = new TransactionModel({
      processed: this.processed,
      keeperAddress: this.keeperAddress,
      data: this.data,
      hash: this.data.tx_hash,
    });
    await transaction.save();
    await this.process();
  }

  getDirectEvents() {
    if (!this.data) {
      throw new Error("Transaction is not created or loaded!");
    }
    const toAddress = this.data.to_address;
    const logs = this.data.log_events
      ? this.data.log_events.filter(
          (events: any) => events.sender_address === toAddress
        )
      : [];

    return logs;
  }

  async process() {
    if (!this.keeperAddress || !this.data) {
      throw new Error("Transaction is not created or loaded!");
    }
    if (!this.processed) {
      const directEvents = this.getDirectEvents();

      if (directEvents.length === 1) {
        directEvents.forEach(async (event) => {
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
        });
      }
      this.processed = true;
      await TransactionModel.updateOne(
        { hash: this.hash },
        {
          $set: { processed: true },
        }
      );
    }

    // change processed both object and db
  }
}

export default Transaction;
