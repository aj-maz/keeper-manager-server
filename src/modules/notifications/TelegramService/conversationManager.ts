import { Logger } from "pino";
import { Document } from "mongoose";
import TelegramConversationModel from "../../../models/telegram.model";

export const saveConversation =
  (Conversation: typeof TelegramConversationModel, logger: Logger) =>
  async (conversationId: number) => {
    logger.trace(`Preparing to save telegram conversation: ${conversationId}`);
    logger.debug(
      `Attempting to find a telegram conversation: ${conversationId}`
    );
    const conversation = await Conversation.findOne({
      conversationId,
    });
    if (conversation) {
      logger.info(`Telegram conversation already existed: ${conversationId}`);
      return conversation;
    } else {
      try {
        logger.debug(
          `Attempting to create a new telegram conversation: ${conversationId}`
        );
        const conversation = await Conversation.create({ conversationId });
        logger.info(`Created a new telegram conversation: ${conversationId}`);
        return conversation;
      } catch (err) {
        logger.error(
          `Error in creating a new telegram conversation: ${conversationId}`,
          {
            error: err,
          }
        );
        throw err;
      }
    }
  };

export const getConversations = async (
  Conversation: typeof TelegramConversationModel,
  logger: Logger
) => {
  console.log(Conversation);
  logger.trace(`Preparing to get all saved telegram conversation`);
  try {
    logger.debug(`Preparing to get all saved telegram conversation`);
    const conversations = await Conversation.find({});
    logger.info(`Got ${conversations.length} telegram conversations`, {
      conversationIds: conversations.map(
        (conversation) => conversation.conversationId
      ),
    });
  } catch (err) {
    logger.error(`Error in getting the telegram conversations`, {
      error: err,
    });
    throw err;
  }
};

export const ConversationSaverFactory = (
  Conversation: typeof TelegramConversationModel,
  logger: Logger,
  conversationId: number
) => {
  const saveConversationLogger = logger.child({
    functionality: "saving-conversation",
    context: "telegram",
    conversationId,
  });

  return () =>
    saveConversation(Conversation, saveConversationLogger)(conversationId);
};

export const ConversationGetterFactory = (
  Conversation: typeof TelegramConversationModel,
  logger: Logger
) => {
  const getConversationsLogger = logger.child({
    functionality: "getting-conversations",
    context: "telegram",
  });
  return () => getConversations(Conversation, getConversationsLogger);
};

export type ConversationSaver = (
  conversationId: number
) => ReturnType<typeof ConversationSaverFactory>;

export type ConversationsGetter = () => ReturnType<
  typeof ConversationGetterFactory
>;

export interface ConversationManager {
  save: ConversationSaver;
  getAll: ConversationsGetter;
}

export const ConversationManagerFactory = (
  Conversation: typeof TelegramConversationModel,
  logger: Logger
): ConversationManager => {
  return {
    save: (conversationId: number) =>
      ConversationSaverFactory(Conversation, logger, conversationId),
    getAll: () => ConversationGetterFactory(Conversation, logger),
  };
};
