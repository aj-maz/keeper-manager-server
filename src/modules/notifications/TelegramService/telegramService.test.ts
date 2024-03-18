import { Logger } from "pino";
import { instantiateBot } from "./telegramService";

// Mock Logger
const mockLogger: Logger = {
  trace: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
} as any;

class Telegraf {
  constructor(token: string) {
    // Mock implementation if needed
  }
}

// Mock Telegraf class
jest.mock("telegraf", () => ({
  Telegraf: jest.fn((token: string) => new Telegraf(token)),
}));

describe("instantiateBot", () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });
  it("should instantiate telegram bot properly when bot token is provided", () => {
    const botToken = "valid_bot_token";
    const telegrafInstance = instantiateBot(mockLogger)(botToken);

    expect(mockLogger.trace).toHaveBeenCalledWith(
      "Preparing to instantiate telegram bot"
    );
    expect(telegrafInstance).toBeInstanceOf(Telegraf);
    expect(mockLogger.info).toHaveBeenCalledWith(
      "Telegram bot instantiated properly"
    );
  });

  it("should throw an error when bot token is not provided", () => {
    const botToken: string | undefined = undefined;

    expect(() => instantiateBot(mockLogger)(botToken)).toThrow(
      "Telegram token is not provided"
    );

    expect(mockLogger.error).toHaveBeenCalledWith(
      "Failed to instantiate telegram bot because bot token was not provided"
    );
  });
});
