import mongoose, { Schema } from "mongoose";

const TelegramSubscribersSchema = new Schema({
  conversationId: { type: "number", required: true },
});

const TelegramSubscribers = mongoose.model(
  "telegramSub",
  TelegramSubscribersSchema
);

export default TelegramSubscribers;
