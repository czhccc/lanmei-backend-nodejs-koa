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

 Date: 13/09/2024 18:43:28
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
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_bin ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of aboutus
-- ----------------------------
INSERT INTO `aboutus` VALUES (1, '[{\"lat\": \"29.505098\", \"lon\": \"120.686843\", \"address\": \"嵊州市美汐蓝莓专业合作社\"}, {\"lat\": \"30.236717\", \"lon\": \"120.432993\", \"address\": \"萧山国际机场T4航站楼\"}]', '[{\"type\": \"手机号\", \"contact\": \"13999999999\"}, {\"type\": \"微信号\", \"contact\": \"wx123456789\"}]', '<p>hello</p><p><img src=\"http://localhost:8888/1726208025011.png\" alt=\"\" data-href=\"\" style=\"width: 50%;\"/></p><p>111111111</p><p><br></p>');

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
) ENGINE = InnoDB AUTO_INCREMENT = 12 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_bin ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of admin
-- ----------------------------
INSERT INTO `admin` VALUES (1, '13989536936', 'e10adc3949ba59abbe56e057f20f883e', 'czh', 2, '2024-09-09 17:32:43', '2024-09-12 15:29:00');
INSERT INTO `admin` VALUES (2, '13333333334', 'e10adc3949ba59abbe56e057f20f883e', 'yjn4', 1, '2024-09-12 13:38:18', '2024-09-12 16:09:11');
INSERT INTO `admin` VALUES (10, '13333333333', 'e10adc3949ba59abbe56e057f20f883e', 'yjn', 1, '2024-09-09 17:32:10', '2024-09-12 15:28:53');
INSERT INTO `admin` VALUES (11, '13222222222', '96e79218965eb72c92a549dd5a330112', 'czh2', 1, '2024-09-12 16:07:30', '2024-09-12 16:11:13');

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
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_bin ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of comment
-- ----------------------------

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
  CONSTRAINT `comment_id` FOREIGN KEY (`comment_id`) REFERENCES `comment` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_bin ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of comment_response
-- ----------------------------

-- ----------------------------
-- Table structure for goods
-- ----------------------------
DROP TABLE IF EXISTS `goods`;
CREATE TABLE `goods`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 3 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_bin ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of goods
-- ----------------------------
INSERT INTO `goods` VALUES (1, '蓝莓');
INSERT INTO `goods` VALUES (2, '鸭子');

SET FOREIGN_KEY_CHECKS = 1;
