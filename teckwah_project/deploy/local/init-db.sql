-- deploy/local/init-db.sql

-- 데이터베이스 생성
CREATE DATABASE IF NOT EXISTS delivery_system;
USE delivery_system;

-- 1. 스키마 생성
CREATE SCHEMA IF NOT EXISTS `delivery_system` 
  DEFAULT CHARACTER SET utf8mb4 
  COLLATE utf8mb4_0900_ai_ci;
USE `delivery_system`;

-- 2. postal_code 테이블 생성 (postal_code 크기 통일 및 NULL 허용 적용)
CREATE TABLE IF NOT EXISTS `postal_code` (
  `postal_code` VARCHAR(5) NOT NULL,
  `district` VARCHAR(100) NULL DEFAULT NULL,
  `city` VARCHAR(100) NULL DEFAULT NULL,
  `distance` INT NULL DEFAULT NULL,
  `bill_distance` INT NULL DEFAULT NULL, 
  `duration_time` INT NULL DEFAULT NULL,
  PRIMARY KEY (`postal_code`)
) ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;

-- 3. dashboard 테이블 생성 (복합 키 적용, 외래키 설정 최적화)
CREATE TABLE IF NOT EXISTS `dashboard` (
  `dashboard_id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `order_no` BIGINT NOT NULL,
  `type` ENUM('DELIVERY', 'RETURN') NOT NULL,
  `status` ENUM('WAITING', 'IN_PROGRESS', 'COMPLETE', 'ISSUE') NOT NULL DEFAULT 'WAITING',
  `department` ENUM('CS', 'HES', 'LENOVO') NOT NULL,
  `warehouse` ENUM('SEOUL', 'BUSAN', 'GWANGJU', 'DAEJEON') NOT NULL,
  `sla` ENUM('XHR', 'POX', 'EMC', 'WEWORK', 'LENOVO', 'ETC') NOT NULL,
  `eta` DATETIME NOT NULL,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `depart_time` DATETIME NULL DEFAULT NULL,
  `complete_time` DATETIME NULL DEFAULT NULL,
  `postal_code` VARCHAR(5) NOT NULL,
  `city` VARCHAR(100) NULL DEFAULT NULL,
  `district` VARCHAR(100) NULL DEFAULT NULL,
  `region` VARCHAR(255) GENERATED ALWAYS AS (CONCAT(city, '-', district)) STORED,
  `distance` INT NULL DEFAULT NULL,
  `duration_time` INT NULL DEFAULT NULL,
  `address` TEXT NOT NULL,
  `customer` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `contact` VARCHAR(20) NOT NULL,
  `remark` TEXT NULL DEFAULT NULL,
  `driver_name` VARCHAR(255) NULL DEFAULT NULL,
  `driver_contact` VARCHAR(50) NULL DEFAULT NULL,

  INDEX `idx_eta` (`eta` ASC) VISIBLE,
  CONSTRAINT `dashboard_ibfk_1`
    FOREIGN KEY (`postal_code`)
    REFERENCES `postal_code` (`postal_code`)
    ON DELETE CASCADE 
) ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;

-- 4. users 테이블 생성 (테이블명 및 외래키 수정)
CREATE TABLE IF NOT EXISTS `user` (
  `user_id` VARCHAR(50) NOT NULL,
  `user_password` VARCHAR(255) NOT NULL,
  `user_department` ENUM('CS', 'HES', 'LENOVO') NOT NULL,
  `user_role` ENUM('ADMIN', 'USER') NOT NULL,  -- 권한 컬럼 추가
  PRIMARY KEY (`user_id`)
) ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;

-- 5. refresh_tokens 테이블 생성 (user 테이블과 FK 수정)
CREATE TABLE IF NOT EXISTS `refresh_token` (
  `refresh_token_id` INT NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(50) NOT NULL,
  `refresh_token` VARCHAR(255) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`refresh_token_id`),
  CONSTRAINT `fk_user_token`
    FOREIGN KEY (`user_id`)
    REFERENCES `user`(`user_id`)  -- 테이블명 수정
    ON DELETE CASCADE
) ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;

-- 6. error_log 테이블 생성 (트리거 에러 로그 기록용)
CREATE TABLE IF NOT EXISTS `error_log` (
  `log_id` INT NOT NULL AUTO_INCREMENT,
  `error_message` TEXT NOT NULL,
  `failed_query` VARCHAR(255) NOT NULL,
  `logged_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`)
) ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;

-- 7. 트리거 수정 (NULL 허용 고려 및 최적화)
DELIMITER //

CREATE TRIGGER trg_dashboard_before_insert_postal
BEFORE INSERT ON `dashboard`
FOR EACH ROW
BEGIN
    DECLARE v_city VARCHAR(100);
    DECLARE v_district VARCHAR(100);
    DECLARE v_distance INT;
    DECLARE v_duration_time INT;
    DECLARE v_error_msg VARCHAR(255);
    
    -- 예외 핸들러
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION 
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        INSERT INTO `error_log` (error_message, failed_query)
        VALUES (v_error_msg, 'BEFORE INSERT - dashboard (postal_code)');
    END;
    
    -- postal_code 조회
    SELECT city, district, distance, duration_time
    INTO v_city, v_district, v_distance, v_duration_time
    FROM `postal_code`
    WHERE postal_code = NEW.postal_code
    LIMIT 1;
    
    -- NULL 허용 필드 업데이트
    SET NEW.city = v_city;
    SET NEW.district = v_district;
    SET NEW.distance = v_distance;
    SET NEW.duration_time = v_duration_time;
END;
//

DELIMITER ;
