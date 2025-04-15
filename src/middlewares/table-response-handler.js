
module.exports = async (ctx, next) => {
  if (!ctx.request.query.pageNo) {
    throw new Error('无pageNo参数')
  }
  if (!ctx.request.query.pageSize) {
    throw new Error('无pageSize参数')
  }
  
  await next()

  ctx.body = {
    pageNo: ctx.request.query.pageNo,
    pageSize: ctx.request.query.pageSize,
    total: ctx.body.total,
    records: ctx.body.records,
  }
}