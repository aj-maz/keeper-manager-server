import * as redis from "redis";

class AnalyticsService {
  redisClient: ReturnType<typeof redis.createClient> | undefined;

  constructor() {
    this.init();
  }

  async init() {
    const client = redis.createClient({
      url: `${process.env.REDIS_PROTOCOL}://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
    });
    await client.connect();
    this.redisClient = client;
    this.startFetchig();
  }

  isReady() {
    return !!this.redisClient;
  }

  startFetchig() {}

  async getSafes() {
    const client = this.redisClient;
    if (!client) return [];
    const keys = await client.KEYS("safe:*");
    const allSafeData = await Promise.all(
      keys.map(async (key) => {
        const data = await client.hGetAll(key);
        return data;
      })
    );

    return allSafeData;
  }
}

export default AnalyticsService;
