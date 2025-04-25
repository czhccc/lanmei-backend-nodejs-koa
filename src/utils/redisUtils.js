const Redis = require("ioredis");

const config = require("../app/config");

const logger = require("./logger");

const customError = require("./customError");

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
      logger.info('redis', "RedisUtils 连接已建立");
    });

    this.client.on("error", (error) => {
      logger.error('redis', `RedisUtils 错误`, { error });
    });

    this.client.on("reconnecting", (delay) => {
      logger.warn('redis', `RedisUtils 重新连接`);
    });

    this.client.on("end", () => {
      logger.warn('redis', "RedisUtils 连接已关闭");
    });
  }

  _safeSerialize(data) {
    // 避免非 JSON 对象导致程序崩溃
    try {
      return JSON.stringify(data);
    } catch (error) {
      logger.error('redis', "RedisUtils _safeSerialize 失败", { error });
      throw new customError.InternalError("RedisUtils _safeSerialize 失败");
    }
  }

  _safeParse(data) {
    // 避免非 JSON 对象导致程序崩溃
    if (data === null) return null;
    try {
      return JSON.parse(data);
    } catch (error) {
      logger.error('redis', "RedisUtils _safeParse 失败", { error });
      return null;
    }
  }

  /**
   * 设置缓存（带版本控制）
   */
  async setWithVersion(key, value, ttl) {
    if (!key || typeof key !== "string") {
      logger.error('redis', "RedisUtils setWithVersion 无效的键值格式", { key });
      return false;
    }
    if (ttl !== undefined && (typeof ttl !== "number" || ttl <= 0)) {
      logger.error('redis', "RedisUtils setWithVersion 无效的过期时间", { ttl });
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
        if (result === 1) {
          // logger.info('redis', `RedisUtils setWithVersion 成功`, { key, value, ttl });

          return true;
        }

        retries++;
        await new Promise(resolve => setTimeout(resolve, 100 * retries));
      } catch (error) {
        // 重试机制：最多重试 3 次，每次延迟等待增长。
        logger.error('redis', `RedisUtils setWithVersion 失败 尝试重试`)
        retries++;
        if (retries >= maxRetries) {
          logger.error('redis', `RedisUtils setWithVersion 失败 超出最大重连次数`, { 
            error,
            key,
            value,
            ttl,
          });
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
  async getWithVersion(key) {
    if (!key || typeof key !== "string") {
      logger.error('redis', "RedisUtils getWithVersion 无效的键值格式", { key });
      throw new customError.InternalError("key", "无效的键值格式");
    }

    try {
      // 获取缓存值和版本号（一起取，避免多次请求）
      // const versionKey = `${key}:_version`;
      // const results = await this.client.mget(key, versionKey);
      // return this._safeParse(results[0])

      const result = await this.client.get(key); // 只取主 key 的值
      return this._safeParse(result);
    } catch (error) {
      logger.error('redis', `RedisUtils getWithVersion 失败`, { key, error });
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
  async delWithVersion(keys) {
    if (!keys || (typeof keys !== "string" && !Array.isArray(keys))) {
      logger.error('redis', "RedisUtils delWithVersion 无效的键值格式", { keys });
      return false;
    }
    if (Array.isArray(keys) && keys.length === 0) {
      logger.info('redis', "RedisUtils delWithVersion keys为空")
      return 0; // 空数组直接返回成功
    }

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
            // logger.info('redis', `RedisUtils delWithVersion 成功`, { key });
            break;
          }
        } catch (error) {
          retries++;
          if (retries >= maxRetries) {
            logger.error('redis', `RedisUtils delWithVersion 失败`, { key, error });
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 100 * retries));
        }
      }
    }
    return deletedCount;
  }

  /**
 * 原子性增加指定键的值（带版本控制，保持原TTL）
 * @param {string} key - 键名
 * @param {number} delta - 增量值（必须为非零数值）
 * @returns {Promise<{ success: boolean, value: number | null }>} - 操作结果和新值
 */
  async incrWithVersion(key, delta) {
    if (!key || typeof key !== "string") {
        logger.error('redis', "RedisUtils incrWithVersion 无效的键值格式", { key });
        return { success: false, value: null };
    }
    if (typeof delta !== "number" || isNaN(delta) || delta === 0) {
        logger.error('redis', "RedisUtils incrWithVersion 无效的delta值", { delta });
        return { success: false, value: null };
    }

    const maxRetries = this.config.maxRetries || 3;
    let retries = 0;

    while (retries < maxRetries) {
        try {
            const versionKey = `${key}:_version`;
            // 获取当前值和版本号
            const results = await this.client.mget(key, versionKey);
            const currentValue = results[0] !== null ? parseInt(results[0], 10) : null;
            const currentVersion = results[1] !== null ? parseInt(results[1], 10) : 0;

            // 若键不存在，直接返回失败（需先调用 setWithVersion 初始化）
            if (currentValue === null) {
                logger.error('redis', `RedisUtils incrWithVersion 键不存在`, { key });
                return { success: false, value: null };
            }

            const luaScript = `
                local key = KEYS[1]
                local versionKey = KEYS[2]
                local delta = tonumber(ARGV[1])
                local expectedVersion = tonumber(ARGV[2])

                -- 检查键是否存在（防止未初始化）
                if redis.call("EXISTS", key) == 0 then
                    return {0, nil}
                end

                -- 获取当前版本号
                local currentVersion = tonumber(redis.call("GET", versionKey) or 0)
                if currentVersion ~= expectedVersion then
                    return {0, nil}  -- 版本不匹配，拒绝操作
                end

                -- 获取当前TTL
                local ttl = redis.call("TTL", key)

                -- 执行增减操作
                local newValue = redis.call("INCRBY", key, delta)

                -- 更新版本号
                redis.call("INCR", versionKey)

                -- 保留原TTL（若存在）
                if ttl > 0 then
                    redis.call("EXPIRE", key, ttl)
                end

                return {1, newValue}
            `;

            const result = await this.client.eval(
                luaScript,
                2,
                key,
                versionKey,
                delta,
                currentVersion
            );

            if (result[0] === 1) {
                return { success: true, value: result[1] };
            } else {
                retries++;
                await new Promise(resolve => setTimeout(resolve, retries * 100));
            }
        } catch (error) {
            logger.error('redis', `RedisUtils incrWithVersion 失败`, { key, delta, error });
            retries++;
            if (retries >= maxRetries) {
                return { success: false, value: null };
            }
            await new Promise(resolve => setTimeout(resolve, retries * 100));
        }
    }
    return { success: false, value: null };
  }

  /**
  * 原子性减少指定键的值（带版本控制，保持原TTL）
  */
  async decrWithVersion(key, delta) {
    if (typeof delta !== "number" || delta <= 0) {
        logger.error('redis', "RedisUtils decrWithVersion 无效的delta值", { delta });
        return { success: false, value: null };
    }
    return this.incrWithVersion(key, -delta);
  }








  // ========================================= simple =========================================
  /**
   * 不带版本号的get
   */
  async getSimply(key) {
    if (!key || typeof key !== "string") {
      throw new customError.InternalError('RedisUtils getSimply 无效的键值格式');
    }

    try {
      const result = await this.client.get(key); // 只取主 key 的值
      return this._safeParse(result);
    } catch (error) {
      logger.error('redis', `RedisUtils getSimply 失败`, { key, error });
      return null;
    }
  }
  /**
   * 不带版本号的set
   */ 
  async setSimply(key, value, ttl) {
    if (!key || typeof key !== "string") {
      logger.error('redis', "RedisUtils setSimply 失败，无效的键值格式", { key });
      return false;
    }
    if (ttl !== undefined && (typeof ttl !== "number" || ttl <= 0)) {
      logger.error('redis', "RedisUtils setSimply 失败，无效的过期时间", { ttl });W
      return false;
    }

    const serialized = this._safeSerialize(value);

    try {
      if (ttl) {
        await this.client.set(key, serialized, "EX", ttl);
      } else {
        await this.client.set(key, serialized);
      }
      return true;
    } catch (error) {
      logger.error('redis', `RedisUtils setSimply 失败`, { key, value, ttl, error });
      return false;
    }
  }
  /**
   * 不带版本号的删除
   */ 
  async delSimply(keys) {
    if (!keys || (typeof keys !== "string" && !Array.isArray(keys))) {
      logger.error('redis', "RedisUtils delSimply 失败，无效的键值格式", { keys });
      return false;
    }
    if (Array.isArray(keys) && keys.length === 0) {
      logger.info('redis', "RedisUtils delWithVersion keys为空")
      return 0; // 空数组直接返回成功
    }

    // 统一转成数组
    const keysArray = Array.isArray(keys) ? keys : [keys];

    try {
      await this.client.del(...keysArray); // 支持批量删除
      return true;
    } catch (error) {
      logger.error('redis', "RedisUtils delSimply 失败", { keys: keysArray, error });
      return false;
    }
  }

  /**
   * 判断一个或多个 Redis key 是否存在
   * @param {string | string[]} keys - 单个 key 或 key 数组
   * @returns {Promise<boolean | boolean[]>} - 如果是单个 key，返回 boolean；如果是数组，返回每个 key 是否存在的 boolean 数组
   */
  async keyExists(keys) {
    if (!keys || (typeof keys !== "string" && !Array.isArray(keys))) {
      logger.error('redis', "RedisUtils keyExists 失败，无效的键值格式", { keys });
      throw new customError.InternalError("keys", "无效的键值格式");
    }
  
    // 单个 key 的情况
    if (typeof keys === "string") {
      const exists = await this.client.exists(keys);
      return exists === 1;
    }
  
    // 多个 key 的情况（数组）
    if (Array.isArray(keys)) {
      const results = await Promise.all(keys.map(k => this.client.exists(k)));
      return results.map(res => res === 1);
    }
  }

  async disconnect() {
    try {
      await this.client.quit();
    } catch (error) {
      logger.error('redis', "RedisUtils disconnect 失败", { error });
    }
  }
}

module.exports = new RedisClient();