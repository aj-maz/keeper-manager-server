import "dotenv/config";
import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import connectDB from "./db";

import KeeperManager from "./modules/keepers/KeepersManager";
import resolverCreator from "./modules/api/resolvers";
import typeDefs from "./modules/api/typeDefs";

import Covalent from "./modules/external/Covalent";
import Transaction from "./modules/transaction/Transaction";
import NotificationService from "./modules/notifications/NotificationService";

import Users from "./modules/users/Users";
import jwt from "jsonwebtoken";

const main = async () => {
  await connectDB();

  const notificationService = new NotificationService();

  const keeperManager = new KeeperManager(notificationService);
  await keeperManager.loadKeepers();

  //@ts-ignore
  Users.addUser(process.env.INITIAL_USER);

  const resolvers = await resolverCreator({
    keeperManager,
    notificationService,
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

  console.log(`Apollo server is running at ${url}`);
};

main();
