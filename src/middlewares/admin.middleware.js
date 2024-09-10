const AdminService = require('../services/admin.service')

const errorTypes = require('../constants/error-types')

const encryptPasswordUtil = require('../utils/encryptPasswordUtil')

// 验证参数
const verifyAdminCreateParams = async (ctx, next) => {
  const params = ctx.request.body

  console.log('admin Params', params)

  // 判断 手机号、密码、名字、角色 不为空
  if (!params.phone || !params.password) {
    const error = new Error(errorTypes.NECESSARY_PARAM_IS_NULL)
    return ctx.app.emit('error', error, ctx)
  }

  // 判断手机号是否重复
  const adminByPhone = await AdminService.getAdminByPhone(params.phone)
  if (adminByPhone.length > 0) {
    const error = new Error(errorTypes.UNIQUE_FIELD_DUPLICATE)
    return ctx.app.emit('error', error, ctx)
  }

  await next()
}

// 密码加密
const encryptPassword = async (ctx, next) => {
  let { password } = ctx.request.body
  ctx.request.body.password = encryptPasswordUtil(password)

  await next()
}

module.exports = {
  verifyAdminCreateParams,
  encryptPassword
}