``# Keeper Manager Backend Documentation

## Table of Contents

- [Introduction](#introduction)
- [Keeper Software Summary](#keeper-software-summary)
- [Keeper Manager Summary](#keeper-manager-summary)
- [Keeper Manager Responsibilities](#keeper-manager-responsibilities)
- [Wallet Management](#wallet-management)
- [Keeper Creation (Option Management)](#keeper-creation-option-management)
- [Keeper Control](#keeper-control)
- [Keeper Monitoring](#keeper-monitoring)
- [Deploying the Keeper Manager](#deploying-the-keeper-manager)

---

## Introduction

Welcome to the documentation for the Keeper Manager Backend repository. This documentation provides essential information on setting up and managing keepers for participating in collateral auctions. The Keeper Manager Backend is responsible for simplifying and streamlining the operation of multiple keepers, making it efficient to run them in a production environment.

---

## Keeper Software Summary

The Keeper Manager Backend works in conjunction with the RAI Keeper Repository and TAI Keeper Repository to automate participation in collateral auctions. These repositories can be found here:

- [RAI Keeper Repository](https://github.com/reflexer-labs/auction-keeper)
- [TAI Keeper Repository](https://github.com/money-god/auction-keeper)

The primary method of running a keeper is by using Docker. To run a keeper successfully, specific input parameters are required, along with optional configuration options.

---

## Keeper Manager Summary

Running multiple keepers, especially in a production environment, introduces challenges related to wallet management, option management, keeper recovery, and monitoring. The Keeper Manager Backend is designed to address these challenges efficiently.

---

## Keeper Manager Responsibilities

The Keeper Manager Backend is responsible for the following key tasks:

### Wallet Management

Managing wallets becomes complex when dealing with numerous keepers. The Keeper Manager simplifies this process by securely managing wallet information.

### Keeper Creation (Option Management)

Efficiently creating and managing keeper configurations is essential. The Keeper Manager streamlines this process, making it easy to set up and modify options for multiple keepers.

### Keeper Control

The Keeper Manager provides tools to control the operation of keepers, including starting and stopping them as needed.

### Keeper Monitoring

Monitoring the activities of keepers, including logs, transactions, and notifications, is crucial for maintaining their smooth operation. The Keeper Manager Backend offers comprehensive monitoring capabilities to help identify and address issues promptly.

# Deploying the Keeper Manager

To deploy the Keeper Manager, follow these steps. Ensure you have the following dependencies installed on your system:

- [Node.js](https://nodejs.org/)
- [Docker](https://www.docker.com/)
- [MongoDB](https://www.mongodb.com/)

## Step 1: Clone the Repository

Clone the Keeper Manager Backend repository to your local machine:

```shell
git clone https://github.com/your-username/keeper-manager-backend.git
cd keeper-manager-backend
```

## Step 2: Install Node Dependencies

Navigate to the project directory and install the Node.js dependencies:

```shell
npm install
```

## Step 3: Configure Environment Variables

Copy the `.temp.env` file to `.env`:

```shell
cp .temp.env .env
```

Open the `.env` file in a text editor and fill in the following environment variables with your specific values:

- `COVALENT_KEY`: Obtain a Covalent API key.
- `JWT_SECRET`: Set a secret key for JSON Web Token (JWT) authentication.
- `INITIAL_USER`: Define an initial user for the Keeper Manager.
- `BOT_TOKEN`: If applicable, provide a token for a bot you plan to use.
- `MAINNET_RPC_URI`: Set the RPC URI for the Mainnet.
- `GOERLI_RPC_URI`: Set the RPC URI for the Goerli network.
- `RAI_KEEPER_IMAGE`: Specify the image for the RAI Keeper.
- `TAI_KEEPER_IMAGE`: Specify the image for the TAI Keeper.

## Step 4: Start the Keeper Manager

To start the Keeper Manager, run the following command:

```shell
npm start
```

The Keeper Manager will now be accessible via your web browser at [http://localhost:4000](http://localhost:4000/)

## Step 5: Run the frontend

Go to [frontend repository](https://github.com/Ajand/GEB-Keeper-Manager-client) and run the frontend using the API address.

# Keeper Manager Backend Architecture

The Keeper Manager Backend is built using a combination of technologies and services to provide efficient keeper management for collateral auctions. Below, we outline the main components and services of the application.

## API Layer

### GraphQL

The API layer of the Keeper Manager Backend is implemented using GraphQL. GraphQL provides a flexible and efficient way to query and manipulate data, allowing clients to request exactly the data they need.

### Apollo Server

[Apollo Server](https://www.apollographql.com/docs/apollo-server/) is used to build the GraphQL server. It simplifies the process of creating a GraphQL API and offers features like caching and real-time subscriptions.

## Database

### MongoDB

[MongoDB](https://www.mongodb.com/) is used as the database system to store and manage data for the Keeper Manager Backend. MongoDB's flexibility and scalability make it a suitable choice for managing keeper and user-related data.

## Main Services

### KeeperManager Class

**KeeperManager Class Overview**

The `KeeperManager` class is a core component of the Keeper Manager Backend responsible for managing and coordinating multiple `Keeper` instances. It serves as a central hub for managing the lifecycle of keepers, loading existing keepers from the database, and providing methods to interact with them.

**Key Functions**

1.  **Initialization**: The `KeeperManager` class is initialized with a reference to the `NotificationService` for sending notifications and facilitating communication.
2.  **Loading Keepers**: It loads existing keeper data from the database, creating `Keeper` instances for each one, and adds them to the list of active keepers.
3.  **Adding a Keeper**: Provides a mechanism to add a new `Keeper` instance to the list of active keepers.
4.  **Getting a Keeper**: Allows retrieving a specific `Keeper` instance by its MongoDB ObjectId.
5.  **Getting All Keepers**: Provides a method to retrieve a list of all active keepers managed by the `KeeperManager`.

**KeeperManager Responsibilities**

- **Keeper Lifecycle Management**: The `KeeperManager` coordinates the initialization, loading, and management of `Keeper` instances, ensuring they are available for auction participation.
- **Database Interaction**: It interacts with the database to retrieve existing keeper data and create `Keeper` instances based on that data.
- **Keeper Access**: The `KeeperManager` provides a way to access individual keepers by their unique identifiers.
- **Centralized Keeper Control**: It acts as a centralized control point for managing multiple keepers, making it easier to monitor and maintain the overall system.

The `KeeperManager` class plays a critical role in managing and coordinating a fleet of keepers, allowing for efficient automation and control of multiple keeper instances within the Keeper Manager Backend.

### Keeper Class

The `Keeper` class is a core component of the Keeper Manager Backend responsible for managing individual keepers that participate in collateral auctions. It facilitates the automation of keeper tasks related to auction participation and manages various configurations associated with each keeper.

**Key Functions**

1.  **Initialization**: The `Keeper` class is initialized with a reference to the `NotificationService` for sending notifications to users and administrators.
2.  **Managing Keeper State**: It manages the state of individual keepers, including their status, associated wallet, and configurations.
3.  **Keeper Creation**: Allows for the creation of new keepers with specified system, network, collateral, and options.
4.  **Restarting Keeper**: Provides functionality to restart a keeper, resetting the number of recovery attempts.
5.  **Container Handling**: Manages Docker containers associated with each keeper, ensuring they are started and stopped as needed.
6.  **Logs and Monitoring**: Monitors keeper logs, handles running status, and captures logs for analysis.
7.  **Balances Tracking**: Tracks and updates keeper balances, including native, system, and collateral balances.
8.  **Transaction Handling**: Manages keeper transactions, updating them at regular intervals.
9.  **Status Management**: Handles changes in the status of a keeper and notifies users when the status changes.

**Possible Keeper Statuses**

- **Initializing**: The keeper is in the process of initializing.
- **Preparing**: The keeper is preparing to run.
- **Running**: The keeper is actively participating in auctions.
- **Stopping**: The keeper is in the process of stopping.
- **Failed**: The keeper encountered a failure during operation.
- **Stopped**: The keeper has been stopped.
- **Recovering**: The keeper is attempting recovery after a failure.

The `Keeper` class plays a crucial role in automating keeper tasks, monitoring their status, and ensuring they operate effectively in collateral auctions. It is a fundamental component of the Keeper Manager Backend.

### Notification Service

**NotificationService Class Overview**

The `NotificationService` class is a vital component of the Keeper Manager Backend responsible for managing notifications related to keeper activities and transactions. It handles the creation, retrieval, and delivery of notifications to users and administrators.

**Key Functions**

1.  **Initialization**: The `NotificationService` class initializes an instance of the `TelegramService` for sending Telegram notifications.
2.  **Creating Notifications**: Provides methods to create notifications, including notifications for keepers and transactions. It allows for specifying unique identifiers to prevent duplicate notifications.
3.  **Retrieving Notifications**: Offers methods to retrieve notifications, including all notifications, unseen notifications, and notifications specific to a keeper.
4.  **Marking Notifications as Seen**: Allows marking unseen notifications as seen, updating their status.
5.  **Sending Telegram Notifications**: Sends notifications to Telegram channels or users based on the type of notification, whether it's related to a keeper or a transaction.

**NotificationService Responsibilities**

- **Notification Creation**: The `NotificationService` creates notifications with specific payloads, allowing for detailed information about keeper and transaction events.
- **Notification Retrieval**: It provides methods to retrieve notifications based on various criteria, such as all notifications, unseen notifications, or notifications specific to a keeper.
- **Notification Delivery**: The class sends notifications to relevant channels, including Telegram, ensuring that users and administrators receive timely information about keeper and transaction events.
- **Notification Tracking**: It tracks the seen/unseen status of notifications, enabling users to stay updated on recent events.
- **Duplicate Notification Prevention**: The class prevents duplicate notifications by using unique identifiers and checks before creating a new notification.

The `NotificationService` class plays a crucial role in keeping users and administrators informed about the activities and events related to keepers and transactions within the Keeper Manager Backend.

### Transaction Class

**Transaction Class Overview**

The `Transaction` class is responsible for managing transactions related to keeper activities within the Keeper Manager Backend. It handles the creation, retrieval, and processing of transaction data.

**Key Functions**

1.  **Initialization**: The `Transaction` class initializes with basic properties such as the transaction hash, processed status, and a reference to the `NotificationService` for creating transaction-related notifications.
2.  **Load or Create Transaction**: Provides methods to load an existing transaction from the database based on its hash or create a new transaction if it doesn't exist.
3.  **Check Transaction Existence**: Determines whether a transaction with a specific hash already exists in the database.
4.  **Direct Events Retrieval**: Retrieves direct events associated with the transaction, primarily events sent to a specific address.
5.  **Transaction Processing**: Handles the processing of a transaction, including the creation of notifications for specific events within the transaction data. It ensures that notifications are created only once for each unique event.
6.  **Updating Processed Status**: Updates the processed status of the transaction in both the object and the database after processing.

**Transaction Responsibilities**

- **Transaction Creation**: The `Transaction` class creates and saves transaction data in the database. It checks for duplicates to prevent re-creation.
- **Transaction Retrieval**: It retrieves transaction data based on the transaction hash and loads it into the class for further processing.
- **Event Extraction**: The class extracts direct events from the transaction data, filtering events sent to a specific address.
- **Notification Creation**: It creates notifications for specific events within the transaction data, allowing users and administrators to stay informed about keeper transactions.
- **Notification Dispatch**: Notifications are dispatched to the `NotificationService` for delivery to relevant channels, such as Telegram.

The `Transaction` class plays a crucial role in monitoring and processing keeper-related transactions within the Keeper Manager Backend, ensuring that relevant events are properly recorded and notifications are generated when needed.

### Telegram Service

The Telegram Service integrates with the Telegram messaging platform to deliver real-time notifications to users. It enhances communication and provides instant updates on keeper activities.

### Covalent Service

The Covalent Service connects to the Covalent API to access blockchain data. It helps in retrieving accurate blockchain information, such as token balances and transaction history, which is essential for keeper operations.
