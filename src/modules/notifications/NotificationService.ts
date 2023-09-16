import { NotificationPayload, INotification } from "../../types";

import NotificationModel from "../../models/notifications.model";
import TelegramService from "./TelegramService";
import { DecodedParam } from "../../types";

class NotificationService {
  telegramService: TelegramService;

  constructor() {
    this.telegramService = new TelegramService();
  }

  async create(
    keeperAddress: string,
    payload: NotificationPayload,
    uniqueHelper?: string | undefined,
    createdAt?: Date
  ) {
    if (!uniqueHelper) {
      const notification = new NotificationModel({ keeperAddress, payload });
      await notification.save();
      this.sendTelegram(notification);
    } else {
      const foundUnique = await NotificationModel.findOne({ uniqueHelper });
      if (foundUnique) return;
      const notification = new NotificationModel({
        keeperAddress,
        payload,
        uniqueHelper,
        createdAt: createdAt ? createdAt : new Date(),
      });
      await notification.save();
      this.sendTelegram(notification);
    }
  }

  async getNotifications() {}

  async getUnseenNotificationsCount() {}

  async getKeeperNotifications(keeperAddress: string) {
    return await NotificationModel.find({ keeperAddress });
  }
  async getUnseenNotificationsOfKeeper(keeperAddress: string) {
    return await NotificationModel.find({ keeperAddress, seen: false });
  }

  async getUnseenNotificationsCountOfKeeper(keeperAddress: string) {
    return (await this.getUnseenNotificationsOfKeeper(keeperAddress)).length;
  }

  async seen(keeperAddress: string) {
    const unseenNotificationsIds = (
      await this.getUnseenNotificationsOfKeeper(keeperAddress)
    ).map((notif) => notif._id);
    await NotificationModel.updateMany(
      {
        _id: { $in: unseenNotificationsIds },
      },
      {
        $set: {
          seen: true,
        },
      }
    );
  }

  sendTelegram(notification: INotification) {
    const context = notification.payload.context;
    if (context === "keeper") {
      this.telegramService.sendMessage(
        `
        Keeper ${notification.keeperAddress} has an ${
          notification.payload.name
        } Notification.
          Params are: ${notification.payload.params.join(", ")}
        `
      );
    } else if (context === "transaction") {
      this.telegramService.sendMessage(`
        Keeper ${notification.keeperAddress} did a transaction ${
        notification.payload.name
      } Notification. \nParams are: \n${notification.payload.params
        .map((param) => {
          const decodedParam = param as DecodedParam;
          return `${decodedParam.name}: ${decodedParam.value} `;
        })
        .join(`\n`)}
      `);
    }
  }
}

export default NotificationService;
