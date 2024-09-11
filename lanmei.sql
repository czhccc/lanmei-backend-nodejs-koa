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

 Date: 11/09/2024 21:54:25
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for admin
-- ----------------------------
DROP TABLE IF EXISTS `admin`;
CREATE TABLE `admin`  (
  `phone` varchar(11) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT '唯一、联合主键',
  `password` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '159357',
  `name` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT '名字、唯一、联合主键',
  `role` int NOT NULL DEFAULT 1 COMMENT '1-管理员；2-超管',
  `createTime` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updateTime` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`phone`, `name`) USING BTREE,
  UNIQUE INDEX `phone`(`phone` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_bin ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of admin
-- ----------------------------
INSERT INTO `admin` VALUES ('13333333333', 'e10adc3949ba59abbe56e057f20f883e', 'yjn', 1, '2024-09-09 17:32:10', '2024-09-09 17:32:10');
INSERT INTO `admin` VALUES ('13989536936', 'e10adc3949ba59abbe56e057f20f883e', 'czh', 1, '2024-09-09 17:32:43', '2024-09-09 17:32:43');
INSERT INTO `admin` VALUES ('13989536937', 'e10adc3949ba59abbe56e057f20f883e', 'czh3', 1, '2024-09-10 19:53:11', '2024-09-10 19:53:11');
INSERT INTO `admin` VALUES ('13989536938', 'e10adc3949ba59abbe56e057f20f883e', 'czh2', 1, '2024-09-10 11:39:38', '2024-09-10 11:39:51');
INSERT INTO `admin` VALUES ('13989536939', 'e10adc3949ba59abbe56e057f20f883e', 'czh4', 1, '2024-09-11 12:54:45', '2024-09-11 12:54:45');
INSERT INTO `admin` VALUES ('13989536940', 'e10adc3949ba59abbe56e057f20f883e', 'czh4', 1, '2024-09-11 18:45:31', '2024-09-11 18:45:31');
INSERT INTO `admin` VALUES ('13989536999', 'e10adc3949ba59abbe56e057f20f883e', 'czh4', 1, '2024-09-11 21:20:54', '2024-09-11 21:20:54');

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
