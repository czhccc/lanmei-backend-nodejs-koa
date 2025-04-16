const customError = require('../utils/customError')

module.exports = async (ctx, next) => {
  if (!ctx.request.query.pageNo) {
    throw new customError.MissingParameterError('pageNo')
  }
  if (!ctx.request.query.pageSize) {
    throw new customError.MissingParameterError('pageSize')
  }
  
  await next()

  ctx.body = {
    pageNo: ctx.request.query.pageNo,
    pageSize: ctx.request.query.pageSize,
    total: ctx.body.total,
    records: ctx.body.records,
  }
}