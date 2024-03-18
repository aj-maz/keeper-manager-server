import { Logger } from "pino";
import { mocked } from "jest-mock";

import { saveConversation, getConversations } from "./conversationManager";

// Mock Logger
const mockLogger: Logger = {
  trace: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
} as any;

const mockFindOne = jest.fn();
const mockCreate = jest.fn();
const mockFind = jest.fn();

jest.mock("../../../models/telegram.model", () => ({
  __esModule: true,
  default: {
    find: mockFind,
    findOne: mockFindOne,
    create: mockCreate,
  },
}));

describe("saveConversation", () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it("should return existing conversation if found", async () => {
    const TelegramConversationModel =
      require("../../../models/telegram.model").default;

    const conversationId = 123;
    mockFindOne.mockResolvedValue({ conversationId });

    const result = await saveConversation(
      TelegramConversationModel,
      mockLogger
    )(conversationId);

    expect(mockLogger.trace).toHaveBeenCalledWith(
      `Preparing to save telegram conversation: ${conversationId}`
    );
    expect(mockLogger.debug).toHaveBeenCalledWith(
      `Attempting to find a telegram conversation: ${conversationId}`
    );
    expect(mockLogger.info).toHaveBeenCalledWith(
      `Telegram conversation already existed: ${conversationId}`
    );
    expect(mockLogger.debug).not.toHaveBeenCalledWith(
      `Attempting to create a new telegram conversation: ${conversationId}`
    );
    expect(mockLogger.error).not.toHaveBeenCalled();
    expect(result).toEqual({ conversationId });
  });

  it("should create new conversation if not found", async () => {
    const TelegramConversationModel =
      require("../../../models/telegram.model").default;

    const conversationId = 124;
    mockFindOne.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ conversationId });

    const result = await saveConversation(
      TelegramConversationModel,
      mockLogger
    )(conversationId);

    expect(mockLogger.trace).toHaveBeenCalledWith(
      `Preparing to save telegram conversation: ${conversationId}`
    );
    expect(mockLogger.debug).toHaveBeenCalledWith(
      `Attempting to find a telegram conversation: ${conversationId}`
    );
    // Ensure that "Attempting to create a new conversation" is called after "Attempting to find a conversation"
    expect(mockLogger.debug).toHaveBeenNthCalledWith(
      2,
      `Attempting to create a new telegram conversation: ${conversationId}`
    );
    expect(mockLogger.info).toHaveBeenCalledWith(
      `Created a new telegram conversation: ${conversationId}`
    );
    expect(mockLogger.error).not.toHaveBeenCalled();
    expect(result).toEqual({ conversationId });
  });

  it("should handle error while saving conversation", async () => {
    const TelegramConversationModel =
      require("../../../models/telegram.model").default;

    const conversationId = 125;
    const error = new Error("Database error");
    mockFindOne.mockResolvedValue(null);
    mockCreate.mockRejectedValue(error);

    await expect(
      saveConversation(TelegramConversationModel, mockLogger)(conversationId)
    ).rejects.toThrow(error);

    expect(mockLogger.trace).toHaveBeenCalledWith(
      `Preparing to save telegram conversation: ${conversationId}`
    );
    expect(mockLogger.debug).toHaveBeenCalledWith(
      `Attempting to find a telegram conversation: ${conversationId}`
    );
    expect(mockLogger.debug).toHaveBeenCalledWith(
      `Attempting to create a new telegram conversation: ${conversationId}`
    );

    expect(mockLogger.info).not.toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalledWith(
      `Error in creating a new telegram conversation: ${conversationId}`,
      { error }
    );
  });
});

describe("getConversations", () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it("should get all saved telegram conversations", async () => {
    const TelegramConversationModel =
      require("../../../models/telegram.model").default;

    const conversations = [{ conversationId: 123 }, { conversationId: 124 }];
    mockFind.mockResolvedValue(conversations);

    await getConversations(TelegramConversationModel, mockLogger);

    expect(mockLogger.trace).toHaveBeenCalledWith(
      "Preparing to get all saved telegram conversation"
    );
    expect(mockLogger.debug).toHaveBeenCalledWith(
      "Preparing to get all saved telegram conversation"
    );
    expect(mockLogger.info).toHaveBeenCalledWith(
      "Got 2 telegram conversations",
      {
        conversationIds: [123, 124],
      }
    );
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it("should handle error while getting telegram conversations", async () => {
    const TelegramConversationModel =
      require("../../../models/telegram.model").default;

    const error = new Error("Database error");
    mockFind.mockRejectedValue(error);

    await expect(
      getConversations(TelegramConversationModel, mockLogger)
    ).rejects.toThrow(error);

    expect(mockLogger.trace).toHaveBeenCalledWith(
      "Preparing to get all saved telegram conversation"
    );
    expect(mockLogger.debug).toHaveBeenCalledWith(
      "Preparing to get all saved telegram conversation"
    );
    expect(mockLogger.info).not.toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalledWith(
      "Error in getting the telegram conversations",
      { error }
    );
  });
});
