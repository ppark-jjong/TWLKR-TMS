-- deploy/local/init-db.sql
-- 데이터베이스 생성
CREATE DATABASE IF NOT EXISTS delivery_system;
USE delivery_system;

-- 1. 스키마 생성
CREATE SCHEMA IF NOT EXISTS `delivery_system` 
  DEFAULT CHARACTER SET utf8mb4 
  COLLATE utf8mb4_0900_ai_ci;
USE `delivery_system`;

-- 2. postal_code 테이블 생성
CREATE TABLE IF NOT EXISTS `postal_code` (
  `postal_code` VARCHAR(10) NOT NULL,
  `district` VARCHAR(100) NOT NULL,
  `city` VARCHAR(100) NOT NULL,
  `distance` INT NULL DEFAULT NULL,
  `bill_distance` INT NULL DEFAULT NULL, 
  `duration_time` INT NULL DEFAULT NULL,
  PRIMARY KEY (`postal_code`)
) ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;

-- 3. driver 테이블 생성
CREATE TABLE IF NOT EXISTS `driver` (
  `driver_id` INT NOT NULL AUTO_INCREMENT,
  `driver_name` VARCHAR(100) NOT NULL,
  `driver_contact` VARCHAR(20) NOT NULL,
  `driver_remark` VARCHAR(255) NULL DEFAULT NULL,
  PRIMARY KEY (`driver_id`)
) ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;

-- 4. dashboard 테이블 생성
CREATE TABLE IF NOT EXISTS `dashboard` (
  `dashboard_id` INT NOT NULL AUTO_INCREMENT,
  `order_no` BIGINT NOT NULL,
  `type` ENUM('DELIVERY', 'RETURN') NOT NULL,
  `status` ENUM('WAITING', 'IN_PROGRESS', 'COMPLETE', 'ISSUE') NOT NULL DEFAULT 'WAITING',
  `department` ENUM('CS', 'HES', 'LENOVO') NOT NULL,
  `warehouse` ENUM('SEOUL', 'BUSAN', 'GWANGJU', 'DAEJEON') NOT NULL,
  `sla` ENUM('XHR', 'POX', 'EMC', 'WEWORK', 'LENOVO') NOT NULL,
  `eta` DATETIME NOT NULL,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `depart_time` DATETIME NULL DEFAULT NULL,
  `complete_time` DATETIME NULL DEFAULT NULL,
  `postal_code` VARCHAR(10) NOT NULL,
  `city` VARCHAR(100) NOT NULL,
  `district` VARCHAR(100) NOT NULL,
  `region` VARCHAR(255) GENERATED ALWAYS AS (CONCAT(city, ' ', district)) STORED,
  `distance` INT NULL DEFAULT NULL,
  `duration_time` INT NULL DEFAULT NULL,
  `address` TEXT NOT NULL,
  `customer` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `contact` VARCHAR(20) NOT NULL,
  `remark` TEXT NULL DEFAULT NULL,
  `driver_id` INT NULL DEFAULT NULL,
  `driver_name` VARCHAR(100) NULL DEFAULT NULL,
  `driver_contact` VARCHAR(20) NULL DEFAULT NULL,
  `driver_remark` VARCHAR(255) NULL DEFAULT NULL,

  PRIMARY KEY (`dashboard_id`, `order_no`),
  INDEX `postal_code` (`postal_code` ASC) VISIBLE,
  INDEX `idx_eta` (`eta` ASC) VISIBLE,
  CONSTRAINT `dashboard_ibfk_1`
    FOREIGN KEY (`postal_code`)
    REFERENCES `postal_code` (`postal_code`),
  CONSTRAINT `dashboard_ibfk_2`
    FOREIGN KEY (`driver_id`)
    REFERENCES `driver` (`driver_id`)
    ON DELETE SET NULL
) ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;

-- 5. users 테이블 생성 (권한 컬럼 추가)
CREATE TABLE IF NOT EXISTS `users` (
  `user_id` VARCHAR(50) NOT NULL,
  `user_password` VARCHAR(255) NOT NULL,
  `user_department` ENUM('CS', 'HES', 'LENOVO') NOT NULL,
  `user_role` ENUM('ADMIN', 'USER') NOT NULL,  -- 권한 컬럼 (추가)
  PRIMARY KEY (`user_id`)
) ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;

-- 6. refresh_tokens 테이블 생성
CREATE TABLE IF NOT EXISTS `refresh_tokens` (
  `token` VARCHAR(255) NOT NULL,
  `user_id` VARCHAR(50) NOT NULL,
  `expires_at` TIMESTAMP NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`token`),
  CONSTRAINT `fk_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE
) ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;

-- 7. error_log 테이블 생성 (트리거 에러 로그 기록용)
CREATE TABLE IF NOT EXISTS `error_log` (
  `log_id` INT NOT NULL AUTO_INCREMENT,
  `error_message` TEXT NOT NULL,
  `failed_query` VARCHAR(255) NOT NULL,
  `logged_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`)
) ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;

-- 8. 트리거 생성: dashboard 테이블에 postal_code, driver 정보를 자동 복사 및 에러 로그 기록
DELIMITER //

CREATE TRIGGER trg_dashboard_before_insert_postal
BEFORE INSERT ON `delivery_system`.`dashboard`
FOR EACH ROW
BEGIN
    DECLARE v_city VARCHAR(100);
    DECLARE v_district VARCHAR(100);
    DECLARE v_distance INT;
    DECLARE v_duration_time INT;
    DECLARE v_error_msg TEXT;
    
    -- 예외 핸들러 선언
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION 
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        INSERT INTO `delivery_system`.`error_log` (error_message, failed_query)
        VALUES (v_error_msg, 'BEFORE INSERT - dashboard (postal_code)');
    END;
    
    -- postal_code 조회
    SELECT 
        city, 
        district, 
        distance, 
        duration_time 
    INTO 
        v_city, 
        v_district, 
        v_distance, 
        v_duration_time
    FROM 
        `delivery_system`.`postal_code`
    WHERE 
        postal_code = NEW.postal_code
    LIMIT 1;
    
    -- 값 설정
    SET NEW.city = IFNULL(v_city, NEW.city);
    SET NEW.district = IFNULL(v_district, NEW.district);
    SET NEW.distance = IFNULL(v_distance, NEW.distance);
    SET NEW.duration_time = IFNULL(v_duration_time, NEW.duration_time);
    
END;
//

DELIMITER ;
DELIMITER //

CREATE TRIGGER trg_dashboard_after_update_driver
AFTER UPDATE ON `delivery_system`.`dashboard`
FOR EACH ROW
BEGIN
    DECLARE v_driver_name VARCHAR(100);
    DECLARE v_driver_contact VARCHAR(20);
	declare v_driver_remark VARCHAR(255);
    DECLARE v_error_msg TEXT;

    -- 예외 핸들러 선언
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION 
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
        INSERT INTO `delivery_system`.`error_log` (error_message, failed_query)
        VALUES (v_error_msg, 'AFTER UPDATE - dashboard (driver info)');
    END;

    -- driver_id가 변경된 경우에만 실행 (IS DISTINCT FROM 대신 사용)
    IF OLD.driver_id <> NEW.driver_id OR (OLD.driver_id IS NULL AND NEW.driver_id IS NOT NULL) THEN
        SELECT 
            driver_name, 
            driver_contact,
            driver_remark
        INTO 
            v_driver_name, 
            v_driver_contact,
            v_driver_remark
        FROM 
            `delivery_system`.`driver`
        WHERE 
            driver_id = NEW.driver_id
        LIMIT 1;

        -- driver 정보 업데이트
        UPDATE `delivery_system`.`dashboard`
        SET driver_name = IFNULL(v_driver_name, driver_name),
            driver_contact = IFNULL(v_driver_contact, driver_contact),
            driver_remark = IFNULL(v_driver_remark, driver_remark)
        WHERE dashboard_id = NEW.dashboard_id;
    END IF;

END;
//

DELIMITER ;

SET GLOBAL host_cache_size=0;
