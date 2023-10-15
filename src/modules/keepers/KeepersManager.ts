import Keeper from "./Keeper";
import mongoose from "mongoose";
import KeeperModel from "../../models/keeper.model";
import NotificationService from "../notifications/NotificationService";

class KeeperManager {
  activeKeepers: Keeper[] = [];
  notificationService: NotificationService;

  constructor(notificationService: NotificationService) {
    this.notificationService = notificationService;
  }

  async loadKeepers() {
    const keeperIds: Array<mongoose.Types.ObjectId> = (
      await KeeperModel.find({})
    ).map((keeper) => keeper._id);
    const loadedKeepers = await Promise.all(
      keeperIds.map(async (id) => {
        const keeper = new Keeper(this.notificationService);
        await keeper.load(id);
        return keeper;
      })
    );
    loadedKeepers.forEach((keeper) => {
      this.activeKeepers.push(keeper);
    });
  }

  addKeeper(keeper: Keeper) {
    this.activeKeepers.push(keeper);
  }

  getKeeper(keeperId: mongoose.Types.ObjectId): Keeper | undefined {
    const keeper = this.activeKeepers.find(
      (keeper) => String(keeper._id) === String(keeperId)
    );
    return keeper;
  }

  getKeepers() {
    return this.activeKeepers;
  }
}

export default KeeperManager;
