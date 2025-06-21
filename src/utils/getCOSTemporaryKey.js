// 生成云存储临时密钥
const STS = require('qcloud-cos-sts');
const dayjs = require('dayjs');
const crypto = require('crypto');
const redisUtils = require('./redisUtils');

const { COS_TemporaryKey_TTL } = require('../app/config');

// 配置永久密钥（从环境变量获取）
const config = {
  
};

// 生成临时密钥
const getCOSTemporaryKey = async (token) => {
  try {
    const result = await STS.getCredential({
      secretId: config.secretId,
      secretKey: config.secretKey,
      durationSeconds: config.durationSeconds,
      policy: config.policy
    });

    const temporaryKey = {
      tmpSecretId: result.credentials.tmpSecretId,
      tmpSecretKey: result.credentials.tmpSecretKey,
      sessionToken: result.credentials.sessionToken,
      expiredTime: dayjs.unix(result.expiredTime).format('YYYY-MM-DD HH:mm:ss'),
    }
    
    // 保存到redis
    const tokenHASH = crypto.createHash('sha256').update(token).digest('hex')
    await redisUtils.setSimply(`COSTemporaryKey:token:${tokenHASH}`, temporaryKey, COS_TemporaryKey_TTL)

    return temporaryKey
  } catch (err) {
    throw new Error(`STS请求失败: ${err.message}`);
  }
};

module.exports = getCOSTemporaryKey