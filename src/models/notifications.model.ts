import mongoose, { Schema, Document } from "mongoose";

// Import the INotification and related interfaces
import { INotification, NotificationPayload, DecodedParam } from "../types";
import { DecodedParamSchema } from "./transaction.model";

// Define the NotificationPayloadSchema
const NotificationPayloadSchema = new Schema<NotificationPayload>({
  context: String,
  name: String,
  params: [Schema.Types.Mixed],
});

// Define the INotificationSchema
const INotificationSchema = new Schema<INotification>(
  {
    keeperAddress: String,
    uniqueHelper: String,
    payload: NotificationPayloadSchema, // Embed the NotificationPayloadSchema
    seen: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Create the mongoose model
const NotificationModel = mongoose.model<INotification & Document>(
  "Notification",
  INotificationSchema
);

export default NotificationModel;
