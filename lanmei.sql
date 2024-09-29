/*
 Navicat Premium Dump SQL

 Source Server         : root_operation
 Source Server Type    : MySQL
 Source Server Version : 80039 (8.0.39)
 Source Host           : localhost:3306
 Source Schema         : lanmei

 Target Server Type    : MySQL
 Target Server Version : 80039 (8.0.39)
 File Encoding         : 65001

 Date: 29/09/2024 16:03:06
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

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
INSERT INTO `aboutus` VALUES (1, '[{\"lat\": \"29.505098\", \"lon\": \"120.686843\", \"address\": \"嵊州市美汐蓝莓专业合作社\"}, {\"lat\": \"30.236717\", \"lon\": \"120.432993\", \"address\": \"萧山国际机场T4航站楼\"}]', '[{\"type\": \"手机号\", \"contact\": \"13999999999\"}, {\"type\": \"微信号\", \"contact\": \"wx123456789\"}]', '<p><span style=\"color: rgb(225, 60, 57);\">hello11</span></p><p><br></p><p><br></p><p><img src=\"http://localhost:8888/aboutUs_20240926-095925_kk4oxv.jpg\" alt=\"\" data-href=\"\" style=\"width: 30%;\"/></p><p><img src=\"http://localhost:8888/aboutUs_20240927-164828_dj1dct.jpg\" alt=\"\" data-href=\"\" style=\"\"/></p><p>111111111</p>');

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
-- Table structure for batch
-- ----------------------------
DROP TABLE IF EXISTS `batch`;
CREATE TABLE `batch`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `goods_id` int NOT NULL,
  `batch_no` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `batch_type` int NOT NULL COMMENT '预订 / 现卖',
  `batch_startTime` datetime NOT NULL,
  `batch_endTime` datetime NULL DEFAULT NULL,
  `batch_sellPrice` decimal(10, 2) NULL DEFAULT NULL COMMENT '现卖时的价格',
  `batch_minPrice` decimal(10, 2) NULL DEFAULT NULL COMMENT '预订时的价格区间',
  `batch_maxPrice` decimal(10, 2) NULL DEFAULT NULL COMMENT '预订时的价格区间',
  `batch_minQuantity` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT '最小购买或预订的数量',
  `batch_discount` json NULL COMMENT '优惠策略',
  `snapshot_goodsName` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT '商品快照',
  `snapshot_goodsUnit` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT '商品快照',
  `snapshot_goodsRemark` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '商品快照',
  `snapshot_goodsRichText` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL COMMENT '商品快照',
  `createTime` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updateTime` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_bin ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of batch
-- ----------------------------

-- ----------------------------
-- Table structure for category
-- ----------------------------
DROP TABLE IF EXISTS `category`;
CREATE TABLE `category`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `parent_id` int NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 17 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_bin ROW_FORMAT = Dynamic;

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
) ENGINE = InnoDB AUTO_INCREMENT = 19 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_bin ROW_FORMAT = DYNAMIC;

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
) ENGINE = InnoDB AUTO_INCREMENT = 12 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_bin ROW_FORMAT = DYNAMIC;

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
  `createTime` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updateTIme` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 52 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_bin ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of goods
-- ----------------------------
INSERT INTO `goods` VALUES (16, '商品3名称', '商品3单位', NULL, 1, '商品3备注商品3备注商品3备注', '<p>我是商品3</p><p><br></p><p><img src=\"http://localhost:8888/1726753142143.jpg\" alt=\"\" data-href=\"\" style=\"width: 50%;\"/></p>', '2024-09-19 21:49:43', '2024-09-19 21:49:43');
INSERT INTO `goods` VALUES (17, '商品3名称', '商品3单位', NULL, 1, '商品3备注商品3备注商品3备注', '<p>我是商品3</p><p><br></p><p><img src=\"http://localhost:8888/1726753142143.jpg\" alt=\"\" data-href=\"\" style=\"width: 50%;\"/></p>', '2024-09-20 15:30:04', '2024-09-20 15:30:04');
INSERT INTO `goods` VALUES (18, '无无无', '无无无', NULL, 0, '无无无', '<p>暂无更多介绍</p>', '2024-09-20 16:40:44', '2024-09-20 16:40:44');
INSERT INTO `goods` VALUES (19, 'test4', '斤', NULL, 1, 'test4test4test4', '<p>暂无更多介绍</p>', '2024-09-24 15:44:29', '2024-09-24 15:44:29');
INSERT INTO `goods` VALUES (20, '123', '123', NULL, 0, '123', '<p>暂无更多介绍</p>', '2024-09-24 16:00:33', '2024-09-24 16:00:33');
INSERT INTO `goods` VALUES (21, '999', '999', NULL, 0, '999', '<p>暂无更多介绍</p>', '2024-09-24 16:03:11', '2024-09-24 16:03:11');
INSERT INTO `goods` VALUES (22, '88', '88', NULL, 0, '88', '<p>暂无更多介绍</p>', '2024-09-24 16:03:43', '2024-09-24 16:03:43');
INSERT INTO `goods` VALUES (24, 'test', '斤', NULL, 0, 'test~test', '<p>暂无更多介绍</p>', '2024-09-24 16:06:20', '2024-09-24 16:06:20');
INSERT INTO `goods` VALUES (25, '1111', '1111', NULL, 0, '1111', '<p>暂无更多介绍</p>', '2024-09-24 16:07:46', '2024-09-24 16:07:46');
INSERT INTO `goods` VALUES (26, '222', '222', NULL, 0, '222', '<p>暂无更多介绍</p>', '2024-09-24 16:09:18', '2024-09-24 16:09:18');
INSERT INTO `goods` VALUES (27, '333', '333', NULL, 0, '333', '<p>暂无更多介绍</p>', '2024-09-24 16:09:34', '2024-09-24 16:09:34');
INSERT INTO `goods` VALUES (28, '55', '55', NULL, 0, '55', '<p>暂无更多介绍</p>', '2024-09-24 16:11:55', '2024-09-24 16:11:55');
INSERT INTO `goods` VALUES (29, '555', '555', NULL, 0, '555', '<p>暂无更多介绍</p>', '2024-09-24 16:13:23', '2024-09-24 16:13:23');
INSERT INTO `goods` VALUES (30, '66', '66', NULL, 0, '66', '<p>暂无更多介绍</p>', '2024-09-24 16:14:21', '2024-09-24 16:14:21');
INSERT INTO `goods` VALUES (31, '77', '77', NULL, 0, '77', '<p>暂无更多介绍</p>', '2024-09-24 16:17:02', '2024-09-24 16:17:02');
INSERT INTO `goods` VALUES (32, '99', '99', NULL, 0, '99', '<p>暂无更多介绍</p>', '2024-09-24 16:17:53', '2024-09-24 16:17:53');
INSERT INTO `goods` VALUES (33, '88', '88', 10, 0, '88', '<p>暂无更多介绍</p>', '2024-09-24 16:23:56', '2024-09-29 14:20:14');
INSERT INTO `goods` VALUES (34, '99', '99', 6, 0, '99', '<p>暂无更多介绍</p>', '2024-09-24 16:24:20', '2024-09-29 14:20:12');
INSERT INTO `goods` VALUES (35, '777', '777', 5, 0, '777', '<p>暂无更多介绍</p>', '2024-09-24 16:27:26', '2024-09-29 14:20:10');
INSERT INTO `goods` VALUES (36, '99', '99', 6, 0, '99', '<p>暂无更多介绍</p>', '2024-09-24 16:27:49', '2024-09-29 14:20:09');
INSERT INTO `goods` VALUES (37, '88', '88', 5, 0, '8', '<p>暂无更多介绍</p>', '2024-09-24 16:28:06', '2024-09-29 14:20:04');
INSERT INTO `goods` VALUES (38, '8', '8', 5, 0, '8', '<p>暂无更多介绍</p>', '2024-09-24 16:28:37', '2024-09-29 14:20:05');
INSERT INTO `goods` VALUES (39, '1', '1', 6, 0, '1', '<p>暂无更多介绍</p>', '2024-09-24 16:29:01', '2024-09-29 14:20:08');
INSERT INTO `goods` VALUES (40, '1', '1', 3, 0, '1', '<p>暂无更多介绍</p>', '2024-09-24 16:29:18', '2024-09-29 14:20:03');
INSERT INTO `goods` VALUES (41, '3', '3', 3, 0, '3', '<p>暂无更多介绍</p>', '2024-09-24 16:29:40', '2024-09-29 14:20:01');
INSERT INTO `goods` VALUES (43, 'testtest', '斤', 3, 0, 'testtesttesttest', '<p>商品介绍富文本</p><p><br></p><p><img src=\"http://localhost:8888/goods-43_20240924-174300_l373zy.jpg\" alt=\"\" data-href=\"\" style=\"width: 50%;\"/></p>', '2024-09-24 17:18:46', '2024-09-29 14:20:02');
INSERT INTO `goods` VALUES (46, '111', '111', 2, 0, '111', '<p>111</p><p><br></p><p><img src=\"http://localhost:8888/goods-undefined_20240925-181110_v1devj.jpg\" alt=\"\" data-href=\"\" style=\"width: 30%;\"/></p>', '2024-09-25 18:14:50', '2024-09-29 14:19:59');
INSERT INTO `goods` VALUES (48, '1', '1', 2, 0, '1', '<p>暂无更多介绍</p><p><br></p><p><img src=\"http://localhost:8888/goods-undefined_20240925-181827_6anzoe.png\" alt=\"\" data-href=\"\" style=\"\"/></p>', '2024-09-25 18:19:31', '2024-09-29 14:20:00');
INSERT INTO `goods` VALUES (49, '222', '222', 2, 0, '222', '<p>暂无更多介绍</p><p><br></p><p><img src=\"http://localhost:8888/goods-49_20240926-104550_vfxi83.jpg\" alt=\"\" data-href=\"\" style=\"width: 30%;\"/></p>', '2024-09-25 18:25:05', '2024-09-29 14:19:57');
INSERT INTO `goods` VALUES (50, '11', '11', 2, 1, '11', '<p>暂无更多介绍</p>', '2024-09-26 10:46:35', '2024-09-29 16:02:33');
INSERT INTO `goods` VALUES (51, '123', '123', 8, 1, NULL, '<p>暂无更多介绍</p>', '2024-09-29 14:24:37', '2024-09-29 16:02:25');

-- ----------------------------
-- Table structure for goods_batch
-- ----------------------------
DROP TABLE IF EXISTS `goods_batch`;
CREATE TABLE `goods_batch`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `goods_id` int NOT NULL,
  `batch_no` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `batch_type` int NOT NULL COMMENT '0 预订 / 1 现卖',
  `batch_status` int NOT NULL COMMENT '状态：1进行中，0已结束',
  `batch_startTime` datetime NOT NULL,
  `batch_endTime` datetime NULL DEFAULT NULL,
  `batch_unitPrice` decimal(10, 2) NULL DEFAULT NULL COMMENT '现卖时的价格',
  `batch_minPrice` decimal(10, 2) NULL DEFAULT NULL COMMENT '预订时的价格区间',
  `batch_maxPrice` decimal(10, 2) NULL DEFAULT NULL COMMENT '预订时的价格区间',
  `batch_minQuantity` decimal(10, 1) NOT NULL COMMENT '最小购买或预订的数量',
  `batch_discounts` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL COMMENT '优惠策略',
  `batch_remark` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '批次备注',
  `snapshot_goodsName` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT '商品快照',
  `snapshot_goodsUnit` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT '商品快照',
  `snapshot_goodsRemark` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '商品快照',
  `snapshot_goodsRichText` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL COMMENT '商品快照',
  `createTime` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updateTime` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 9 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_bin ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of goods_batch
-- ----------------------------
INSERT INTO `goods_batch` VALUES (1, 17, '20240920154212_zp51w5', 0, 0, '2024-09-20 15:42:12', '2024-09-24 09:19:30', NULL, 10.00, 20.00, 1.0, '\"[{\\\"quantity\\\":2,\\\"discount\\\":10},{\\\"quantity\\\":4,\\\"discount\\\":20}]\"', '1111111111111111111111111111', '商品3名称', '商品3单位', '商品3备注商品3备注商品3备注', '<p>我是商品3</p><p><br></p><p><img src=\"http://localhost:8888/1726753142143.jpg\" alt=\"\" data-href=\"\" style=\"width: 50%;\"/></p>', '2024-09-20 15:42:12', '2024-09-24 09:19:30');
INSERT INTO `goods_batch` VALUES (2, 16, '20240920155132_9rsbwu', 1, 1, '2024-09-20 15:51:32', NULL, 15.00, NULL, NULL, 1.0, '\"[{\\\"quantity\\\":3,\\\"discount\\\":1},{\\\"quantity\\\":6,\\\"discount\\\":2}]\"', '2222222222222222222', '商品3名称', '商品3单位', '商品3备注商品3备注商品3备注', '<p>我是商品3</p><p><br></p><p><img src=\"http://localhost:8888/1726753142143.jpg\" alt=\"\" data-href=\"\" style=\"width: 50%;\"/></p>', '2024-09-20 15:51:32', '2024-09-23 09:03:17');
INSERT INTO `goods_batch` VALUES (3, 17, '20240924100157_g6cpvq', 1, 0, '2024-09-24 10:01:57', '2024-09-24 10:33:09', 1.00, NULL, NULL, 1.0, '\"[{\\\"quantity\\\":2,\\\"discount\\\":1},{\\\"quantity\\\":4,\\\"discount\\\":2}]\"', '22222222222', '商品3名称', '商品3单位', '商品3备注商品3备注商品3备注', '<p>我是商品3</p><p><br></p><p><img src=\"http://localhost:8888/1726753142143.jpg\" alt=\"\" data-href=\"\" style=\"width: 50%;\"/></p>', '2024-09-24 10:01:57', '2024-09-24 10:33:09');
INSERT INTO `goods_batch` VALUES (4, 17, '20240924110209_10lvfz', 0, 1, '2024-09-24 11:02:09', '2024-09-26 11:33:58', 3.00, NULL, NULL, 3.0, '\"[{\\\"quantity\\\":3,\\\"discount\\\":3}]\"', '3', '商品3名称', '商品3单位', '商品3备注商品3备注商品3备注', '<p>我是商品3</p><p><br></p><p><img src=\"http://localhost:8888/1726753142143.jpg\" alt=\"\" data-href=\"\" style=\"width: 50%;\"/></p>', '2024-09-24 11:02:09', '2024-09-29 15:30:03');
INSERT INTO `goods_batch` VALUES (5, 51, '20240929155423_bab015', 0, 1, '2024-09-29 15:54:23', NULL, NULL, 0.01, 0.01, 1.0, '\"[]\"', '', '123', '123', NULL, '<p>暂无更多介绍</p>', '2024-09-29 15:54:23', '2024-09-29 15:54:23');
INSERT INTO `goods_batch` VALUES (6, 50, '20240929155434_jto5ze', 1, 1, '2024-09-29 15:54:34', NULL, 0.01, NULL, NULL, 1.0, '\"[]\"', '', '11', '11', '11', '<p>暂无更多介绍</p>', '2024-09-29 15:54:34', '2024-09-29 15:54:34');
INSERT INTO `goods_batch` VALUES (7, 51, '20240929160225_jpydsp', 0, 1, '2024-09-29 16:02:25', NULL, NULL, 0.01, 0.01, 1.0, '\"[]\"', '', '123', '123', NULL, '<p>暂无更多介绍</p>', '2024-09-29 16:02:25', '2024-09-29 16:02:25');
INSERT INTO `goods_batch` VALUES (8, 50, '20240929160233_xhl28v', 1, 1, '2024-09-29 16:02:33', NULL, 0.01, NULL, NULL, 1.0, '\"[]\"', '', '11', '11', '11', '<p>暂无更多介绍</p>', '2024-09-29 16:02:33', '2024-09-29 16:02:33');

-- ----------------------------
-- Table structure for goods_media
-- ----------------------------
DROP TABLE IF EXISTS `goods_media`;
CREATE TABLE `goods_media`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `goods_id` int NOT NULL,
  `url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `fileType` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT 'image / video',
  `useType` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT 'swiper / richText',
  `position` int NULL DEFAULT NULL COMMENT '显示顺序的权重；如果是富文本用的图片则不填',
  `createTime` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 17 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_bin ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of goods_media
-- ----------------------------
INSERT INTO `goods_media` VALUES (14, 49, 'http://localhost:8888/goods-49_20240926-104539_dfs35t.jpg', 'image', 'swiper', 0, '2024-09-26 10:45:54');
INSERT INTO `goods_media` VALUES (15, 49, 'http://localhost:8888/goods-49_20240926-104544_qyvvu3.mp4', 'video', 'swiper', 1, '2024-09-26 10:45:54');
INSERT INTO `goods_media` VALUES (16, 49, 'http://localhost:8888/goods-49_20240926-104550_vfxi83.jpg', 'image', 'richText', NULL, '2024-09-26 10:45:54');

-- ----------------------------
-- Table structure for goods_swiper
-- ----------------------------
DROP TABLE IF EXISTS `goods_swiper`;
CREATE TABLE `goods_swiper`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `goods_id` int NOT NULL,
  `url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `type` int NOT NULL COMMENT '0 image；1 video',
  `position` int NULL DEFAULT NULL COMMENT '显示顺序的权重',
  `createTime` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 5 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_bin ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of goods_swiper
-- ----------------------------
INSERT INTO `goods_swiper` VALUES (1, 16, 'http://localhost:8888/1726753375193.mp4', 1, 0, '2024-09-19 21:49:43');
INSERT INTO `goods_swiper` VALUES (2, 16, 'http://localhost:8888/1726753377499.png', 0, 1, '2024-09-19 21:49:43');
INSERT INTO `goods_swiper` VALUES (3, 17, 'http://localhost:8888/1726753375193.mp4', 1, 0, '2024-09-20 15:30:04');
INSERT INTO `goods_swiper` VALUES (4, 17, 'http://localhost:8888/1726753377499.png', 0, 1, '2024-09-20 15:30:04');

-- ----------------------------
-- Table structure for other_file
-- ----------------------------
DROP TABLE IF EXISTS `other_file`;
CREATE TABLE `other_file`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL,
  `createTime` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 17 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_bin ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of other_file
-- ----------------------------
INSERT INTO `other_file` VALUES (4, 'http://localhost:8888/testtesttest.jpg', '测试用', '2024-09-25 09:48:41');
INSERT INTO `other_file` VALUES (15, 'http://localhost:8888/aboutUs_20240926-095925_kk4oxv.jpg', 'aboutUs', '2024-09-27 16:54:12');
INSERT INTO `other_file` VALUES (16, 'http://localhost:8888/aboutUs_20240927-164828_dj1dct.jpg', 'aboutUs', '2024-09-27 16:54:12');

SET FOREIGN_KEY_CHECKS = 1;
