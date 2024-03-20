import KeeperManager from "../keepers/KeepersManager";
import NotificationService from "../notifications/NotificationService";
import AnalyticsService from "../analytics/AnalyticsService";
import Keeper from "../keepers/Keeper";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

import { getSystems } from "../systems";
import { KeeperCreationInput } from "../../types";

import Users from "../users/Users";

import { Logger } from "pino";
import parentLogger from "../../lib/logger";

const logger = parentLogger.child({
  module: "resolvers",
});

const protectRoute = (logger: Logger) => async (address: string) => {
  logger.info("Requesting a protected route", { address });
  if (!address) {
    logger.warn("An unauthorized user requested to access.", { address });
    throw new Error("Unauthorized");
  }
  const user = Users.get(address);
  if (!user) {
    logger.warn("An unauthorized user requested to access.", { address });
    throw new Error("Unauthorized");
  }
  return true;
};

const resolverCreator = async ({
  keeperManager,
  notificationService,
  analyticsService,
}: {
  keeperManager: KeeperManager;
  notificationService: NotificationService;
  analyticsService: AnalyticsService;
}) => {
  return {
    Query: {
      users: async (_: any, __: any, { address }: { address: string }) => {
        const userQueryLogger = logger.child({
          method: "query.users",
          actor: address,
        });
        userQueryLogger.info("Requesting to get users list");
        try {
          await protectRoute(userQueryLogger)(address);
          userQueryLogger.debug("User who is requesting is authorized");
          const users = await Users.getAll();
          userQueryLogger.info(`Found ${users.length} users`, {
            users,
          });
          return users;
        } catch (err) {
          userQueryLogger.error(
            "Something wrong happened while getting users",
            {
              err,
            }
          );
        }
      },
      me: async (
        _: any,
        __: any,
        { address }: { address: string | undefined }
      ) => {
        const meQueryLogger = logger.child({
          method: "query.me",
          actor: address,
        });
        meQueryLogger.info("Requesting to get user themselves");
        if (!address) {
          meQueryLogger.error("No address exists for the user");
          return null;
        }
        try {
          const user = await Users.get(address);
          meQueryLogger.info("User requesting found", {
            user,
          });
          return user;
        } catch (err) {
          meQueryLogger.error("Finding the user failed", {
            error: err,
          });
          throw err;
        }
      },
      keepers: async (_: any, __: any, { address }: { address: string }) => {
        const keepersQueryLogger = logger.child({
          method: "query.keepers",
          actor: address,
        });
        keepersQueryLogger.info("Requesting to get keepers");
        await protectRoute(keepersQueryLogger)(address);
        keepersQueryLogger.debug("User who is requesting is authorized");
        try {
          keepersQueryLogger.trace("Getting keepers from the keeper manager");
          const keepers = keeperManager.getKeepers();
          keepersQueryLogger.debug("Keepers gotten from the keepers", {
            keepers,
          });
          const result = keepers.map(async (keeper) => await keeper.get());
          keepersQueryLogger.debug("Keeper result processed", {
            keepers,
            result,
          });
          return result;
        } catch (err) {
          keepersQueryLogger.error("Getting the keepers", {
            error: err,
          });
          throw err;
        }
      },
      keeper: async (
        _: any,
        { id }: { id: mongoose.Types.ObjectId },
        { address }: { address: string }
      ) => {
        const keeperQueryLogger = logger.child({
          method: "query.keeper",
          actor: address,
          keeperId: id,
        });
        keeperQueryLogger.info("Requesting to get keepers");
        const keeper = await keeperManager.getKeeper(id)?.get();
        keeperQueryLogger.debug("Got the keeper", {
          keeper,
        });
        return keeper;
      },
      systems: () => {
        const systemQueryLogger = logger.child({
          method: "query.systems",
        });
        systemQueryLogger.info("Requesting to get systems");
        const systems = getSystems();
        systemQueryLogger.debug("Got the systems", {
          systems,
        });
        return systems;
      },
      raiSafes: () => {
        const raiSafesQueryLogger = logger.child({
          method: "query.raiSafes",
        });
        raiSafesQueryLogger.info("Requesting to get analytics safes");
        const analyticsSafe = analyticsService.getSafes();
        raiSafesQueryLogger.debug("Got the analytics safes", {
          analyticsSafe,
        });
        return analyticsSafe;
      },
    },
    Mutation: {
      getNonce: async (_: any, { address }: { address: string }) => {
        const getNonceMutationLogger = logger.child({
          method: "mutation.getNonce",
          for: address,
        });
        getNonceMutationLogger.info("Requesting to get nonce");
        const nonce = await Users.generateNonce(address);
        getNonceMutationLogger.debug("Got the nonce", {
          nonce,
        });
        return (await Users.get(address))?.nonce;
      },

      getToken: async (
        _: any,
        { signature, address }: { signature: string; address: string }
      ) => {
        const getTokenMutationLogger = logger.child({
          method: "mutation.getToken",
          for: address,
        });
        getTokenMutationLogger.info("Requesting to get token");
        const user = await Users.get(address);
        if (!user) {
          getTokenMutationLogger.warn("User doesn't exists");
          throw new Error("No user found!");
        }

        try {
          getTokenMutationLogger.trace("Generating nonce");
          await Users.generateNonce(address);
          getTokenMutationLogger.info("Generated a new nonce");

          getTokenMutationLogger.trace("Verifying signature", {
            signature,
            publicAddress: address,
            nonce: user.nonce,
          });
          const isVerified = Users.verifySign({
            signature,
            publicAddress: address,
            nonce: user.nonce,
          });
          getTokenMutationLogger.debug("Verifying signature result", {
            isVerified,
            signature,
            publicAddress: address,
            nonce: user.nonce,
          });

          if (isVerified) {
            getTokenMutationLogger.trace("Generating a new token for the user");
            const token = jwt.sign(
              {
                _id: user._id,
                address: user.address,
              },
              String(process.env.JWT_SECRET)
            );
            getTokenMutationLogger.info("Generated a new token for the user");
            //@ts-ignore
            return;
          } else {
            getTokenMutationLogger.error("Signature was mismatched");
            throw new Error("Signature was not mismatched");
          }
        } catch (err) {
          getTokenMutationLogger.error(
            "Failed to generate a nonce for logger",
            { error: err }
          );
          throw err;
        }
      },

      addUser: async (
        _: any,
        { address }: { address: string },
        { address: userAddress }: { address: string }
      ) => {
        const addUserMutationLogger = logger.child({
          method: "mutation.addUser",
          actor: userAddress,
          target: address,
        });
        addUserMutationLogger.info("Requesting to add user");
        await protectRoute(addUserMutationLogger)(userAddress);
        addUserMutationLogger.debug(
          "User who is requesting to add user is authorized"
        );
        try {
          addUserMutationLogger.trace("Adding a user");
          await Users.addUser(address);
          addUserMutationLogger.info("User added successfully");
          return `user added.`;
        } catch (err) {
          addUserMutationLogger.error(
            "Something wrong happend while adding the user",
            {
              err,
            }
          );
          throw err;
        }
      },

      seen: async (
        _: any,
        { address }: { address: string },
        { address: userAddress }: { address: string }
      ) => {
        const seenMutationLogger = logger.child({
          method: "mutation.seen",
          actor: userAddress,
          target: address,
        });
        seenMutationLogger.info("Requesting to seen");
        await protectRoute(seenMutationLogger)(userAddress);
        seenMutationLogger.debug(
          "User who is requesting to seen is authorized"
        );

        try {
          seenMutationLogger.trace("Seeing the notifications");
          await notificationService.seen(address);
          seenMutationLogger.info("User added successfully");
          return `seen successfully`;
        } catch (err) {
          seenMutationLogger.error("Something wrong happend while seeing", {
            error: err,
          });
          throw err;
        }
      },

      startKeeper: async (
        _: any,
        keeperInput: KeeperCreationInput,
        { address }: { address: string }
      ) => {
        const startKeeperMutationLogger = logger.child({
          method: "mutation.startKeeper",
          actor: address,
          target: keeperInput,
        });

        startKeeperMutationLogger.info("Requesting to start keeper");
        await protectRoute(startKeeperMutationLogger)(address);
        startKeeperMutationLogger.debug(
          "User who is requesting to start the keeper is authorized"
        );

        try {
          startKeeperMutationLogger.trace("Instanciating a new keeper");
          const keeper = new Keeper(notificationService);
          startKeeperMutationLogger.debug("Creating a new keeper");
          await keeper.create(keeperInput);
          startKeeperMutationLogger.info("Keeper created");
          startKeeperMutationLogger.debug("Adding keeper to keeper manager");
          keeperManager.addKeeper(keeper);
          startKeeperMutationLogger.info(
            "Keeper added to keeper manager properly"
          );
          return keeper;
        } catch (err) {
          startKeeperMutationLogger.error(
            "Something wrong happened while creating the keeper",
            {
              error: err,
            }
          );
          throw err;
        }
      },
      stopKeeper: async (
        _: any,
        { keeperId }: { keeperId: mongoose.Types.ObjectId },
        { address }: { address: string }
      ) => {
        const stopKeeperMutationLogger = logger.child({
          method: "mutation.stopKeeper",
          actor: address,
          keeperId,
        });
        stopKeeperMutationLogger.info("Requesting to stop keeper");
        await protectRoute(stopKeeperMutationLogger)(address);
        stopKeeperMutationLogger.debug(
          "User who is requesting to stop the keeper is authorized"
        );
        try {
          stopKeeperMutationLogger.trace("Getting the target keeper");
          const keeper = keeperManager.getKeeper(keeperId);
          stopKeeperMutationLogger.debug("Successfully got the keeper", {
            keeper,
          });
          stopKeeperMutationLogger.trace("Stopping the keeper");
          const stopContainerResult = await keeper?.stopContainer();
          stopKeeperMutationLogger.debug("Keeper stopped", {
            stopContainerResult,
          });
          return stopContainerResult;
        } catch (err) {
          stopKeeperMutationLogger.error(
            "Something wrong happened while stopping the keeper",
            {
              error: err,
            }
          );
          throw err;
        }
      },
      restartKeeper: async (
        _: any,
        { keeperId }: { keeperId: mongoose.Types.ObjectId },
        { address }: { address: string }
      ) => {
        const restartKeeperMutationLogger = logger.child({
          method: "mutation.restartKeeper",
          actor: address,
          keeperId,
        });
        restartKeeperMutationLogger.info("Requesting to restart keeper");
        await protectRoute(restartKeeperMutationLogger)(address);
        restartKeeperMutationLogger.debug(
          "User who is requesting to restart the keeper is authorized"
        );
        try {
          restartKeeperMutationLogger.trace("Getting the target keeper");
          const keeper = keeperManager.getKeeper(keeperId);
          restartKeeperMutationLogger.debug("Successfully got the keeper", {
            keeper,
          });
          restartKeeperMutationLogger.trace(
            "handling the restart of the keeper"
          );
          const handledServiceResult = keeper?.handleService();
          restartKeeperMutationLogger.debug("Keeper handled", {
            handledServiceResult,
          });
          return handledServiceResult;
        } catch (err) {
          restartKeeperMutationLogger.error(
            "Something wrong happened while restarting the keeper",
            {
              error: err,
            }
          );
          throw err;
        }
      },
      exportWallet: async (
        _: any,
        { keeperId }: { keeperId: mongoose.Types.ObjectId },
        { address }: { address: string }
      ) => {
        const exportWalletMutationLogger = logger.child({
          method: "mutation.exportWallet",
          actor: address,
          keeperId,
        });
        exportWalletMutationLogger.info("Requesting to export the wallet");
        await protectRoute(exportWalletMutationLogger)(address);
        exportWalletMutationLogger.debug(
          "User who is requesting to export the wallet is authorized"
        );
        try {
          exportWalletMutationLogger.trace("Getting the target keeper");
          const keeper = keeperManager.getKeeper(keeperId);
          exportWalletMutationLogger.debug("Successfully got the keeper", {
            keeper,
          });
          exportWalletMutationLogger.trace("Exporting the wallet");
          const exportedWallet = keeper?.export();
          exportWalletMutationLogger.debug("Successfully exported the wallet");
          return exportedWallet;
        } catch (err) {
          exportWalletMutationLogger.error(
            "Something wrong happened while exporting the wallet",
            {
              err,
            }
          );
          throw err;
        }
      },
      setKeeperLogs: async (
        _: any,
        { keeperId }: { keeperId: mongoose.Types.ObjectId },
        { address }: { address: string }
      ) => {
        const setKeeperLogsMutationLogger = logger.child({
          method: "mutation.setKeeperLogs",
          actor: address,
          keeperId,
        });
        setKeeperLogsMutationLogger.info("Requesting to set the keeper logs");
        await protectRoute(setKeeperLogsMutationLogger)(address);
        setKeeperLogsMutationLogger.debug(
          "User who is requesting to set the keeper logs is authorized"
        );
        //const keeper = keeperManager.getKeeper(keeperId);
        //console.log(keeper?._id);
        //keeper?.setLogs(true);
        return "done";
      },
    },
  };
};

export default resolverCreator;
