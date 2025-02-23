-- 1. 데이터베이스 생성
CREATE DATABASE IF NOT EXISTS delivery_system
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE=utf8mb4_unicode_ci;
USE delivery_system;

-- 2. 기본 지역 정보를 저장할 postal_code 테이블 생성
CREATE TABLE IF NOT EXISTS postal_code (
  postal_code VARCHAR(5) NOT NULL PRIMARY KEY,
  city VARCHAR(100) NULL,
  county VARCHAR(100) NULL,
  district VARCHAR(100) NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- 3. 허브별 거리 및 소요시간 정보를 저장할 postal_code_detail 테이블 생성
CREATE TABLE IF NOT EXISTS postal_code_detail (
  postal_code VARCHAR(5) NOT NULL,
  warehouse ENUM('SEOUL', 'BUSAN', 'GWANGJU', 'DAEJEON') NOT NULL,
  distance INT NOT NULL,
  duration_time INT NOT NULL,
  PRIMARY KEY (postal_code, warehouse),
  FOREIGN KEY (postal_code) REFERENCES postal_code(postal_code)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- 4. 사용자 정보를 저장할 user 테이블 생성
CREATE TABLE IF NOT EXISTS user (
  user_id VARCHAR(50) NOT NULL PRIMARY KEY,
  user_password VARCHAR(255) NOT NULL,
  user_department ENUM('CS', 'HES', 'LENOVO') NOT NULL,
  user_role ENUM('ADMIN', 'USER') NOT NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- 5. 리프레시 토큰 관리를 위한 refresh_token 테이블 생성
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


-- 7. 대시보드 정보를 저장할 dashboard 테이블 생성
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

-- 8. dashboard 테이블과 postal_code_detail 테이블의 (postal_code, warehouse) 컬럼 간 복합 외래키 추가
ALTER TABLE dashboard
  ADD CONSTRAINT fk_dashboard_postal_detail
  FOREIGN KEY (postal_code, warehouse) REFERENCES postal_code_detail(postal_code, warehouse);

-- 9. 트리거 생성: INSERT 시 postal_code 테이블에서 지역정보를, 
--    postal_code_detail 테이블에서 (postal_code, warehouse) 조건에 따른 distance와 duration_time 값을 가져오며,
--    만약 해당 조합이 없으면 기본값(0, 0)을 넣고 기본 행을 생성
DELIMITER //

CREATE TRIGGER trg_dashboard_before_insert_postal
BEFORE INSERT ON dashboard
FOR EACH ROW
BEGIN
  DECLARE v_city VARCHAR(100);
  DECLARE v_county VARCHAR(100);
  DECLARE v_district VARCHAR(100);
  DECLARE v_distance INT;
  DECLARE v_duration_time INT;
  DECLARE v_error_msg VARCHAR(255);
  DECLARE v_count INT;

  -- 예외 발생 시 에러 로그에 기록
  DECLARE CONTINUE HANDLER FOR SQLEXCEPTION 
  BEGIN
    GET DIAGNOSTICS CONDITION 1 v_error_msg = MESSAGE_TEXT;
    INSERT INTO error_log (error_message, failed_query)
      VALUES (v_error_msg, CONCAT('ERROR: postal_code lookup failed for: ', NEW.postal_code));
  END;

  -- (1) postal_code 테이블에서 지역정보(city, county, district) 조회
  SELECT 
    COALESCE(city, ''), 
    COALESCE(county, ''), 
    COALESCE(district, '')
  INTO v_city, v_county, v_district
  FROM postal_code
  WHERE postal_code = NEW.postal_code;

  SET NEW.city = v_city;
  SET NEW.county = v_county;
  SET NEW.district = v_district;

  -- (2) postal_code_detail 테이블에서 (postal_code, warehouse)로 distance와 duration_time 조회
  SELECT COUNT(*) INTO v_count
  FROM postal_code_detail
  WHERE postal_code = NEW.postal_code 
    AND warehouse = NEW.warehouse;

  IF v_count > 0 THEN
    SELECT distance, duration_time
    INTO v_distance, v_duration_time
    FROM postal_code_detail
    WHERE postal_code = NEW.postal_code 
      AND warehouse = NEW.warehouse;
  ELSE
    SET v_distance = 0;
    SET v_duration_time = 0;
    INSERT INTO postal_code_detail (postal_code, warehouse, distance, duration_time)
      VALUES (NEW.postal_code, NEW.warehouse, v_distance, v_duration_time);
  END IF;

  SET NEW.distance = v_distance;
  SET NEW.duration_time = v_duration_time;
END//

DELIMITER ;
