import KeeperManager from "../keepers/KeepersManager";
import NotificationService from "../notifications/NotificationService";
import Keeper from "../keepers/Keeper";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

import { getSystems } from "../systems";
import { KeeperCreationInput } from "../../types";

import Users from "../users/Users";

const protectRoute = async (address: string) => {
  if (!address) {
    throw new Error("Unauthorized");
  }
  const user = Users.get(address);
  if (!user) {
    throw new Error("Unauthorized");
  }
  return true;
};

const resolverCreator = async ({
  keeperManager,
  notificationService,
}: {
  keeperManager: KeeperManager;
  notificationService: NotificationService;
}) => {
  return {
    Query: {
      users: async (_: any, __: any, { address }: { address: string }) => {
        await protectRoute(address);
        return await Users.getAll();
      },
      me: async (
        _: any,
        __: any,
        { address }: { address: string | undefined }
      ) => {
        if (!address) return null;
        return await Users.get(address);
      },
      keepers: async (_: any, __: any, { address }: { address: string }) => {
        await protectRoute(address);
        const keepers = keeperManager.getKeepers();
        return keepers.map(async (keeper) => await keeper.get());
      },
      keeper: async (
        _: any,
        { id }: { id: mongoose.Types.ObjectId },
        { address }: { address: string }
      ) => await keeperManager.getKeeper(id)?.get(),
      systems: () => getSystems(),
    },
    Mutation: {
      getNonce: async (_: any, { address }: { address: string }) => {
        await Users.generateNonce(address);
        return (await Users.get(address))?.nonce;
      },

      getToken: async (
        _: any,
        { signature, address }: { signature: string; address: string }
      ) => {
        const user = await Users.get(address);
        if (!user) {
          throw new Error("No user found!");
        }

        await Users.generateNonce(address);
        const isVerified = Users.verifySign({
          signature,
          publicAddress: address,
          nonce: user.nonce,
        });

        if (isVerified) {
          //@ts-ignore
          return jwt.sign(
            {
              _id: user._id,
              address: user.address,
            },
            String(process.env.JWT_SECRET)
          );
        } else {
          throw new Error("Signature was not proper");
        }
      },

      addUser: async (
        _: any,
        { address }: { address: string },
        { address: userAddress }: { address: string }
      ) => {
        await protectRoute(userAddress);
        await Users.addUser(address);
        return `user added.`;
      },

      seen: async (
        _: any,
        { address }: { address: string },
        { address: userAddress }: { address: string }
      ) => {
        await protectRoute(userAddress);
        await notificationService.seen(address);
      },

      startKeeper: async (
        _: any,
        keeperInput: KeeperCreationInput,
        { address }: { address: string }
      ) => {
        await protectRoute(address);
        const keeper = new Keeper(notificationService);
        await keeper.create(keeperInput);
        keeperManager.addKeeper(keeper);
        return keeper;
      },
      stopKeeper: async (
        _: any,
        { keeperId }: { keeperId: mongoose.Types.ObjectId },
        { address }: { address: string }
      ) => {
        await protectRoute(address);

        const keeper = keeperManager.getKeeper(keeperId);
        return keeper?.stopContainer();
      },
      restartKeeper: async (
        _: any,
        { keeperId }: { keeperId: mongoose.Types.ObjectId },
        { address }: { address: string }
      ) => {
        await protectRoute(address);
        const keeper = keeperManager.getKeeper(keeperId);
        return keeper?.restartKeeper();
      },
      exportWallet: async (
        _: any,
        { keeperId }: { keeperId: mongoose.Types.ObjectId },
        { address }: { address: string }
      ) => {
        await protectRoute(address);
        const keeper = keeperManager.getKeeper(keeperId);
        return keeper?.export();
      },
      setKeeperLogs: async (
        _: any,
        { keeperId }: { keeperId: mongoose.Types.ObjectId },
        { address }: { address: string }
      ) => {
        await protectRoute(address);
        const keeper = keeperManager.getKeeper(keeperId);
        keeper?.setLogs();
        return "done";
      },
    },
  };
};

export default resolverCreator;
