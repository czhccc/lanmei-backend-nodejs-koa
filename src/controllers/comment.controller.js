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
    let params = ctx.request.body
    params.author = ctx.theAdmin.name
    
    const result = await service.response(params)

    ctx.body = '回复成功'
  }

  async getCommentDetailById(ctx, next) {
    const params = ctx.request.query
    
    const result = await service.getCommentDetailById(params)

    ctx.body = result
  }
}

module.exports = new CommentController()