const service = require('../services/comment.service')

class CommentController {
  async comment(ctx, next) {
    const params = ctx.request.body

    const result = await service.comment(params)

    ctx.body = '评论成功'
  }

  async getCommentList(ctx, next) {
    const params = ctx.request.query
    
    const result = await service.getCommentList(params)

    ctx.body = result
  }

  async response(ctx, next) {
    const params = ctx.request.body
    
    const result = await service.response(params)

    ctx.body = '回复成功'
  }
}

module.exports = new CommentController()