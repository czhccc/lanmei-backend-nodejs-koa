const routes = [
  {
    path: '/',
    redirect: '/home'  // 添加重定向，访问根路径时跳转到/home
  },
  {
    path: '/home',
    name: 'Home',
    component: () => import('../views/home/home.vue'),
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/login/login.vue'),
  },
  
]

const superadminMenu = [
  {
    name: '商品',
    children: [
      {
        name: '分类管理',
        path: '/category',
        component: 'category/category.vue'
      },
      {
        name: '商品管理',
        path: '/goods',
        component: 'goods/goods.vue'
      },
      {
        name: '商品详情',
        path: '/goodsDetail',
        component: 'goods/goodsDetail.vue',
        notInMenu: true,
      },
      {
        name: '历史批次',
        path: '/historyBatches',
        component: 'goods/historyBatches.vue',
        notInMenu: true,
      },
    ]
  },
  {
    name: '订单管理',
    path: '/orderList',
    component: 'order/orderList.vue'
  },
  {
    name: '订单详情',
    path: '/orderDetail',
    component: 'order/orderDetail.vue',
    notInMenu: true,
  },
  {
    name: '小程序',
    children: [
      {
        name: '首页商品推荐轮播',
        path: '/recommend',
        component: 'recommend/recommend.vue'
      },
      {
        name: '首页资讯',
        path: '/newsList',
        component: 'news/newsList.vue'
      },
      {
        name: '首页资讯详情',
        path: '/newsDetail',
        component: 'news/newsDetail.vue'
      },
      {
        name: '留言处理',
        path: '/comment',
        component: 'comment/commentList.vue'
      },
      {
        name: '首页通知',
        path: '/notify',
        component: 'notify/notify.vue'
      },
      {
        name: '卖家信息',
        path: '/configureSeller',
        component: 'configureSeller/configureSeller.vue'
      },
      {
        name: '可邮寄区域',
        path: '/shipArea',
        component: 'ship/shipArea.vue'
      },
      {
        name: '关于我们',
        path: '/configureSeller',
      },
    ]
  },
  
  {
    name: '订单日志',
    path: '/orderLogs',
    component: 'order/orderLogs.vue'
  },
  {
    name: '管理员',
    path: '/admin',
    component: 'admin/admin.vue'
  },
  {
    name: '系统日志',
    path: '/systemLogs',
    component: 'systemLogs/systemLogs.vue'
  },

]

const adminMenu = [
]

module.exports = {
  superadminMenu,
  adminMenu,
}