const service = require('../services/comment.service')

class CommentController {
  async comment(ctx, next) {
    const params = ctx.request.body
    params.author = ctx.theUser.phone

    const { comment } = params;
    if (!comment) {
      throw new Error('缺少参数：comment')
    }

    const result = await service.comment(params)

    ctx.body = result
  }

  async getCommentList(ctx, next) {
    const params = ctx.request.query
    
    const result = await service.getCommentList(params)

    ctx.body = result
  }

  async response(ctx, next) {
    let params = ctx.request.body
    params.author = ctx.theUser.phone

    const { commentId, response, author } = params;
    if (!commentId) {
      throw new Error('缺少参数：commentId')
    }
    if (!response) {
      throw new Error('缺少参数：response')
    }
    if (!author) {
      throw new Error('缺少参数：author')
    }
    
    const result = await service.response(params)

    ctx.body = result
  }

  async getCommentDetailById(ctx, next) {
    const params = ctx.request.query

    const { commentId } = params;
    if (!commentId) {
      throw new Error('缺少参数：commentId')
    }
    
    const result = await service.getCommentDetailById(params)

    ctx.body = result
  }

  async getCommentListByWechat(ctx, next) {
    const params = ctx.request.query
    
    const result = await service.getCommentListByWechat(params)

    ctx.body = result
  }

  async getUserComments(ctx, next) {
    const params = ctx.request.query

    const { author, startTime, endTime } = params
    if (!author) {
      throw new Error('缺少参数：author')
    }
    
    const result = await service.getUserComments(params)

    ctx.body = result
  }
}

module.exports = new CommentController()