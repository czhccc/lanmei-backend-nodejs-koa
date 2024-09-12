const AdminService = require('../services/admin.service')

const errorTypes = require('../constants/error-types')

const encryptPasswordUtil = require('../utils/encrypt-password-util')

const {
  DEFAULT_PASSWORD
} = require('../app/config.js')

// 验证参数
const verifyAdminCreateOrUpdateParams = async (ctx, next) => {
  const params = ctx.request.body

  if (!params.phone || !params.name || !params.role) {
    throw new Error(errorTypes.NECESSARY_PARAM_IS_NULL)
  }
  if (!params.password && !params.id) {
    params.password = DEFAULT_PASSWORD
  }

  const adminByPhone = await AdminService.queryAdminByPhone(params)
  if (!params.id && adminByPhone.length!==0) { // 新增
    throw new Error('手机号已存在')
  }

  await next()
}

// 密码加密
const encryptPassword = async (ctx, next) => {
  let { password } = ctx.request.body
  if (password) {
    ctx.request.body.password = encryptPasswordUtil(password)
  }

  await next()
}

module.exports = {
  verifyAdminCreateOrUpdateParams,
  encryptPassword
}