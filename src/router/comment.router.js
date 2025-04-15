const Router = require('koa-router')

const CommentController = require('../controllers/comment.controller')

const {
  verifyToken
} = require('../middlewares/auth.middleware')

const tableResponseHandler = require('../middlewares/table-response-handler');

const commentRouter = new Router({prefix: '/comment'})
commentRouter.post('/', verifyToken, CommentController.comment)

commentRouter.get('/getCommentList', verifyToken, tableResponseHandler, CommentController.getCommentList)

commentRouter.post('/response', verifyToken, CommentController.response)

commentRouter.get('/getCommentDetailById', verifyToken, CommentController.getCommentDetailById)

commentRouter.get('/getCommentListByWechat', verifyToken, CommentController.getCommentListByWechat)

commentRouter.get('/getUserComments', verifyToken, CommentController.getUserComments)

module.exports = commentRouter