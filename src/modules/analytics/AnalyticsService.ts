import * as redis from "redis";
import parentLogger from "../../lib/logger";

const logger = parentLogger.child({
  module: "analytics-service",
});

class AnalyticsService {
  redisClient: ReturnType<typeof redis.createClient> | undefined;

  constructor() {
    logger.trace("Constructing analytics server", {
      method: "constructor",
    });
    logger.debug("Preparing to init the analytics server", {
      method: "constructor",
    });
    this.init();
  }

  async init() {
    logger.trace("Initating the analytics server", {
      method: "init",
    });
    try {
      const redisUrl = `${process.env.REDIS_PROTOCOL}://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;
      logger.debug("Creating a redis client", {
        redisUrl,
        method: "init",
      });
      const client = redis.createClient({
        url: redisUrl,
      });
      logger.debug("Redis client created", {
        redisUrl,
        method: "init",
      });
      await client.connect();
      logger.info("Redis client connected", {
        redisUrl,
        method: "init",
      });
      this.redisClient = client;
      logger.debug("Redis client assigned to the analytics server", {
        redisUrl,
        method: "init",
      });
    } catch (err) {
      logger.error("Failed to handle redis client in the analytics server", {
        error: err,
      });
      throw err;
    }
  }

  isReady() {
    const isReady = !!this.redisClient;
    logger.debug("Checking if the redis client is ready", {
      method: "isReady",
      isReady,
    });
    return isReady;
  }

  async getSafes() {
    logger.trace("Getting safes from analytics server", {
      method: "getSafes",
    });
    const client = this.redisClient;

    if (!client) {
      logger.debug(
        "No client has been assigned to the analytics server so returning empty array",
        {
          method: "getSafes",
        }
      );
      return [];
    }

    try {
      const targetKeys = "safe:*";

      logger.debug("Getting keys from the redis client", {
        method: "getSafes",
      });
      const keys = await client.KEYS(targetKeys);
      logger.debug("Getting keys from the redis client", {
        method: "getSafes",
      });
      const allSafeData = await Promise.all(
        keys.map(async (key) => {
          const data = await client.hGetAll(key);
          return data;
        })
      );
      logger.debug("Got all safe data", {
        method: "getSafes",
      });
      return allSafeData;
    } catch (err) {
      logger.error("Something goes wrong while getting the safes", {
        method: "getSafes",
      });
    }
  }
}

export default AnalyticsService;
