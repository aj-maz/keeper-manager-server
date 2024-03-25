import Keeper from "./Keeper";
import mongoose from "mongoose";
import KeeperModel from "../../models/keeper.model";
import NotificationService from "../notifications/NotificationService";
import parentLogger from "../../lib/logger";

const logger = parentLogger.child({
  module: "keeper-manager",
});

class KeeperManager {
  activeKeepers: Keeper[] = [];
  notificationService: NotificationService;

  constructor(notificationService: NotificationService) {
    const constructorLogger = logger.child({
      method: "constructor",
    });

    try {
      constructorLogger.trace("Instantiating a KeeperManager");
      this.notificationService = notificationService;
      constructorLogger.info("KeeperManager instantiated.");
    } catch (err) {
      constructorLogger.error("Error occurred during instantiation", {
        error: err,
      });
      throw err;
    }
  }

  async loadKeepers() {
    const loadKeepersLogger = logger.child({
      method: "loadKeepers",
    });
    try {
      loadKeepersLogger.trace("Loading keepers from database");

      const keeperIds: Array<mongoose.Types.ObjectId> = (
        await KeeperModel.find({})
      ).map((keeper) => keeper._id);

      loadKeepersLogger.debug("Keeper IDs fetched:", { keeperIds });

      const loadedKeepers = await Promise.all(
        keeperIds.map(async (id) => {
          const keeper = new Keeper(this.notificationService);
          try {
            loadKeepersLogger.trace(`Loading keeper: ${id}`);
            await keeper.load(id);
            loadKeepersLogger.debug(`Keeper loaded: ${id}`);
          } catch (error) {
            loadKeepersLogger.error(`Failed to load keeper: ${id}`, { error });
          }
          return keeper;
        })
      );

      loadKeepersLogger.debug("All keepers loaded");

      loadedKeepers.forEach((keeper) => {
        this.activeKeepers.push(keeper);
      });

      loadKeepersLogger.info("All keepers added to activeKeepers array");
    } catch (err) {
      loadKeepersLogger.error("Error occurred while loading keepers", {
        error: err,
      });
      console.error(err); // Logging error to console
    }
  }

  addKeeper(keeper: Keeper) {
    const addKeeperLogger = logger.child({
      method: "addKeeper",
      keeperId: keeper._id,
    });

    try {
      addKeeperLogger.debug("Adding keeper to activeKeepers array");
      this.activeKeepers.push(keeper);
      addKeeperLogger.info("Keeper added successfully.");
    } catch (err) {
      addKeeperLogger.error("Error occurred while adding keeper", {
        error: err,
      });
      console.error(err); // Logging error to console
    }
  }

  getKeeper(keeperId: mongoose.Types.ObjectId): Keeper | undefined {
    const getKeeperLogger = logger.child({
      method: "getKeeper",
      keeperId: keeperId,
    });

    try {
      getKeeperLogger.debug("Searching for keeper in activeKeepers array");

      const keeper = this.activeKeepers.find(
        (keeper) => String(keeper._id) === String(keeperId)
      );

      if (keeper) {
        getKeeperLogger.info("Keeper found:", { keeperId: keeperId });
      } else {
        getKeeperLogger.warn("Keeper not found:", { keeperId: keeperId });
      }

      return keeper;
    } catch (err) {
      getKeeperLogger.error("Error occurred while getting keeper", {
        error: err,
      });
      return undefined;
    }
  }

  getKeepers() {
    const getKeepersLogger = logger.child({
      method: "getKeepers",
    });

    try {
      getKeepersLogger.debug("Getting activeKeepers array");
      return this.activeKeepers;
    } catch (err) {
      getKeepersLogger.error("Error occurred while getting activeKeepers", {
        error: err,
      });
      console.error(err); // Logging error to console
      return [];
    }
  }
}

export default KeeperManager;
