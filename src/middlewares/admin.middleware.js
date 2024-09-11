const AdminService = require('../services/admin.service')

const errorTypes = require('../constants/error-types')

const encryptPasswordUtil = require('../utils/encrypt-password-util')

// 验证参数
const verifyAdminCreateParams = async (ctx, next) => {
  const params = ctx.request.body

  console.log('admin Params', params)

  // 判断 手机号、密码、名字、角色 不为空
  if (!params.phone || !params.password) {
    throw new Error(errorTypes.NECESSARY_PARAM_IS_NULL)
  }

  // 判断手机号是否重复
  const adminByPhone = await AdminService.queryAdminByPhoneOrName(params)
  if (adminByPhone.length > 0) {
    throw new Error('手机号重复')
  }

  await next()
}

// 密码加密
const encryptPassword = async (ctx, next) => {
  console.log('0000000000000000000000000000000000000');
  let { password } = ctx.request.body
  ctx.request.body.password = encryptPasswordUtil(password)

  await next()
}

module.exports = {
  verifyAdminCreateParams,
  encryptPassword
}