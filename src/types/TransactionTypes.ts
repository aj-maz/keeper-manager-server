export interface ITransaction {
  processed: boolean;
  keeperAddress: string;
  data: TransactionData;
  hash: string;
}

export interface TransactionData {
  block_signed_at: string;
  block_height: number;
  tx_hash: string;
  tx_offset: number;
  successful: boolean;
  from_address: string;
  miner_address: string;
  from_address_label: string | null;
  to_address: string;
  to_address_label: string | null;
  value: string;
  value_quote: number;
  pretty_value_quote: string;
  gas_metadata: {
    contract_decimals: number;
    contract_name: string;
    contract_ticker_symbol: string;
    contract_address: string;
    supports_erc: any | null; // You might want to define a specific type for supports_erc
    logo_url: string;
  };
  gas_offered: number;
  gas_spent: number;
  gas_price: number;
  fees_paid: string;
  gas_quote: number;
  pretty_gas_quote: string;
  gas_quote_rate: number;
  log_events: LogEvent[]; // Define a LogEvent interface
}

export interface LogEvent {
  block_signed_at: string;
  block_height: number;
  tx_offset: number;
  log_offset: number;
  tx_hash: string;
  raw_log_topics: string[];
  sender_contract_decimals: number | null;
  sender_name: string | null;
  sender_contract_ticker_symbol: string | null;
  sender_address: string;
  sender_address_label: string | null;
  sender_logo_url: string;
  raw_log_data: string;
  decoded: DecodedLog;
}

export interface DecodedLog {
  name: string;
  signature: string;
  params: DecodedParam[];
}

export interface DecodedParam {
  name: string;
  type: string;
  indexed: boolean;
  decoded: boolean;
  value: string;
}
