const Redis = require("ioredis");
// const logger = require("./logger");
const config = require("../app/config");


class RedisClient {
  constructor() {
    this.config = {
      host: config.REDIS_HOST || "127.0.0.1",
      port: config.REDIS_PORT || 6379,
      password: config.REDIS_PASSWORD || "",
      db: config.REDIS_DB || 0,
      maxRetries: config.REDIS_MAX_RETRIES || 3,
      connectTimeout: config.REDIS_TIMEOUT || 5000,
      ...config
    };

    this.client = this._createClient();
    this._bindEvents();
  }

  _createClient() {
    return new Redis({
      ...this.config,
      retryStrategy: (times) => this._retryStrategy(times), // 自动重试策略（最大次数、间隔时间）
      enableOfflineQueue: false, // 禁用离线队列，防止掉线时积压请求
      showFriendlyErrorStack: true, // 显示更友好的错误堆栈
    });
  }

  _retryStrategy(times) {
    // 第 n 次重试会延迟 n * 1000 ms，最多 10 秒
    // 超过最大重试次数后放弃重试
    if (times > this.config.maxRetries) {
      return false;
    }
    return Math.min(times * 1000, 10000);
  }

  _bindEvents() {
    this.client.on("connect", () => {
      // logger.info("Redis 连接已建立");
    });

    this.client.on("error", (err) => {
      // logger.error(`Redis 错误: ${err.message}`);
    });

    this.client.on("reconnecting", (delay) => {
      // logger.warn(`Redis 重新连接中... ${delay}ms后尝试`);
    });

    this.client.on("end", () => {
      // logger.warn("Redis 连接已关闭");
    });
  }

  _safeSerialize(data) {
    // 避免非 JSON 对象导致程序崩溃
    try {
      return JSON.stringify(data);
    } catch (err) {
      throw new Error("数据序列化失败");
    }
  }

  _safeParse(data) {
    // 避免非 JSON 对象导致程序崩溃
    if (data === null) return null;
    try {
      return JSON.parse(data);
    } catch (err) {
      return null;
    }
  }

  /**
   * 设置缓存（带版本控制）
   */
  async set(key, value, ttl) {
    if (!key || typeof key !== "string") {
      // throw new Error("无效的键值格式");
      console.log("redis set 失败，无效的键值格式");
      return false;
    }
    if (ttl !== undefined && (typeof ttl !== "number" || ttl <= 0)) {
      // throw new Error("TTL 必须是一个正整数");
      console.log("redis set 失败，TTL 必须是一个正整数");
      return false;
    }

    const maxRetries = 3;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        // 获取当前版本号
        const versionKey = `${key}:_version`;
        const results = await this.client.mget(key, versionKey);
        const currentVersion = results[1] ? parseInt(results[1], 10) : 0;

        const serialized = this._safeSerialize(value);

        /*
            构造 Lua 脚本 保证原子操作：
              如果当前版本不匹配，说明数据被修改过，不执行写入。
                否则：写入 value、设置 TTL、INCR 版本号。
        */
        const luaScript = `
          local key = KEYS[1]
          local versionKey = KEYS[2]
          local value = ARGV[1]
          local ttl = ARGV[2]
          local expectedVersion = tonumber(ARGV[3])

          -- 获取当前版本号（若版本键不存在则返回 0）
          local currentVersion = tonumber(redis.call("GET", versionKey) or 0)
          if currentVersion ~= expectedVersion then
            return 0  -- 版本不匹配，拒绝写入
          end

          -- 写入数据键
          if tonumber(ttl) > 0 then
            redis.call("SET", key, value, "EX", ttl)
          else
            redis.call("SET", key, value)
          end

          -- 更新版本键（若不存在则创建）
          redis.call("INCR", versionKey)
          redis.call("PERSIST", versionKey)

          return 1
        `;

        const result = await this.client.eval(
          luaScript,
          2,
          key,
          versionKey,
          serialized,
          ttl || 0,
          currentVersion
        );
        if (result === 1) return true;
        retries++;
        await new Promise(resolve => setTimeout(resolve, 100 * retries));
      } catch (err) {
        // 重试机制：最多重试 3 次，每次延迟等待增长。
        retries++;
        if (retries >= maxRetries) {
          // logger.error(`Redis 设置缓存失败: ${key}`, { error: err });
          return false;
        }
        await new Promise(resolve => setTimeout(resolve, 100 * retries));
      }
    }
    return false;
  }

  /**
   * 获取缓存值和版本号
   */
  async get(key) {
    if (!key || typeof key !== "string") {
      throw new Error("无效的键值格式");
    }

    try {
      // 获取缓存值和版本号（一起取，避免多次请求）
      const versionKey = `${key}:_version`;
      const results = await this.client.mget(key, versionKey);
      
      return this._safeParse(results[0])
    } catch (err) {
      return null;
    }
  }

  /*
     解决方案：版本键动态过期策略
                核心思路
                  删除操作时，保留版本键但设置较短过期时间：

                  删除数据键后，版本键保留并设置 TTL（如 5 分钟）。

                  若数据短期内被重新写入，版本键的 TTL 会被覆盖；若未被使用，版本键自动过期清理。

                  写入操作时处理残留版本键：

                  若数据键不存在但版本键存在，需匹配版本号写入（防止旧值回写）。

                  若版本键已过期，则视为首次写入，重置版本号为 0。
   */
  async del(keys) {
    if (!keys || (Array.isArray(keys) && keys.length === 0)) return 0;

    const keysArray = Array.isArray(keys) ? keys : [keys];
    let deletedCount = 0;
    const maxRetries = 3;

    for (const key of keysArray) {
      let retries = 0;
      while (retries < maxRetries) {
        try {
          const luaScript = `
            local key = KEYS[1]
            local versionKey = KEYS[2]
            local ttl = ARGV[1]  -- 版本键保留时间（如 300 秒）

            -- 删除数据键，保留版本键并递增版本号
            redis.call("DEL", key)
            redis.call("INCR", versionKey)
            redis.call("EXPIRE", versionKey, ttl)
            return 1
          `;

          const result = await this.client.eval(
            luaScript,
            2,
            key,
            `${key}:_version`,
            300
          );

          if (result >= 0) {
            deletedCount += result;
            break;
          }
        } catch (err) {
          retries++;
          if (retries >= maxRetries) {
            // logger.error(`Redis 删除失败: ${key}`, { error: err });
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 100 * retries));
        }
      }
    }
    return deletedCount;
  }

  async disconnect() {
    try {
      await this.client.quit();
    } catch (err) {
      // logger.error("Redis 关闭连接失败", { error: err });
    }
  }
}

module.exports = new RedisClient();