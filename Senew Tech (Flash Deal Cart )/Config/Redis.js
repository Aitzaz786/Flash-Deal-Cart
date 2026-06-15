import Redis from "ioredis";

let redisClient = null;

export const getRedis = () => {
  if (!redisClient) {
    if (!process.env.UPSTASH_REDIS_URL) {
      throw new Error("UPSTASH_REDIS_URL is not defined in environment variables");
    }

    redisClient = new Redis(process.env.UPSTASH_REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy(times) {
        if (times > 5) return null;
        return Math.min(times * 200, 2000);
      },
    });

    redisClient.on("error", (err) => {
      console.error("Redis connection error:", err.message);
    });

    redisClient.on("connect", () => {
      console.log("Redis connected successfully");
    });
  }

  return redisClient;
};

export const connectRedis = async () => {
  const redis = getRedis();
  await redis.ping();
  return redis;
};
