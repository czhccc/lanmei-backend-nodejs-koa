/*
 Navicat Premium Dump SQL

 Source Server         : lanmei
 Source Server Type    : MySQL
 Source Server Version : 80039 (8.0.39)
 Source Host           : localhost:3306
 Source Schema         : lanmei

 Target Server Type    : MySQL
 Target Server Version : 80039 (8.0.39)
 File Encoding         : 65001

 Date: 26/02/2025 11:39:19
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for about_us_images
-- ----------------------------
DROP TABLE IF EXISTS `about_us_images`;
CREATE TABLE `about_us_images`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `createTime` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 41 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_bin ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of about_us_images
-- ----------------------------
INSERT INTO `about_us_images` VALUES (40, 'aboutUs/aboutUs_20241025101248_6powd5.png', '2024-10-25 10:12:50');

-- ----------------------------
-- Table structure for aboutus
-- ----------------------------
DROP TABLE IF EXISTS `aboutus`;
CREATE TABLE `aboutus`  (
  `id` int NOT NULL,
  `address` json NULL,
  `contact` json NULL,
  `aboutUs` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_bin ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of aboutus
-- ----------------------------
INSERT INTO `aboutus` VALUES (1, '[{\"lat\": \"29.505098\", \"lon\": \"120.686843\", \"address\": \"嵊州市美汐蓝莓专业合作社\"}, {\"lat\": \"30.236717\", \"lon\": \"120.432993\", \"address\": \"萧山国际机场T4航站楼\"}]', '[{\"type\": \"手机号\", \"contact\": \"13999999999\"}, {\"type\": \"微信号\", \"contact\": \"wx123456789\"}]', '<p><span style=\"color: rgb(225, 60, 57);\">hello11</span></p><p><img src=\"BASE_URL/aboutUs/aboutUs_20241025101248_6powd5.png\" alt=\"\" data-href=\"\" style=\"\"/></p><p>111111111</p><p><br></p><p><br></p>');

-- ----------------------------
-- Table structure for admin
-- ----------------------------
DROP TABLE IF EXISTS `admin`;
CREATE TABLE `admin`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `phone` varchar(11) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `password` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '159357',
  `name` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `role` int NOT NULL DEFAULT 1 COMMENT '1-管理员；2-超管',
  `createTime` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updateTime` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `phone`(`phone` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 12 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_bin ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of admin
-- ----------------------------
INSERT INTO `admin` VALUES (1, '13989536936', 'e10adc3949ba59abbe56e057f20f883e', 'czh', 2, '2024-09-09 17:32:43', '2024-09-12 15:29:00');
INSERT INTO `admin` VALUES (2, '13333333334', 'e10adc3949ba59abbe56e057f20f883e', 'yjn4', 1, '2024-09-12 13:38:18', '2024-09-12 16:09:11');
INSERT INTO `admin` VALUES (10, '13333333333', 'e10adc3949ba59abbe56e057f20f883e', 'yjn', 1, '2024-09-09 17:32:10', '2024-09-12 15:28:53');
INSERT INTO `admin` VALUES (11, '13222222222', '96e79218965eb72c92a549dd5a330112', 'czh2', 1, '2024-09-12 16:07:30', '2024-09-12 16:11:13');

-- ----------------------------
-- Table structure for batch_history
-- ----------------------------
DROP TABLE IF EXISTS `batch_history`;
CREATE TABLE `batch_history`  (
  `no` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `goods_id` int NOT NULL,
  `type` enum('preorder','stock') CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT '预订 / 现卖',
  `startTime` datetime NOT NULL,
  `endTime` datetime NULL DEFAULT NULL,
  `unitPrice` decimal(10, 2) NULL DEFAULT NULL COMMENT '现卖时的价格',
  `minPrice` decimal(10, 2) NULL DEFAULT NULL COMMENT '预订时的价格区间',
  `maxPrice` decimal(10, 2) NULL DEFAULT NULL COMMENT '预订时的价格区间',
  `minQuantity` decimal(10, 1) NOT NULL COMMENT '最小购买或预订的数量',
  `discounts` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '优惠策略',
  `totalOrdersCount` int NULL DEFAULT NULL COMMENT '总订单数',
  `totalAmount` decimal(10, 2) NULL DEFAULT NULL COMMENT '总出售量',
  `coverImage` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT '封面图片',
  `remark` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '批次备注',
  `snapshot_goodsName` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT '商品快照',
  `snapshot_goodsUnit` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT '商品快照',
  `snapshot_goodsRemark` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '商品快照',
  `snapshot_goodsRichText` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL COMMENT '商品快照',
  `status` enum('completed','canceled','deleted') CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '状态：结束/取消（只有预订类）/删除',
  `createTime` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updateTime` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`no` DESC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_bin ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of batch_history
-- ----------------------------
INSERT INTO `batch_history` VALUES ('20250222201828_mt3d1k', 59, 'preorder', '2025-02-22 20:18:28', '2025-02-22 20:21:02', NULL, 0.01, 0.02, 1.0, '[]', 0, 0.00, 'goods_coverImage/goods_coverImage-59_20241025101638_4oso57.png', '', '测试-百香果测试-百香果测试-百香果测试-百香果测试-百香果测试-百香果测试-百香果测试-百香果22', '篮', '111', '<p><br></p><p>详情</p><p><img src=\"BASE_URL/goods_richText/goods_richText-59_20241025101847_9lvi3j.png\" alt=\"\" data-href=\"\" style=\"\"/></p>', 'canceled', '2025-02-22 20:21:02', NULL);
INSERT INTO `batch_history` VALUES ('20250222133953_hyt9xg', 59, 'preorder', '2025-02-22 13:39:53', '2025-02-22 20:12:52', NULL, 0.01, 0.02, 1.0, '[]', 0, 0.00, 'goods_coverImage/goods_coverImage-59_20241025101638_4oso57.png', '', '测试-百香果测试-百香果测试-百香果测试-百香果测试-百香果测试-百香果测试-百香果测试-百香果22', '篮', '111', '<p><br></p><p>详情</p><p><img src=\"BASE_URL/goods_richText/goods_richText-59_20241025101847_9lvi3j.png\" alt=\"\" data-href=\"\" style=\"\"/></p>', 'canceled', '2025-02-22 20:12:52', NULL);
INSERT INTO `batch_history` VALUES ('20250222133612_ecm8ox', 59, 'preorder', '2025-02-22 13:36:12', '2025-02-22 13:36:54', NULL, 0.01, 0.02, 1.0, '[]', 0, 0.00, 'goods_coverImage/goods_coverImage-59_20241025101638_4oso57.png', '1', '测试-百香果测试-百香果测试-百香果测试-百香果测试-百香果测试-百香果测试-百香果测试-百香果22', '篮', '111', '<p><br></p><p>详情</p><p><img src=\"BASE_URL/goods_richText/goods_richText-59_20241025101847_9lvi3j.png\" alt=\"\" data-href=\"\" style=\"\"/></p>', 'deleted', '2025-02-22 13:36:54', '2025-02-22 19:52:00');
INSERT INTO `batch_history` VALUES ('20250222122118_a4ryvi', 59, 'preorder', '2025-02-22 12:21:18', '2025-02-22 13:32:56', NULL, 0.01, 0.02, 1.0, '[]', 0, 0.00, 'goods_coverImage/goods_coverImage-59_20241025101638_4oso57.png', '11', '测试-百香果测试-百香果测试-百香果测试-百香果测试-百香果测试-百香果测试-百香果测试-百香果22', '篮', '111', '<p><br></p><p>详情</p><p><img src=\"BASE_URL/goods_richText/goods_richText-59_20241025101847_9lvi3j.png\" alt=\"\" data-href=\"\" style=\"\"/></p>', 'deleted', '2025-02-22 13:32:56', '2025-02-22 19:52:03');
INSERT INTO `batch_history` VALUES ('20250222111256_88w1jp', 55, 'stock', '2025-02-22 11:12:56', '2025-02-22 11:13:13', 0.01, NULL, NULL, 1.0, '[]', 0, 0.00, 'goods_coverImage/goods_coverImage-55_20241108154617_m682hk.jpg', '', '测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓', '斤', '我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111', '<p>暂无更多介绍</p>', NULL, '2025-02-22 11:13:13', NULL);
INSERT INTO `batch_history` VALUES ('20250222110239_5nr21o', 55, 'stock', '2025-02-22 11:02:39', '2025-02-22 11:08:51', 0.01, NULL, NULL, 1.0, '[]', 0, 0.00, 'goods_coverImage/goods_coverImage-55_20241108154617_m682hk.jpg', '11', '测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓', '斤', '我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111', '<p>暂无更多介绍</p>', NULL, '2025-02-22 11:08:51', NULL);
INSERT INTO `batch_history` VALUES ('20241108161821_q86q8e', 60, 'preorder', '2024-11-08 16:18:21', '2024-12-15 17:33:04', NULL, 0.01, 0.02, 1.0, '[{\"quantity\":2,\"discount\":0.01},{\"quantity\":4,\"discount\":0.02}]', NULL, 0.00, 'goods_coverImage/goods_coverImage-60_20241108161759_qs2xpn.jpg', '', '111', '111', '111', '<p><br></p><p>详情</p><p><img src=\"BASE_URL/goods_richText/goods_richText-59_20241025101847_9lvi3j.png\" alt=\"\" data-href=\"\" style=\"\"/></p>', NULL, '2024-12-15 17:33:04', NULL);
INSERT INTO `batch_history` VALUES ('20241108154857_ghxj0v', 55, 'stock', '2024-11-08 15:48:57', '2025-02-22 10:58:10', 90.00, NULL, NULL, 3.0, '[{\"quantity\":6,\"discount\":10},{\"quantity\":10,\"discount\":20}]', 5, 15.00, 'goods_coverImage/goods_coverImage-55_20241108154617_m682hk.jpg', '999斤', '测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓', '斤', '我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111', '<p>暂无更多介绍</p>', NULL, '2025-02-22 10:58:10', NULL);
INSERT INTO `batch_history` VALUES ('20241108150452_op4ki6', 59, 'preorder', '2024-11-08 15:04:52', '2025-02-21 12:34:58', NULL, 10.00, 20.00, 2.0, '[{\"quantity\":4,\"discount\":10},{\"quantity\":8,\"discount\":20}]', 2, 4.00, 'goods_coverImage/goods_coverImage-59_20241025101638_4oso57.png', '批次备注', '测试-百香果测试-百香果测试-百香果测试-百香果测试-百香果测试-百香果测试-百香果测试-百香果22', '篮', '111', '<p><br></p><p>详情</p><p><img src=\"BASE_URL/goods_richText/goods_richText-59_20241025101847_9lvi3j.png\" alt=\"\" data-href=\"\" style=\"\"/></p>', NULL, '2025-02-21 12:34:58', NULL);
INSERT INTO `batch_history` VALUES ('20241023114034_qndwqc', 58, 'stock', '2024-10-23 11:40:34', '2024-10-25 10:43:14', 20.00, NULL, NULL, 1.0, '[{\"quantity\":2,\"discount\":2},{\"quantity\":4,\"discount\":4}]', NULL, 0.00, 'goods_coverImage/goods_coverImage-58_20241022175507_s7ospp.jpg', '我是批次备注', '用于基础信息测试', '只', '鸡你太美鸡你太美鸡你太美鸡你太美鸡你太美鸡你太美鸡你太美鸡你太美鸡你太美鸡你太美鸡你太美鸡你太美鸡你太美鸡你太美鸡你太美鸡你太美', '<p>鸡你太美鸡你太美鸡你太美鸡你太美鸡你太美鸡你太美鸡你太美鸡你太美</p><p><br></p><p><img src=\"BASE_URL/goods_richText/goods_richText-58_20241022175523_ltkrka.jpg\" alt=\"\" data-href=\"\" style=\"width: 50%;\"/></p>', NULL, '2024-10-25 10:43:14', NULL);
INSERT INTO `batch_history` VALUES ('20241015105924_yajmt4', 55, 'stock', '2024-10-15 11:27:11', '2024-11-08 15:46:09', 2.00, NULL, NULL, 2.0, '[{\"quantity\":2,\"discount\":2},{\"quantity\":4,\"discount\":4}]', NULL, 0.00, '', '222222222222222222222222222222222222222222222222222222', '测试商品1-蓝莓', '斤', '我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111', '<p>暂无更多介绍</p>', NULL, '2024-11-08 15:46:09', NULL);

-- ----------------------------
-- Table structure for category
-- ----------------------------
DROP TABLE IF EXISTS `category`;
CREATE TABLE `category`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `parent_id` int NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 22 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_bin ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of category
-- ----------------------------
INSERT INTO `category` VALUES (1, '水果', NULL);
INSERT INTO `category` VALUES (2, '蓝莓', 1);
INSERT INTO `category` VALUES (3, '百香果', 1);
INSERT INTO `category` VALUES (4, '养殖类', NULL);
INSERT INTO `category` VALUES (5, '鸭子', 4);
INSERT INTO `category` VALUES (6, '鸡', 4);
INSERT INTO `category` VALUES (7, '海鲜', NULL);
INSERT INTO `category` VALUES (8, '鳖', 7);
INSERT INTO `category` VALUES (9, '鱼', 7);
INSERT INTO `category` VALUES (10, '虾', 7);
INSERT INTO `category` VALUES (11, '111', NULL);
INSERT INTO `category` VALUES (12, '222', 11);
INSERT INTO `category` VALUES (13, '333', NULL);
INSERT INTO `category` VALUES (14, '33', 13);
INSERT INTO `category` VALUES (15, '444', NULL);
INSERT INTO `category` VALUES (16, '啊啊啊啊啊啊啊啊啊啊', 15);
INSERT INTO `category` VALUES (17, '123', NULL);
INSERT INTO `category` VALUES (18, '234', 17);
INSERT INTO `category` VALUES (19, '999', NULL);
INSERT INTO `category` VALUES (20, '888', 19);
INSERT INTO `category` VALUES (21, '333', NULL);

-- ----------------------------
-- Table structure for comment
-- ----------------------------
DROP TABLE IF EXISTS `comment`;
CREATE TABLE `comment`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `comment` text CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `author` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `createTime` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 20 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_bin ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of comment
-- ----------------------------
INSERT INTO `comment` VALUES (1, '俞佳妮俞佳妮俞佳妮', '13989536936', '2024-09-13 21:27:03');
INSERT INTO `comment` VALUES (2, '俞佳妮2俞佳妮2俞佳妮2', '13989536936', '2024-09-13 22:38:28');
INSERT INTO `comment` VALUES (3, '俞佳妮3俞佳妮3俞佳妮3', '13989536936', '2024-09-14 11:00:56');
INSERT INTO `comment` VALUES (4, '俞佳妮4俞佳妮3俞佳妮4', '13989536936', '2024-09-14 11:32:12');
INSERT INTO `comment` VALUES (5, '11111', '1111', '2024-09-27 15:48:03');
INSERT INTO `comment` VALUES (6, '2', '2', '2024-09-27 15:48:07');
INSERT INTO `comment` VALUES (7, '3', '3', '2024-09-27 15:48:11');
INSERT INTO `comment` VALUES (8, '4', '4', '2024-09-27 15:48:14');
INSERT INTO `comment` VALUES (9, '5', '5', '2024-09-27 15:48:18');
INSERT INTO `comment` VALUES (10, '6', '6', '2024-09-27 15:48:21');
INSERT INTO `comment` VALUES (11, '7', '7', '2024-09-27 15:48:24');
INSERT INTO `comment` VALUES (12, '8', '8', '2024-09-27 15:48:27');
INSERT INTO `comment` VALUES (13, '9', '9', '2024-09-27 15:48:30');
INSERT INTO `comment` VALUES (14, '10', '10', '2024-09-27 15:48:34');
INSERT INTO `comment` VALUES (15, '11', '11', '2024-09-27 15:48:37');
INSERT INTO `comment` VALUES (16, '微信留言测试', '13989536936', '2024-09-27 17:45:42');
INSERT INTO `comment` VALUES (17, '123', '13989536936', '2024-09-27 17:53:32');
INSERT INTO `comment` VALUES (18, '789', '13989536936', '2024-09-27 17:53:36');
INSERT INTO `comment` VALUES (19, '111', '13989536936', '2024-10-02 16:55:10');

-- ----------------------------
-- Table structure for comment_response
-- ----------------------------
DROP TABLE IF EXISTS `comment_response`;
CREATE TABLE `comment_response`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `comment_id` int NOT NULL,
  `response` text CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `author` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `createTime` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `comment_id`(`comment_id` ASC) USING BTREE,
  CONSTRAINT `comment_id` FOREIGN KEY (`comment_id`) REFERENCES `comment` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 13 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_bin ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of comment_response
-- ----------------------------
INSERT INTO `comment_response` VALUES (1, 1, '我是回复1我是回复1我是回复1', '13333333333', '2024-09-13 21:47:31');
INSERT INTO `comment_response` VALUES (2, 1, '我是回复2我是回复2我是回复2', '13333333333', '2024-09-13 21:53:58');
INSERT INTO `comment_response` VALUES (3, 3, '我是回复1我是回复1', '13333333333', '2024-09-14 11:01:50');
INSERT INTO `comment_response` VALUES (4, 3, '我是回复2我是回复2', '13333333333', '2024-09-14 11:01:58');
INSERT INTO `comment_response` VALUES (5, 1, '我是回复3我是回复3我是回复3', 'czh', '2024-09-14 15:12:31');
INSERT INTO `comment_response` VALUES (6, 1, '我是回复4我是回复4我是回复4', 'czh', '2024-09-14 15:25:07');
INSERT INTO `comment_response` VALUES (7, 1, '我是回复5我是回复5我是回复5', 'czh', '2024-09-14 15:26:40');
INSERT INTO `comment_response` VALUES (8, 1, '我是回复6我是回复6我是回复6', 'czh', '2024-09-14 15:27:12');
INSERT INTO `comment_response` VALUES (9, 15, '11的内容回复', 'czh', '2024-09-27 16:17:55');
INSERT INTO `comment_response` VALUES (10, 14, '10的内容回复', 'czh', '2024-09-27 16:19:12');
INSERT INTO `comment_response` VALUES (11, 13, '???', 'czh', '2024-09-27 17:43:06');
INSERT INTO `comment_response` VALUES (12, 19, '222', 'czh', '2024-10-02 16:55:22');

-- ----------------------------
-- Table structure for customer_address
-- ----------------------------
DROP TABLE IF EXISTS `customer_address`;
CREATE TABLE `customer_address`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT '收货人姓名',
  `phone` varchar(11) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT '收货人手机号',
  `user` varchar(11) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '小程序用户手机号',
  `region` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT '省市区',
  `detail` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT '详细地址',
  `isDefault` int NOT NULL COMMENT '是否是默认地址：1是，0否',
  `createTime` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updateTime` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 4 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_bin ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of customer_address
-- ----------------------------
INSERT INTO `customer_address` VALUES (1, 'yjn', '13989999999', '13989536936', '北京市北京市东城区', '我是详细地址111', 1, '2024-10-09 16:42:38', '2024-10-09 17:24:32');
INSERT INTO `customer_address` VALUES (2, 'yjn2', '13989222222', '13989536936', '北京市北京市西城区', '我是地址我是地址我是地址我是地址我是地址我是地址我是地址我是地址我是地址我是地址我是地址我是地址我是', 0, '2024-10-09 17:10:06', '2024-10-09 17:19:12');

-- ----------------------------
-- Table structure for goods
-- ----------------------------
DROP TABLE IF EXISTS `goods`;
CREATE TABLE `goods`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `goods_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `goods_unit` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `goods_categoryId` int NULL DEFAULT NULL,
  `goods_isSelling` int NULL DEFAULT NULL COMMENT '1上架；0不上架',
  `goods_remark` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL,
  `goods_richText` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
  `goods_coverImage` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL,
  `batch_no` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL,
  `batch_type` enum('preorder','stock') CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '预订 还是 现货',
  `batch_preorder_stage` enum('pending','selling') CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '预订的阶段 预订中、已进货',
  `batch_startTime` datetime NULL DEFAULT NULL,
  `batch_unitPrice` decimal(10, 2) NULL DEFAULT NULL,
  `batch_minPrice` decimal(10, 2) NULL DEFAULT NULL,
  `batch_maxPrice` decimal(10, 2) NULL DEFAULT NULL,
  `batch_minQuantity` decimal(10, 1) NULL DEFAULT NULL,
  `batch_discounts` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '已售出的总量',
  `batch_remark` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL,
  `batch_remainingAmount` decimal(10, 2) NULL DEFAULT NULL COMMENT '剩余量',
  `createTime` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updateTIme` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 61 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_bin ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of goods
-- ----------------------------
INSERT INTO `goods` VALUES (55, '测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓', '斤', 2, 1, '我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111', '<p>暂无更多介绍</p>', 'goods_coverImage/goods_coverImage-55_20241108154617_m682hk.jpg', '20250224211119_3nfcl5', 'preorder', 'selling', '2025-02-24 21:11:19', NULL, 0.01, 0.02, 1.0, '[]', '', 0.00, '2024-10-15 09:14:14', '2025-02-25 20:11:19');
INSERT INTO `goods` VALUES (57, '测试商品-鸭子', '只', 5, 0, '我是鸭子鸭子鸭子', '<p>暂无更多介绍</p>', NULL, '20241015123317_b57mn5', 'preorder', NULL, '2024-10-15 12:33:17', NULL, 10.00, 20.00, 3.0, '[{\"quantity\":1,\"discount\":1},{\"quantity\":2,\"discount\":2}]', '我是批次备注我是批次备注我是批次备注我是批次备注我是批次备注我是批次备注我是批次备注我是批次备注', 20.00, '2024-10-15 11:49:45', '2024-10-15 12:33:17');
INSERT INTO `goods` VALUES (58, '用于基础信息测试', '只', 6, 0, '鸡你太美鸡你太美鸡你太美鸡你太美鸡你太美鸡你太美鸡你太美鸡你太美鸡你太美鸡你太美鸡你太美鸡你太美鸡你太美鸡你太美鸡你太美鸡你太美', '<p>鸡你太美鸡你太美鸡你太美鸡你太美鸡你太美鸡你太美鸡你太美鸡你太美</p><p><br></p><p><img src=\"BASE_URL/goods_richText/goods_richText-58_20241022175523_ltkrka.jpg\" alt=\"\" data-href=\"\" style=\"width: 50%;\"/></p>', 'goods_coverImage/goods_coverImage-58_20241022175507_s7ospp.jpg', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2024-10-17 09:20:31', '2024-11-28 09:44:06');
INSERT INTO `goods` VALUES (59, '测试-百香果测试-百香果测试-百香果测试-百香果测试-百香果测试-百香果测试-百香果测试-百香果22', '篮', 3, 0, '111', '<p><br></p><p>详情</p><p><img src=\"BASE_URL/goods_richText/goods_richText-59_20241025101847_9lvi3j.png\" alt=\"\" data-href=\"\" style=\"\"/></p>', 'goods_coverImage/goods_coverImage-59_20241025101638_4oso57.png', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2024-10-25 10:16:32', '2025-02-22 20:21:02');
INSERT INTO `goods` VALUES (60, '111', '111', 2, 1, '111', '<p><br></p><p>详情</p><p><img src=\"BASE_URL/goods_richText/goods_richText-59_20241025101847_9lvi3j.png\" alt=\"\" data-href=\"\" style=\"\"/></p>', 'goods_coverImage/goods_coverImage-60_20241108161759_qs2xpn.jpg', '20241216205822_erpxi1', 'stock', NULL, '2024-12-16 20:58:22', 1.00, NULL, NULL, 2.0, '[{\"quantity\":2,\"discount\":1},{\"quantity\":4,\"discount\":2}]', '', 100.00, '2024-11-08 16:17:53', '2025-02-22 21:38:25');

-- ----------------------------
-- Table structure for goods_media
-- ----------------------------
DROP TABLE IF EXISTS `goods_media`;
CREATE TABLE `goods_media`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `goods_id` int NOT NULL,
  `url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `fileType` enum('image','video') CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL,
  `useType` enum('swiper','richText') CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL,
  `position` int NULL DEFAULT NULL COMMENT 'swiper中显示顺序的权重',
  `createTime` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 136 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_bin ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of goods_media
-- ----------------------------
INSERT INTO `goods_media` VALUES (114, 60, 'goods_richText/goods_richText-59_20241025101847_9lvi3j.png', 'image', 'richText', NULL, '2024-12-16 20:58:22');
INSERT INTO `goods_media` VALUES (131, 59, 'goods_swiper/goods_swiper-59_20241025101643_34zc25.mp4', 'video', 'swiper', 0, '2025-02-22 20:20:17');
INSERT INTO `goods_media` VALUES (132, 59, 'goods_swiper/goods_swiper-59_20241025101645_n58cvh.png', 'image', 'swiper', 1, '2025-02-22 20:20:17');
INSERT INTO `goods_media` VALUES (133, 59, 'goods_richText/goods_richText-59_20241025101847_9lvi3j.png', 'image', 'richText', NULL, '2025-02-22 20:20:17');
INSERT INTO `goods_media` VALUES (134, 55, 'goods_swiper/goods_swiper-55_20241108154621_lvxq15.png', 'image', 'swiper', 0, '2025-02-24 21:11:19');
INSERT INTO `goods_media` VALUES (135, 55, 'goods_swiper/goods_swiper-55_20241108154626_n72lkq.png', 'image', 'swiper', 1, '2025-02-24 21:11:19');

-- ----------------------------
-- Table structure for orders
-- ----------------------------
DROP TABLE IF EXISTS `orders`;
CREATE TABLE `orders`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_no` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '订单号：年月日时分秒 + 手机号后四位',
  `user` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '下单用户的手机号',
  `goods_id` int NOT NULL,
  `batch_no` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT '批次编号',
  `generation_type` enum('auto','manual') CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '自动生成还是手动添加',
  `batch_type` enum('preorder','stock') CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '预订 / 现货',
  `num` int NOT NULL COMMENT '数量',
  `receive_method` enum('post','delivery') CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '收货方式：快递、送货上门',
  `receive_name` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '收货人姓名',
  `receive_phone` varchar(11) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '收货人手机号',
  `receive_region` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '收获人 省市区',
  `receive_address` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '收货人 详细地址',
  `remark_customer` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '用户的备注信息',
  `remark_self` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '己方备注',
  `total_price` decimal(10, 2) NULL DEFAULT NULL COMMENT '总金额（优惠前）-现货',
  `total_minPrice` decimal(10, 2) NULL DEFAULT NULL COMMENT '总金额（优惠前）-预订',
  `total_maxPrice` decimal(10, 2) NULL DEFAULT NULL COMMENT '总金额（优惠前）-预订',
  `discount_amount` decimal(10, 2) NULL DEFAULT NULL COMMENT '优惠的金额',
  `postage` decimal(10, 2) NOT NULL COMMENT '邮费',
  `status` enum('reserved','unpaid','paid','completed','canceled','refunded') CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '订单状态（现货：已付款->送货/到货后变完结）（预订：已预订->）',
  `canceled_from` enum('customer','self') CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '取消的人：顾客 / 自己',
  `canceled_reason` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '取消原因',
  `pay_time` datetime NULL DEFAULT NULL COMMENT '付款时间',
  `end_time` datetime NULL DEFAULT NULL COMMENT '完结时间',
  `order_time` datetime NULL DEFAULT NULL COMMENT '预订时间，预订类型才有',
  `snapshot_coverImage` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '商品快照 封面图',
  `snapshot_goodsName` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT '商品快照',
  `snapshot_goodsUnit` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT '商品快照',
  `snapshot_goodsRemark` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT '商品快照',
  `snapshot_goodsRichText` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT '商品快照',
  `snapshot_discounts` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '优惠策略，JSON格式的数组对象',
  `createTime` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updateTime` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 36 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_bin ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of orders
-- ----------------------------
INSERT INTO `orders` VALUES (2, '202411141647286936', '13989536936', 60, '20241108161821_q86q8e', 'auto', 'preorder', 2, 'post', 'yjn', '13989999999', '北京市北京市东城区', '我是详细地址111', '999', NULL, NULL, 0.02, 0.04, 0.01, 10.00, 'reserved', NULL, NULL, NULL, NULL, '2024-11-14 16:47:28', 'http://localhost:8888/goods_coverImage/goods_coverImage-60_20241108161759_qs2xpn.jpg', '111', '111', '111', '<p>暂无更多介绍</p>', '[{\"quantity\":2,\"discount\":0.01},{\"quantity\":4,\"discount\":0.02}]', '2024-11-14 16:47:28', '2024-11-14 17:31:20');
INSERT INTO `orders` VALUES (3, '202411141721306936', '13989536936', 55, '20241108154857_ghxj0v', 'auto', 'stock', 6, 'post', 'yjn', '13989999999', '北京市北京市东城区', '我是详细地址111', '99999', NULL, 540.00, NULL, NULL, 10.00, 10.00, 'paid', NULL, NULL, '2024-11-14 17:21:30', NULL, NULL, 'http://localhost:8888/goods_coverImage/goods_coverImage-55_20241108154617_m682hk.jpg', '测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓', '斤', '我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111', '<p>暂无更多介绍</p>', '[{\"quantity\":6,\"discount\":10},{\"quantity\":10,\"discount\":20}]', '2024-11-14 17:21:30', '2024-11-26 17:19:27');
INSERT INTO `orders` VALUES (4, '202411141733486936', '13989536936', 55, '20241108154857_ghxj0v', 'auto', 'stock', 1, 'delivery', 'yjn', '13989999999', '北京市北京市东城区', '我是详细地址111', '', NULL, 90.00, NULL, NULL, 0.00, 10.00, 'completed', NULL, NULL, '2024-11-14 17:33:48', NULL, NULL, 'http://localhost:8888/goods_coverImage/goods_coverImage-55_20241108154617_m682hk.jpg', '测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓', '斤', '我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111', '<p>暂无更多介绍</p>', '[{\"quantity\":6,\"discount\":10},{\"quantity\":10,\"discount\":20}]', '2024-11-14 17:33:48', '2024-11-26 17:19:23');
INSERT INTO `orders` VALUES (5, '202411141759036936', '13989536936', 60, '20241108161821_q86q8e', 'auto', 'preorder', 1, 'post', 'yjn', '13989999999', '北京市北京市东城区', '我是详细地址111', '', NULL, NULL, 0.01, 0.02, 0.00, 10.00, 'reserved', NULL, NULL, NULL, NULL, '2024-11-14 17:59:03', 'http://localhost:8888/goods_coverImage/goods_coverImage-60_20241108161759_qs2xpn.jpg', '111', '111', '111', '<p>暂无更多介绍</p>', '[{\"quantity\":2,\"discount\":0.01},{\"quantity\":4,\"discount\":0.02}]', '2024-11-14 17:59:03', NULL);
INSERT INTO `orders` VALUES (6, '202411181114516936', '13989536936', 59, '20241108150452_op4ki6', 'auto', 'preorder', 2, 'delivery', 'yjn', '13989999999', '北京市北京市东城区', '我是详细地址111', '666', NULL, NULL, 20.00, 40.00, 0.00, 10.00, 'unpaid', NULL, NULL, NULL, NULL, '2024-11-18 11:14:51', 'http://localhost:8888/goods_coverImage/goods_coverImage-59_20241025101638_4oso57.png', '测试-百香果测试-百香果测试-百香果测试-百香果测试-百香果测试-百香果测试-百香果测试-百香果22', '篮', '111', '<p><br></p><p>详情</p><p><img src=\"BASE_URL/goods_richText/goods_richText-59_20241025101847_9lvi3j.png\" alt=\"\" data-href=\"\" style=\"\"/></p>', '[{\"quantity\":4,\"discount\":10},{\"quantity\":8,\"discount\":20}]', '2024-11-18 11:14:51', '2024-11-18 11:16:41');
INSERT INTO `orders` VALUES (7, '202411181459506936', '13989536936', 60, '20241108161821_q86q8e', 'auto', 'preorder', 1, 'delivery', 'yjn2', '13989222222', '北京市北京市西城区', '我是地址我是地址我是地址我是地址我是地址我是地址我是地址我是地址我是地址我是地址我是地址我是地址我是', '', '己方备注222', NULL, 0.01, 0.02, 0.00, 10.00, 'completed', NULL, NULL, NULL, NULL, '2024-11-18 14:59:50', 'http://localhost:8888/goods_coverImage/goods_coverImage-60_20241108161759_qs2xpn.jpg', '111', '111', '111', '<p>暂无更多介绍</p>', '[{\"quantity\":2,\"discount\":0.01},{\"quantity\":4,\"discount\":0.02}]', '2024-11-18 14:59:50', '2024-11-27 14:26:26');
INSERT INTO `orders` VALUES (20, '202411281636046936', '13989536936', 60, '20241108161821_q86q8e', 'manual', 'preorder', 1, 'post', '', '', '', '', '', '', NULL, 0.00, 0.00, 0.00, 10.00, 'reserved', NULL, NULL, '2024-11-28 16:36:04', NULL, NULL, 'http://localhost:8888/goods_coverImage/goods_coverImage-60_20241108161759_qs2xpn.jpg', '111', '111', '111', '<p>暂无更多介绍</p>', '\"[{\\\"quantity\\\":2,\\\"discount\\\":0.01},{\\\"quantity\\\":4,\\\"discount\\\":0.02}]\"', '2024-11-28 16:36:04', NULL);
INSERT INTO `orders` VALUES (23, '202411281652306936', '13989536936', 60, '20241108161821_q86q8e', 'manual', 'preorder', 2, 'post', NULL, NULL, NULL, NULL, NULL, '手动添加预订', NULL, 0.02, 0.04, 0.01, 10.00, 'reserved', NULL, NULL, NULL, NULL, '2024-11-28 16:52:30', 'http://localhost:8888/goods_coverImage/goods_coverImage-60_20241108161759_qs2xpn.jpg', '111', '111', '111', '<p>暂无更多介绍</p>', '\"[{\\\"quantity\\\":2,\\\"discount\\\":0.01},{\\\"quantity\\\":4,\\\"discount\\\":0.02}]\"', '2024-11-28 16:52:30', '2024-11-28 17:04:28');
INSERT INTO `orders` VALUES (24, '202411281653536936', '13989536936', 55, '20241108154857_ghxj0v', 'manual', 'stock', 6, 'post', NULL, NULL, NULL, NULL, NULL, '手动添加现货', 540.00, NULL, NULL, 10.00, 10.00, 'paid', NULL, NULL, '2024-11-28 16:53:53', NULL, NULL, 'http://localhost:8888/goods_coverImage/goods_coverImage-55_20241108154617_m682hk.jpg', '测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓', '斤', '我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111', '<p>暂无更多介绍</p>', '\"[{\\\"quantity\\\":6,\\\"discount\\\":10},{\\\"quantity\\\":10,\\\"discount\\\":20}]\"', '2024-11-28 16:53:53', '2024-11-28 17:04:22');
INSERT INTO `orders` VALUES (25, '202411281702236936', '13989536936', 55, '20241108154857_ghxj0v', 'manual', 'stock', 1, 'post', NULL, NULL, NULL, NULL, NULL, NULL, 90.00, NULL, NULL, 0.00, 10.00, 'paid', NULL, NULL, '2024-11-28 17:02:23', NULL, NULL, 'http://localhost:8888/goods_coverImage/goods_coverImage-55_20241108154617_m682hk.jpg', '测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓', '斤', '我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111', '<p>暂无更多介绍</p>', '\"[{\\\"quantity\\\":6,\\\"discount\\\":10},{\\\"quantity\\\":10,\\\"discount\\\":20}]\"', '2024-11-28 17:02:23', NULL);
INSERT INTO `orders` VALUES (26, '202502201045486936', '13989536936', 59, '20241108150452_op4ki6', 'auto', 'preorder', 2, 'post', 'yjn', '13989999999', '北京市北京市东城区', '我是详细地址111', '', '', NULL, 20.00, 40.00, 0.00, 10.00, 'reserved', NULL, NULL, NULL, NULL, '2025-02-20 10:45:48', 'http://localhost:8888/goods_coverImage/goods_coverImage-59_20241025101638_4oso57.png', '测试-百香果测试-百香果测试-百香果测试-百香果测试-百香果测试-百香果测试-百香果测试-百香果22', '篮', '111', '<p><br></p><p>详情</p><p><img src=\"BASE_URL/goods_richText/goods_richText-59_20241025101847_9lvi3j.png\" alt=\"\" data-href=\"\" style=\"\"/></p>', '[{\"quantity\":4,\"discount\":10},{\"quantity\":8,\"discount\":20}]', '2025-02-20 10:45:48', NULL);
INSERT INTO `orders` VALUES (27, '202502212031186936', '13989536936', 55, '20241108154857_ghxj0v', 'auto', 'stock', 1, 'post', 'yjn', '13989999999', '北京市北京市东城区', '我是详细地址111', '', '', 90.00, NULL, NULL, 0.00, 10.00, 'paid', NULL, NULL, '2025-02-21 20:31:18', NULL, NULL, 'http://localhost:8888/goods_coverImage/goods_coverImage-55_20241108154617_m682hk.jpg', '测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓', '斤', '我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111', '<p>暂无更多介绍</p>', '[{\"quantity\":6,\"discount\":10},{\"quantity\":10,\"discount\":20}]', '2025-02-21 20:31:18', NULL);
INSERT INTO `orders` VALUES (28, '202502221341426936', '13989536936', 59, '20250222133953_hyt9xg', 'auto', 'preorder', 1, 'post', 'yjn', '13989999999', '北京市北京市东城区', '我是详细地址111', '', '', NULL, 0.01, 0.02, 0.00, 10.00, 'canceled', 'self', '取消原因啊', NULL, NULL, '2025-02-22 13:41:42', 'http://localhost:8888/goods_coverImage/goods_coverImage-59_20241025101638_4oso57.png', '测试-百香果测试-百香果测试-百香果测试-百香果测试-百香果测试-百香果测试-百香果测试-百香果22', '篮', '111', '<p><br></p><p>详情</p><p><img src=\"BASE_URL/goods_richText/goods_richText-59_20241025101847_9lvi3j.png\" alt=\"\" data-href=\"\" style=\"\"/></p>', '[]', '2025-02-22 13:41:42', '2025-02-22 20:12:52');
INSERT INTO `orders` VALUES (29, '202502222020216936', '13989536936', 59, '20250222201828_mt3d1k', 'auto', 'preorder', 1, 'post', 'yjn', '13989999999', '北京市北京市东城区', '我是详细地址111', '', '', NULL, 0.01, 0.02, 0.00, 10.00, 'canceled', 'self', '111', NULL, NULL, '2025-02-22 20:20:21', 'http://localhost:8888/goods_coverImage/goods_coverImage-59_20241025101638_4oso57.png', '测试-百香果测试-百香果测试-百香果测试-百香果测试-百香果测试-百香果测试-百香果测试-百香果22', '篮', '111', '<p><br></p><p>详情</p><p><img src=\"BASE_URL/goods_richText/goods_richText-59_20241025101847_9lvi3j.png\" alt=\"\" data-href=\"\" style=\"\"/></p>', '[]', '2025-02-22 20:20:21', '2025-02-22 20:21:02');
INSERT INTO `orders` VALUES (30, '202502242111486936', '13989536936', 55, '20250224211119_3nfcl5', 'auto', 'preorder', 1, 'post', 'yjn', '13989999999', '北京市北京市东城区', '我是详细地址111', '', '', NULL, 0.01, 0.02, 0.00, 10.00, 'unpaid', NULL, NULL, NULL, NULL, '2025-02-24 21:11:48', 'http://localhost:8888/goods_coverImage/goods_coverImage-55_20241108154617_m682hk.jpg', '测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓', '斤', '我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111', '<p>暂无更多介绍</p>', '[]', '2025-02-24 21:11:48', '2025-02-25 20:11:19');
INSERT INTO `orders` VALUES (31, '202502242112006936', '13989536936', 55, '20250224211119_3nfcl5', 'auto', 'preorder', 2, 'post', 'yjn', '13989999999', '北京市北京市东城区', '我是详细地址111', '', '', NULL, 0.02, 0.04, 0.00, 10.00, 'paid', NULL, NULL, NULL, NULL, '2025-02-24 21:12:00', 'http://localhost:8888/goods_coverImage/goods_coverImage-55_20241108154617_m682hk.jpg', '测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓', '斤', '我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111', '<p>暂无更多介绍</p>', '[]', '2025-02-24 21:12:00', '2025-02-25 22:08:07');
INSERT INTO `orders` VALUES (32, '202502251712276936', '13989536936', 55, '20250224211119_3nfcl5', 'auto', 'preorder', 1, 'post', 'yjn', '13989999999', '北京市北京市东城区', '我是详细地址111', '', '', NULL, 0.01, 0.02, 0.00, 10.00, 'canceled', NULL, NULL, NULL, NULL, '2025-02-25 17:12:27', 'http://localhost:8888/goods_coverImage/goods_coverImage-55_20241108154617_m682hk.jpg', '测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓', '斤', '我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111', '<p>暂无更多介绍</p>', '[]', '2025-02-25 17:12:27', '2025-02-25 20:11:45');
INSERT INTO `orders` VALUES (33, '202502251848596936', '13989536936', 55, '20250224211119_3nfcl5', 'auto', 'preorder', 1, 'post', 'yjn', '13989999999', '北京市北京市东城区', '我是详细地址111', '', '', NULL, 0.01, 0.02, 0.00, 10.00, 'completed', NULL, NULL, NULL, NULL, '2025-02-25 18:48:59', 'http://localhost:8888/goods_coverImage/goods_coverImage-55_20241108154617_m682hk.jpg', '测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓', '斤', '我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111', '<p>暂无更多介绍</p>', '[]', '2025-02-25 18:48:59', '2025-02-25 22:08:09');
INSERT INTO `orders` VALUES (34, '202502251849026936', '13989536936', 55, '20250224211119_3nfcl5', 'auto', 'preorder', 1, 'post', 'yjn', '13989999999', '北京市北京市东城区', '我是详细地址111', '', '', NULL, 0.01, 0.02, 0.00, 10.00, 'refunded', NULL, NULL, NULL, NULL, '2025-02-25 18:49:02', 'http://localhost:8888/goods_coverImage/goods_coverImage-55_20241108154617_m682hk.jpg', '测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓', '斤', '我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111', '<p>暂无更多介绍</p>', '[]', '2025-02-25 18:49:02', '2025-02-25 22:08:15');
INSERT INTO `orders` VALUES (35, '202502251849046936', '13989536936', 55, '20250224211119_3nfcl5', 'auto', 'preorder', 1, 'post', 'yjn', '13989999999', '北京市北京市东城区', '我是详细地址111', '', '', NULL, 0.01, 0.02, 0.00, 10.00, 'unpaid', NULL, NULL, NULL, NULL, '2025-02-25 18:49:04', 'http://localhost:8888/goods_coverImage/goods_coverImage-55_20241108154617_m682hk.jpg', '测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓测试商品1-蓝莓', '斤', '我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111我是商品备注111', '<p>暂无更多介绍</p>', '[]', '2025-02-25 18:49:04', '2025-02-25 20:11:19');

-- ----------------------------
-- Table structure for orders_logs
-- ----------------------------
DROP TABLE IF EXISTS `orders_logs`;
CREATE TABLE `orders_logs`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL COMMENT '订单id',
  `order_no` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '' COMMENT '订单号',
  `operator` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT '操作人',
  `changes` json NOT NULL COMMENT '细节的文本内容',
  `createTime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 6 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_bin ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of orders_logs
-- ----------------------------
INSERT INTO `orders_logs` VALUES (4, 7, '202411181459506936', '13989536936', '{\"remark_self\": {\"after\": \"己方备注\", \"before\": \"己方备注222\"}}', '2024-11-27 12:23:14');
INSERT INTO `orders_logs` VALUES (5, 7, '202411181459506936', '13989536936', '{\"status\": {\"after\": \"completed\", \"before\": \"canceled\"}, \"remark_self\": {\"after\": \"己方备注222\", \"before\": \"己方备注\"}}', '2024-11-27 14:26:26');

-- ----------------------------
-- Table structure for wechat_home_notify
-- ----------------------------
DROP TABLE IF EXISTS `wechat_home_notify`;
CREATE TABLE `wechat_home_notify`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `content` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `createBy` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `createTime` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 9 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_bin ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of wechat_home_notify
-- ----------------------------
INSERT INTO `wechat_home_notify` VALUES (1, '爱爱爱爱爱', '13989536936', '2024-10-12 11:36:06');
INSERT INTO `wechat_home_notify` VALUES (2, '99999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999', '13989536936', '2024-10-12 11:56:21');
INSERT INTO `wechat_home_notify` VALUES (3, '新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新', '13989536936', '2024-10-12 11:57:11');
INSERT INTO `wechat_home_notify` VALUES (4, '新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新', '13989536936', '2024-10-12 11:57:43');
INSERT INTO `wechat_home_notify` VALUES (5, '我是通知测试。我是通知测试。我是通知测试。我是通知测试。我是通知测试。我是通知测试。我是通知测试。我是通知测试。我是通知测试。我是通知测试。我是通知测试。我是通知测试。', '13989536936', '2024-10-12 14:16:40');
INSERT INTO `wechat_home_notify` VALUES (6, '新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新新', '13989536936', '2024-10-12 14:34:17');
INSERT INTO `wechat_home_notify` VALUES (7, '', '13989536936', '2024-10-12 14:45:25');
INSERT INTO `wechat_home_notify` VALUES (8, '我爱你我爱你我爱你我爱你我爱你我爱你我爱你我爱你我爱你我爱你我爱你我爱你我爱你我爱你我爱你我爱你我爱你我爱你我爱你我爱你我爱你我爱你我爱你我爱你我爱你我爱你我爱你我爱你我爱你我爱你我爱你我爱你我爱你我爱你我爱你我爱你我爱你我爱你我爱你我爱你我爱你我爱你我爱你我爱你我爱你我爱你我爱你我爱你我爱你我爱你我爱你', '13989536936', '2024-10-12 14:48:06');

SET FOREIGN_KEY_CHECKS = 1;
