const enum_order_status = Object.freeze({
  reserved: 'reserved',
  canceled: 'canceled',
  unpaid: 'unpaid',
  paid: 'paid',
  shipped: 'shipped',
  completed: 'completed',
  refunded: 'refunded',
})

const enum_admin_role = Object.freeze({
  admin: 'admin',
  super_admin: 'super_admin',
})

const enum_goods_batchType = Object.freeze({
  preorder: 'preorder',
  stock: 'stock',
})

const enum_media_fileType = Object.freeze({
  image: 'image',
  video: 'video',
})

const enum_media_useType = Object.freeze({
  swiper: 'swiper',
  richText: 'richText',
})

const enum_shipArea_level = Object.freeze({
  province: 'province',
  city: 'city',
  district: 'district',
})

const enum_systemLog_level = Object.freeze({
  error: 'error',
  warn: 'warn',
  info: 'info',
  debug: 'debug',
})

module.exports.enum_order_status = enum_order_status
module.exports.enum_admin_role = enum_admin_role
module.exports.enum_goods_batchType = enum_goods_batchType
module.exports.enum_media_fileType = enum_media_fileType
module.exports.enum_media_useType = enum_media_useType
module.exports.enum_shipArea_level = enum_shipArea_level
module.exports.enum_systemLog_level = enum_systemLog_level