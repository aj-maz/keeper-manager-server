import { NotificationPayload, INotification } from "../../types";

import NotificationModel from "../../models/notifications.model";
import TelegramService from "./TelegramService";
import { DecodedParam } from "../../types";

import parentLogger from "../../lib/logger";

const logger = parentLogger.child({
  module: "notificationService",
});

class NotificationService {
  telegramService: TelegramService;

  constructor() {
    const constructorLogger = logger.child({
      method: "constructor",
    });

    try {
      constructorLogger.info("Instantiating NotificationService");
      this.telegramService = TelegramService.getInstance();
      constructorLogger.info("NotificationService instantiated successfully.");
    } catch (err) {
      constructorLogger.error("Error occurred during instantiation", {
        error: err,
      });
      throw err;
    }
  }

  async create(
    keeperAddress: string,
    payload: NotificationPayload,
    uniqueHelper?: string | undefined,
    createdAt?: Date
  ) {
    const createLogger = logger.child({
      method: "create",
      keeperAddress,
      uniqueHelper,
      createdAt,
    });

    try {
      createLogger.info("Creating notification");

      if (!uniqueHelper) {
        createLogger.debug(
          "Unique helper not provided, creating new notification"
        );

        const notification = new NotificationModel({ keeperAddress, payload });
        await notification.save();

        createLogger.debug("Notification saved to database");

        this.sendTelegram(notification);

        createLogger.info("Notification created successfully.");
      } else {
        createLogger.debug(
          "Unique helper provided, checking for existing notification"
        );

        const foundUnique = await NotificationModel.findOne({ uniqueHelper });

        if (foundUnique) {
          createLogger.info(
            "Notification already exists with provided unique helper, returning."
          );
          return;
        }

        const notification = new NotificationModel({
          keeperAddress,
          payload,
          uniqueHelper,
          createdAt: createdAt ? createdAt : new Date(),
        });
        await notification.save();

        createLogger.debug("Notification saved to database");

        this.sendTelegram(notification);

        createLogger.info("Notification created successfully.");
      }
    } catch (err) {
      createLogger.error("Error occurred while creating notification", {
        error: err,
      });
      console.error(err); // Logging error to console
    }
  }

  async getNotifications() {}

  async getUnseenNotificationsCount() {}

  async getKeeperNotifications(keeperAddress: string) {
    const getNotificationsLogger = logger.child({
      method: "getKeeperNotifications",
      keeperAddress: keeperAddress,
    });

    try {
      getNotificationsLogger.debug("Fetching notifications for keeper");

      const notifications = await NotificationModel.find({ keeperAddress });

      getNotificationsLogger.debug("Notifications fetched:", {
        count: notifications.length,
      });

      return notifications;
    } catch (err) {
      getNotificationsLogger.error(
        "Error occurred while fetching notifications",
        { error: err }
      );
      return [];
    }
  }

  async getUnseenNotificationsOfKeeper(keeperAddress: string) {
    const getUnseenNotificationsLogger = logger.child({
      method: "getUnseenNotificationsOfKeeper",
      keeperAddress: keeperAddress,
    });

    try {
      getUnseenNotificationsLogger.debug(
        "Fetching unseen notifications for keeper"
      );

      const unseenNotifications = await NotificationModel.find({
        keeperAddress,
        seen: false,
      });

      getUnseenNotificationsLogger.debug("Unseen notifications fetched:", {
        count: unseenNotifications.length,
      });

      return unseenNotifications;
    } catch (err) {
      getUnseenNotificationsLogger.error(
        "Error occurred while fetching unseen notifications",
        { error: err }
      );
      console.error(err); // Logging error to console
      return [];
    }
  }

  async getUnseenNotificationsCountOfKeeper(keeperAddress: string) {
    const getUnseenNotificationsCountLogger = logger.child({
      method: "getUnseenNotificationsCountOfKeeper",
      keeperAddress: keeperAddress,
    });

    try {
      getUnseenNotificationsCountLogger.debug(
        "Fetching unseen notifications count for keeper"
      );

      const unseenNotifications = await this.getUnseenNotificationsOfKeeper(
        keeperAddress
      );
      const unseenNotificationsCount = unseenNotifications.length;

      getUnseenNotificationsCountLogger.debug(
        "Unseen notifications count fetched:",
        { count: unseenNotificationsCount }
      );

      return unseenNotificationsCount;
    } catch (err) {
      getUnseenNotificationsCountLogger.error(
        "Error occurred while fetching unseen notifications count",
        { error: err }
      );
      console.error(err); // Logging error to console
      return 0;
    }
  }

  async seen(keeperAddress: string) {
    const seenLogger = logger.child({
      method: "seen",
      keeperAddress: keeperAddress,
    });

    try {
      seenLogger.info("Marking notifications as seen for keeper");

      const unseenNotifications = await this.getUnseenNotificationsOfKeeper(
        keeperAddress
      );
      const unseenNotificationsIds = unseenNotifications.map(
        (notif) => notif._id
      );

      seenLogger.debug("Unseen notifications fetched:", {
        count: unseenNotificationsIds.length,
      });

      if (unseenNotificationsIds.length > 0) {
        seenLogger.debug("Marking notifications as seen in the database");

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

        seenLogger.info("Notifications marked as seen successfully.");
      } else {
        seenLogger.debug("No unseen notifications found for the keeper.");
      }
    } catch (err) {
      seenLogger.error("Error occurred while marking notifications as seen", {
        error: err,
      });
      throw err; // Logging error to console
    }
  }

  sendTelegram(notification: INotification) {
    const sendTelegramLogger = logger.child({
      method: "sendTelegram",
      keeperAddress: notification.keeperAddress,
      context: notification.payload.context,
      notificationName: notification.payload.name,
    });

    try {
      sendTelegramLogger.info("Sending telegram message");

      const context = notification.payload.context;
      let message = "";

      if (context === "keeper") {
        message = `
        Keeper ${notification.keeperAddress} has an ${
          notification.payload.name
        } Notification.
          Params are: ${notification.payload.params.join(", ")}
      `;
      } else if (context === "transaction") {
        message = `
        Keeper ${notification.keeperAddress} did a transaction ${
          notification.payload.name
        } Notification. \nParams are: \n${notification.payload.params
          .map((param) => {
            const decodedParam = param as DecodedParam;
            return `${decodedParam.name}: ${decodedParam.value} `;
          })
          .join(`\n`)}
      `;
      }

      sendTelegramLogger.debug("Sending telegram message:", { message });

      this.telegramService.sendMessage(message);

      sendTelegramLogger.info("Telegram message sent successfully.");
    } catch (err) {
      sendTelegramLogger.error(
        "Error occurred while sending telegram message",
        { error: err }
      );
      console.error(err); // Logging error to console
    }
  }
}

export default NotificationService;
