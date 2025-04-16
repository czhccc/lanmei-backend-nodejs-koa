const service = require('../services/comment.service')

const customError = require('../utils/customError')

class CommentController {
  async comment(ctx, next) {
    const params = ctx.request.body
    params.author = ctx.theUser.phone

    const { comment } = params;
    if (!comment) {
      throw new customError.MissingParameterError('comment')
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
      throw new customError.MissingParameterError('commentId')
    }
    if (!response) {
      throw new customError.MissingParameterError('response')
    }
    if (!author) {
      throw new customError.MissingParameterError('author')
    }
    
    const result = await service.response(params)

    ctx.body = result
  }

  async getCommentDetailById(ctx, next) {
    const params = ctx.request.query

    const { commentId } = params;
    if (!commentId) {
      throw new customError.MissingParameterError('commentId')
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

    const { author } = params
    if (!author) {
      throw new customError.MissingParameterError('author')
    }
    
    const result = await service.getUserComments(params)

    ctx.body = result
  }
}

module.exports = new CommentController()