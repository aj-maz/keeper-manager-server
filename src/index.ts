import "dotenv/config";
import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { connectorFactory } from "./db";

import KeeperManager from "./modules/keepers/KeepersManager";
import resolverCreator from "./modules/api/resolvers";
import typeDefs from "./modules/api/typeDefs";
import NotificationService from "./modules/notifications/NotificationService";
import AnalyticsService from "./modules/analytics/AnalyticsService";

import Users from "./modules/users/Users";
import jwt from "jsonwebtoken";

import logger from "@lib/logger";

import { instantiateBot } from "./modules/notifications/TelegramService/telegramService";

const main = async () => {
  const {
    MONGODB_PROTOCOL = "mongodb",
    MONGODB_HOST = "mongodb",
    MONGODB_DATABASE_NAME = "geb_keepers_manager",
    MONGODB_PORT = "27017",
    BOT_TOKEN,
  } = process.env;

  const dbConnector = connectorFactory(
    {
      protocol: MONGODB_PROTOCOL,
      host: MONGODB_HOST,
      database: MONGODB_DATABASE_NAME,
      port: MONGODB_PORT,
    },
    logger
  );

  //await dbConnector();

  try {
    const bot = instantiateBot(logger)("asdw");
    instantiateBot(logger)(BOT_TOKEN);
  } catch (err) {
    console.error(err);
  }

  //const notificationService = new NotificationService();
  /* const analyticsService = new AnalyticsService();

  const keeperManager = new KeeperManager(notificationService);
  await keeperManager.loadKeepers();

  //@ts-ignore
  Users.addUser(process.env.INITIAL_USER);

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

  console.log(`Apollo server is running at ${url}`);*/
};

main();
