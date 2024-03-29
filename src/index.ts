import "dotenv/config";
import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import connectDB from "./db";

import KeeperManager from "./modules/keepers/KeepersManager";
import resolverCreator from "./modules/api/resolvers";
import typeDefs from "./modules/api/typeDefs";
import NotificationService from "./modules/notifications/NotificationService";
import AnalyticsService from "./modules/analytics/AnalyticsService";

import Users from "./modules/users/Users";
import jwt from "jsonwebtoken";

import parentLogger from "./lib/logger";

const mainLogger = parentLogger.child({ module: "main" });

const main = async () => {
  try {
    mainLogger.trace("Starting main function...");
    await connectDB();
    mainLogger.info("Connected to the database.");

    const notificationService = new NotificationService();
    const analyticsService = new AnalyticsService();

    const keeperManager = new KeeperManager(notificationService);
    await keeperManager.loadKeepers();
    mainLogger.debug("Keepers loaded successfully.");

    //@ts-ignore
    Users.addUser(process.env.INITIAL_USER);
    mainLogger.debug("Initial user added successfully.");

    const resolvers = await resolverCreator({
      keeperManager,
      notificationService,
      analyticsService,
    });

    const server = new ApolloServer({
      typeDefs,
      resolvers,
    });

    const { url } = await startStandaloneServer(server, {
      listen: { port: 4000 },
      context: ({ req }) => {
        const token = req.headers.authorization || "";

        if (!token) return {};

        const decode = jwt.verify(token, String(process.env.JWT_SECRET));

        //@ts-ignore
        return { ...decode };
      },
    });

    mainLogger.info(`Apollo server is running at ${url}`);
  } catch (error) {
    mainLogger.error(`An error occurred in the main function`, {
      error,
    });
  }
};

main();
