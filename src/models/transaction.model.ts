import mongoose, { Schema, Document } from "mongoose";

// Import the ITransaction and related interfaces
import {
  ITransaction,
  TransactionData,
  LogEvent,
  DecodedLog,
  DecodedParam,
} from "../types";

// Define the DecodedParamSchema
export const DecodedParamSchema = new Schema<DecodedParam>({
  name: String,
  type: String,
  indexed: Boolean,
  decoded: Boolean,
  value: String,
});

// Define the DecodedLogSchema
const DecodedLogSchema = new Schema<DecodedLog>({
  name: String,
  signature: String,
  params: [DecodedParamSchema],
});

// Define the LogEventSchema
const LogEventSchema = new Schema<LogEvent>({
  block_signed_at: String,
  block_height: Number,
  tx_offset: Number,
  log_offset: Number,
  tx_hash: String,
  raw_log_topics: [String],
  sender_contract_decimals: Number,
  sender_name: String,
  sender_contract_ticker_symbol: String,
  sender_address: String,
  sender_address_label: String,
  sender_logo_url: String,
  raw_log_data: String,
  decoded: DecodedLogSchema, // Embed the DecodedLogSchema
});

// Define the TransactionDataSchema
const TransactionDataSchema = new Schema<TransactionData>({
  block_signed_at: String,
  block_height: Number,
  tx_hash: String,
  tx_offset: Number,
  successful: Boolean,
  from_address: String,
  miner_address: String,
  from_address_label: String,
  to_address: String,
  to_address_label: String,
  value: String,
  value_quote: Number,
  pretty_value_quote: String,
  gas_metadata: {
    contract_decimals: Number,
    contract_name: String,
    contract_ticker_symbol: String,
    contract_address: String,
    supports_erc: Schema.Types.Mixed, // Use Mixed for any type
    logo_url: String,
  },
  gas_offered: Number,
  gas_spent: Number,
  gas_price: Number,
  fees_paid: String,
  gas_quote: Number,
  pretty_gas_quote: String,
  gas_quote_rate: Number,
  log_events: [LogEventSchema], // Embed the LogEventSchema
});

// Define the ITransactionSchema
const TransactionSchema = new Schema<ITransaction>({
  processed: Boolean,
  keeperAddress: String,
  data: TransactionDataSchema, // Embed the TransactionDataSchema
  hash: String,
});

// Create the mongoose model
const TransactionModel = mongoose.model<ITransaction & Document>(
  "Transaction",
  TransactionSchema
);

export default TransactionModel;
