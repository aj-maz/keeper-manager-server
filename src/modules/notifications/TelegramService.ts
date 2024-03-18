import { Telegraf } from "telegraf";
import { Logger } from "pino";
import TelegramSubscribers from "../../models/telegram.model";

class TelegramService {
  private static instance: TelegramService | null = null;
  bot: Telegraf;

  private constructor() {
    const botToken = process.env.BOT_TOKEN;
    if (!botToken) {
      throw new Error("Telegram token is not provided");
    }
    this.bot = new Telegraf(botToken);

    this.bot.start(async (ctx) => {
      const conversationId = ctx.message.from.id;
      this.addTelegramSubscriber(conversationId);
      ctx.reply("Welcome!");
    });

    this.bot.launch();
  }

  static getInstance(): TelegramService {
    if (this.instance === null) {
      this.instance = new TelegramService();
    }
    return this.instance;
  }

  async getTelegramSubscribers() {
    return await TelegramSubscribers.find({});
  }

  async addTelegramSubscriber(conversationId: number) {
    const subscriber = await TelegramSubscribers.findOne({
      conversationId,
    });
    if (subscriber) {
      return subscriber;
    } else {
      const ts = new TelegramSubscribers({ conversationId });
      return ts.save();
    }
  }

  async sendMessage(message: string) {
    const subs = await this.getTelegramSubscribers();
    try {
      subs.forEach((sub) => {
        this.bot.telegram.sendMessage(Number(sub.conversationId), message);
      });
    } catch (err) {
      console.log(err);
    }
  }
}

export default TelegramService;
