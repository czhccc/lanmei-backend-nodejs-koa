// 获取云存储临时密钥
const STS = require('qcloud-cos-sts');
const dayjs = require('dayjs');
const crypto = require('crypto');
const redisUtils = require('./redisUtils');

const { 
  COS_secretId,
  COS_secretKey,
  COS_resource,
} = require('../app/config');

// 配置永久密钥（从环境变量获取）
const config = {
  secretId: COS_secretId,  // 子账号SecretId
  secretKey: COS_secretKey, // 子账号SecretKey
  durationSeconds: 3600, // 临时密钥有效期(秒)
  policy: {
    version: '2.0',
    statement: [{
      effect: 'allow',
      action: [
        'cos:PutObject',      // 只允许上传
        'cos:GetObject'       // 可选：允许读取
      ],
      resource: [
        COS_resource
        // 替换为你的存储桶ARN:cite[4]
      ]
    }]
  }
};

// 生成临时密钥
const getCOSTemporaryKey = async (token) => {
  try {
    const tokenHASH = crypto.createHash('sha256').update(token).digest('hex');
    const redisKey = `COSTemporaryKey:token:${tokenHASH}`;
    
    // 检查Redis中是否有有效的临时密钥
    const redisTemporaryKey = await redisUtils.getSimply(redisKey);
    
    // 定义最小剩余有效期
    const MIN_REMAINING_TIME = 60 * 10; // 10分钟 
    
    if (redisTemporaryKey) {
      const expiredTime = dayjs(redisTemporaryKey.expiredTimeFormatted, 'YYYY-MM-DD HH:mm:ss');
      const remainingTime = expiredTime.diff(dayjs(), 'second');
      
      // 如果剩余时间大于5分钟，直接返回
      if (remainingTime > MIN_REMAINING_TIME) {
        return {
          ...redisTemporaryKey,
          source: 'redis-cached'
        };
      }
    }
    // 申请新的临时密钥
    const resResult = await STS.getCredential({
      secretId: config.secretId,
      secretKey: config.secretKey,
      durationSeconds: config.durationSeconds,
      policy: config.policy
    });
  
    const expiredTimeFormatted = dayjs.unix(resResult.expiredTime).format('YYYY-MM-DD HH:mm:ss'); // 格式化过期时间
    
    const credentials = {
      tmpSecretId: resResult.credentials.tmpSecretId,
      tmpSecretKey: resResult.credentials.tmpSecretKey,
      sessionToken: resResult.credentials.sessionToken,
      expiredTime: resResult.expiredTime,
      expiredTimeFormatted,
    };

    // 保存到redis（使用实际过期时间作为TTL）
    const actualTTL = resResult.expiredTime - dayjs().unix()
    await redisUtils.setSimply(redisKey, credentials, actualTTL);

    return {
      ...credentials,
      source: 'newly-generated'
    };
  } catch (err) {
    throw new Error(`STS请求失败: ${err.message}`);
  }
};

module.exports = getCOSTemporaryKey;