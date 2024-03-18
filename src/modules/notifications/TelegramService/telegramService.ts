import { Telegraf } from "telegraf";
import { Logger } from "pino";
import TelegramConversationModel from "../../../models/telegram.model";

import { ConversationSaver } from "./conversationManager";

export const instantiateBot =
  (logger: Logger) => (botToken: string | undefined) => {
    logger.trace("Preparing to instantiate telegram bot");
    if (!botToken) {
      logger.error(
        "Failed to instantiate telegram bot because bot token was not provided"
      );
      throw new Error("Telegram token is not provided");
    }
    const telegraf = new Telegraf(botToken);
    logger.info("Telegram bot instantiated properly");
    return telegraf;
  };

export const botStarter =
  (logger: Logger, saver: ConversationSaver) => (bot: Telegraf) => {
    logger.trace("Preparing to start the bot");
    bot.start(async (ctx) => {
      logger.trace("Somebody registered to bot");
      const conversationId = ctx.message.from.id;
      logger.info(`Conversation with ${conversationId} registered to bot`);
      try {
        const save = saver(conversationId);
        await save();
        await ctx.reply("Welcome to the keeper manager bot!");
        logger.info(`Sent the welcome message`);
      } catch (err) {
        logger.error(
          "Something went wrong while registering the conversation."
        );
        throw err;
      }
    });
  };
