const typeDefs = `#graphql
    type DecodedParam {
        name: String!
        type: String!
        indexed: Boolean!
        decoded: Boolean!
        value: String!
    }

    type DecodedLog {
        name: String!
        signature: String!
        params: [DecodedParam!]!
    }

    type LogEvent {
        block_signed_at: String!
        block_height: Int!
        tx_offset: Int!
        log_offset: Int!
        tx_hash: String!
        raw_log_topics: [String!]!
        sender_contract_decimals: Int
        sender_name: String
        sender_contract_ticker_symbol: String
        sender_address: String!
        sender_address_label: String
        sender_logo_url: String!
        raw_log_data: String!
        decoded: DecodedLog!
    }

    type GasMetadata {
        contract_decimals: Int!
        contract_name: String!
        contract_ticker_symbol: String!
        contract_address: String!
        supports_erc: Boolean
        logo_url: String!
    }
    type TransactionData {
        block_signed_at: String!
        block_height: Int!
        tx_hash: String!
        tx_offset: Int!
        successful: Boolean!
        from_address: String!
        miner_address: String!
        from_address_label: String
        to_address: String!
        to_address_label: String
        value: String!
        value_quote: Float!
        pretty_value_quote: String!
        gas_metadata: GasMetadata!
        gas_offered: Int!
        gas_spent: Int!
        gas_price: Int!
        fees_paid: String!
        gas_quote: Float!
        pretty_gas_quote: String!
        gas_quote_rate: Float!
        log_events: [LogEvent!]!
    }
    
    type Transaction {
        processed: Boolean!
        keeperAddress: String!
        data: TransactionData!
        hash: String!
        directEvents: [LogEvent!]!
    }

    type KeeperBalances {
        native: String
        system: String
        systemCoinJoin: String
        collateral: String
        collateralCoinJoin: String
    }
    

    type NotificationPayload {
        context: String!
        name: String!
        stringifiedParams: String
    }
    
    
    type Notification {
        _id: ID!
        keeperAddress: String!
        payload: NotificationPayload!
        seen: Boolean!
        uniqueHelper: String
        createdAt: String
    }


    type Keeper {
        _id: ID!
        collateral: String!
        network: String!
        system: String!
        wallet: String!
        status: String!
        options: [String!]!
        logs: String!
        transactions: [Transaction!]!
        balances: KeeperBalances
        unseenNotifsCount: Int
        notifications: [Notification]
    }

    type Collateral {
        name: String!
        address: String!
    }
  
    type SystemNetwork {
        name: String!
        nativeCoin: String!
        systemCoin: String!
        collaterals: [Collateral!]!
    } 
  
    type System {
        name: String!
        networks: [SystemNetwork!]!
    }

    type User {
        _id: ID!
        address: String
        nonce: Int
    }

    type Safe {
        id: String
        debt: String
        liquidationPrice: String
    }

    type Query {
        users: [User!]!
        me: User
        keepers: [Keeper!]!
        keeper(id: ID!): Keeper
        systems: [System!]!
        raiSafes: [Safe!]!
    }

    type Mutation {
        getNonce(address: String!): Int
        getToken(address: String!, signature: String!): String!
        addUser(address: String!): String!

        seen(address: ID!): String

        startKeeper(
            system: String!
            network: String!
            collateral: String!
            privateKey: String!
            options: [String!]!
        ): Keeper!
        stopKeeper(keeperId: String!): String
        
        restartKeeper(keeperId: String!): String
        exportWallet(keeperId: String!): String!
        setKeeperLogs(keeperId: String!): String!
    }
`;

export default typeDefs;
