const provincePostageConfig = {
  // 华东地区 (huadong)
  '上海市': { id: '沪', baseNum: 10, basePostage: 10, extraNum: 2, extraPostage: 2, freeShippingNum: 1, area: 'huadong' },
  '江苏省': { id: '苏', baseNum: 10, basePostage: 10, extraNum: 2, extraPostage: 2, freeShippingNum: 1, area: 'huadong' },
  '浙江省': { id: '浙', baseNum: 10, basePostage: 10, extraNum: 2, extraPostage: 2, freeShippingNum: 1, area: 'huadong' },
  '安徽省': { id: '皖', baseNum: 10, basePostage: 10, extraNum: 2, extraPostage: 2, freeShippingNum: 1, area: 'huadong' },
  '福建省': { id: '闽', baseNum: 10, basePostage: 10, extraNum: 2, extraPostage: 2, freeShippingNum: 1, area: 'huadong' },
  '江西省': { id: '赣', baseNum: 10, basePostage: 10, extraNum: 2, extraPostage: 2, freeShippingNum: 1, area: 'huadong' },
  '山东省': { id: '鲁', baseNum: 10, basePostage: 10, extraNum: 2, extraPostage: 2, freeShippingNum: 1, area: 'huadong' },

  // 华南地区 (huanan)
  '广东省': { id: '粤', baseNum: 12, basePostage: 12, extraNum: 3, extraPostage: 3, freeShippingNum: 1, area: 'huanan' },
  '广西壮族自治区': { id: '桂', baseNum: 12, basePostage: 12, extraNum: 3, extraPostage: 3, freeShippingNum: 1, area: 'huanan' },
  '海南省': { id: '琼', baseNum: 12, basePostage: 12, extraNum: 3, extraPostage: 3, freeShippingNum: 1, area: 'huanan' },

  // 华北地区 (huabei)
  '北京市': { id: '京', baseNum: 12, basePostage: 12, extraNum: 3, extraPostage: 3, freeShippingNum: 1, area: 'huabei' },
  '天津市': { id: '津', baseNum: 12, basePostage: 12, extraNum: 3, extraPostage: 3, freeShippingNum: 1, area: 'huabei' },
  '河北省': { id: '冀', baseNum: 12, basePostage: 12, extraNum: 3, extraPostage: 3, freeShippingNum: 1, area: 'huabei' },
  '山西省': { id: '晋', baseNum: 12, basePostage: 12, extraNum: 3, extraPostage: 3, freeShippingNum: 1, area: 'huabei' },
  '内蒙古自治区': { id: '蒙', baseNum: 12, basePostage: 12, extraNum: 3, extraPostage: 3, freeShippingNum: 1, area: 'huabei' },
  '河南省': { id: '豫', baseNum: 12, basePostage: 12, extraNum: 3, extraPostage: 3, freeShippingNum: 1, area: 'huabei' }, // 新增河南

  // 东北地区 (dongbei)
  '辽宁省': { id: '辽', baseNum: 15, basePostage: 15, extraNum: 4, extraPostage: 4, freeShippingNum: 1, area: 'dongbei' },
  '吉林省': { id: '吉', baseNum: 15, basePostage: 15, extraNum: 4, extraPostage: 4, freeShippingNum: 1, area: 'dongbei' },
  '黑龙江省': { id: '黑', baseNum: 15, basePostage: 15, extraNum: 4, extraPostage: 4, freeShippingNum: 1, area: 'dongbei' },

  // 西南地区 (xinan)
  '重庆市': { id: '渝', baseNum: 15, basePostage: 15, extraNum: 4, extraPostage: 4, freeShippingNum: 1, area: 'xinan' },
  '四川省': { id: '川', baseNum: 15, basePostage: 15, extraNum: 4, extraPostage: 4, freeShippingNum: 1, area: 'xinan' },
  '贵州省': { id: '黔', baseNum: 15, basePostage: 15, extraNum: 4, extraPostage: 4, freeShippingNum: 1, area: 'xinan' },
  '云南省': { id: '滇', baseNum: 15, basePostage: 15, extraNum: 4, extraPostage: 4, freeShippingNum: 1, area: 'xinan' },
  '陕西省': { id: '陕', baseNum: 15, basePostage: 15, extraNum: 4, extraPostage: 4, freeShippingNum: 1, area: 'xinan' }, // 陕西归西南
  '甘肃省': { id: '甘', baseNum: 15, basePostage: 15, extraNum: 4, extraPostage: 4, freeShippingNum: 1, area: 'xinan' }, // 甘肃归西南
  '青海省': { id: '青', baseNum: 18, basePostage: 18, extraNum: 5, extraPostage: 5, freeShippingNum: 0, area: 'xinan' },  // 青海归西南
  '宁夏回族自治区': { id: '宁', baseNum: 18, basePostage: 18, extraNum: 5, extraPostage: 5, freeShippingNum: 0, area: 'xinan' }, // 宁夏归西南

  // 华中地区 (huazhong)
  '湖北省': { id: '鄂', baseNum: 12, basePostage: 12, extraNum: 3, extraPostage: 3, freeShippingNum: 1, area: 'huazhong' }, // 新增华中
  '湖南省': { id: '湘', baseNum: 12, basePostage: 12, extraNum: 3, extraPostage: 3, freeShippingNum: 1, area: 'huazhong' },

  // 新疆/西藏 (单独归类)
  '新疆维吾尔自治区': { id: '新', baseNum: 20, basePostage: 20, extraNum: 5, extraPostage: 5, freeShippingNum: 0, area: 'xinjiang' },
  '西藏自治区': { id: '藏', baseNum: 20, basePostage: 20, extraNum: 5, extraPostage: 5, freeShippingNum: 0, area: 'xizang' },

  // 港澳台地区 (gangaotai)
  '香港特别行政区': { id: '港', baseNum: 18, basePostage: 18, extraNum: 6, extraPostage: 6, freeShippingNum: 0, area: 'gangaotai' },
  '澳门特别行政区': { id: '澳', baseNum: 18, basePostage: 18, extraNum: 6, extraPostage: 6, freeShippingNum: 0, area: 'gangaotai' },
  '台湾省': { id: '台', baseNum: 18, basePostage: 18, extraNum: 6, extraPostage: 6, freeShippingNum: 0, area: 'gangaotai' }
};

module.exports.provincePostageConfig = provincePostageConfig