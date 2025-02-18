-- 데이터베이스 생성 (기본 문자셋 지정)
CREATE DATABASE IF NOT EXISTS delivery_system
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;
USE delivery_system;

-- postal_code 테이블 생성 (기본 문자셋 지정)
CREATE TABLE IF NOT EXISTS postal_code (
  postal_code VARCHAR(5) NOT NULL PRIMARY KEY,
  district VARCHAR(100) NULL,
  depart_hub ENUM('SEOUL', 'BUSAN', 'GWANGJU', 'DAEJEON') NOT NULL,
  city VARCHAR(100) NULL,
  county VARCHAR(100) NULL,
  distance INT NULL,
  duration_time INT NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- user 테이블 생성 (기본 문자셋 지정)
CREATE TABLE IF NOT EXISTS user (
  user_id VARCHAR(50) NOT NULL PRIMARY KEY,
  user_password VARCHAR(255) NOT NULL,
  user_department ENUM('CS', 'HES', 'LENOVO') NOT NULL,
  user_role ENUM('ADMIN', 'USER') NOT NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- refresh_token 테이블 생성 (기본 문자셋 지정)
CREATE TABLE IF NOT EXISTS refresh_token (
  refresh_token_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  refresh_token VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user(user_id) ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- dashboard 테이블 생성 (기본 문자셋 지정)
CREATE TABLE IF NOT EXISTS dashboard (
  dashboard_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_no BIGINT NOT NULL,
  type ENUM('DELIVERY', 'RETURN') NOT NULL,
  status ENUM('WAITING', 'IN_PROGRESS', 'COMPLETE', 'ISSUE', 'CANCEL') NOT NULL DEFAULT 'WAITING',
  department ENUM('CS', 'HES', 'LENOVO') NOT NULL,
  warehouse ENUM('SEOUL', 'BUSAN', 'GWANGJU', 'DAEJEON') NOT NULL,
  sla VARCHAR(10) NOT NULL,
  eta DATETIME NOT NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  depart_time DATETIME NULL,
  complete_time DATETIME NULL,
  postal_code VARCHAR(5) NOT NULL,
  city VARCHAR(100) NULL,  
  county VARCHAR(100) NULL,
  district VARCHAR(100) NULL,
  region VARCHAR(255) GENERATED ALWAYS AS (CONCAT(city, ' ', county, ' ', district)) STORED,
  distance INT NULL,
  duration_time INT NULL,
  address TEXT NOT NULL,
  customer VARCHAR(255) NULL,
  contact VARCHAR(20) NULL,
  remark TEXT NULL,
  driver_name VARCHAR(255) NULL,
  driver_contact VARCHAR(50) NULL,
  FOREIGN KEY (postal_code) REFERENCES postal_code(postal_code),
  INDEX idx_eta (eta),
  INDEX idx_status (status),
  INDEX idx_department (department)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- error_log 테이블 생성 (기본 문자셋 지정)
CREATE TABLE IF NOT EXISTS error_log (
  log_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  error_message TEXT NOT NULL,
  failed_query VARCHAR(255) NOT NULL,
  logged_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


DELIMITER //

CREATE TRIGGER trg_dashboard_before_insert_postal
BEFORE INSERT ON dashboard
FOR EACH ROW
BEGIN
  DECLARE v_city VARCHAR(100);
  DECLARE v_district VARCHAR(100);
  DECLARE v_county VARCHAR(100);
  DECLARE v_distance INT;
  DECLARE v_duration_time INT;
  DECLARE v_depart_hub ENUM('SEOUL','BUSAN','GWANGJU','DAEJEON');
  DECLARE v_error_msg VARCHAR(255);

  -- 예외 핸들러
  DECLARE CONTINUE HANDLER FOR SQLEXCEPTION 
  BEGIN
    GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
    INSERT INTO error_log (error_message, failed_query)
    VALUES (v_error_msg, CONCAT('ERROR: postal_code lookup failed for: ', NEW.postal_code));
  END;

  -- postal_code와 depart_hub(=입력된 warehouse) 모두를 만족하는 행을 조회
  SELECT 
    COALESCE(city, ''), 
    COALESCE(county, ''),
    COALESCE(district, ''), 
    COALESCE(distance, 0), 
    COALESCE(duration_time, 0),
    depart_hub
  INTO v_city, v_county, v_district, v_distance, v_duration_time, v_depart_hub
  FROM postal_code
  WHERE postal_code = NEW.postal_code
    AND depart_hub = NEW.warehouse;

  -- 조회된 데이터가 있으면 dashboard 테이블의 필드를 업데이트
  IF v_city != '' OR v_district != '' THEN
    SET NEW.city = v_city;
    SET NEW.county = v_county;
    SET NEW.district = v_district;
  END IF;

  SET NEW.distance = v_distance;
  SET NEW.duration_time = v_duration_time;
  -- depart_hub(=v_depart_hub)는 이미 NEW.warehouse와 일치하므로 재할당(선택사항)
  SET NEW.warehouse = v_depart_hub;
END//

DELIMITER ;
