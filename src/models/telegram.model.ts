import mongoose, { Schema } from "mongoose";

const TelegramConversationSchema = new Schema({
  conversationId: { type: "number", required: true },
});

const TelegramConversationModel = mongoose.model(
  "telegramConversation",
  TelegramConversationSchema
);

export default TelegramConversationModel;
