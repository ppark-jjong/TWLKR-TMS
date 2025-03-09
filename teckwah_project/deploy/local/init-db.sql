-- 1. 데이터베이스 생성 및 사용
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

-- 3. 허브별 상세 정보 테이블 생성
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
  user_role ENUM('ADMIN', 'USER') NOT NULL DEFAULT 'USER'
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
  FOREIGN KEY (user_id) REFERENCES user(user_id) ON DELETE CASCADE,
  INDEX idx_refresh_token (refresh_token),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- 6. 대시보드 정보를 저장할 dashboard 테이블 생성 (remark 필드 제거)
CREATE TABLE IF NOT EXISTS dashboard (
  dashboard_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_no varchar(15) NOT NULL,
  type ENUM('DELIVERY', 'RETURN') NOT NULL,
  status ENUM('WAITING', 'IN_PROGRESS', 'COMPLETE', 'ISSUE', 'CANCEL') NOT NULL DEFAULT 'WAITING',
  department ENUM('CS', 'HES', 'LENOVO') NOT NULL,
  warehouse ENUM('SEOUL', 'BUSAN', 'GWANGJU', 'DAEJEON') NOT NULL,
  sla VARCHAR(10) NOT NULL,
  eta DATETIME NOT NULL,
  create_time DATETIME NOT NULL,
  depart_time DATETIME NULL,
  complete_time DATETIME NULL,
  postal_code VARCHAR(5) NOT NULL,
  city VARCHAR(21) NULL,
  county VARCHAR(51) NULL,
  district VARCHAR(51) NULL,
  region VARCHAR(153) GENERATED ALWAYS AS (CONCAT(city, ' ', county, ' ', district)) STORED,
  distance INT NULL,
  duration_time INT NULL,
  address TEXT NOT NULL,
  customer VARCHAR(150) NOT NULL,
  contact VARCHAR(20) NULL, 
  driver_name VARCHAR(153) NULL,
  driver_contact VARCHAR(50) NULL,
  version INT NOT NULL DEFAULT 1,
  FOREIGN KEY (postal_code) REFERENCES postal_code(postal_code),
  INDEX idx_eta (eta),
  INDEX idx_status (status),
  INDEX idx_department (department),
  INDEX idx_version (version),
  INDEX idx_order_no (order_no)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- 7. 대시보드 메모 테이블 추가 (독립적인 구조로 설계)
CREATE TABLE IF NOT EXISTS dashboard_memo (
  memo_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  dashboard_id INT NOT NULL,
  user_id VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  formatted_content TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dashboard_id) REFERENCES dashboard(dashboard_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES user(user_id),
  INDEX idx_dashboard_id (dashboard_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- 8. 메모 자동 포맷팅 트리거 추가
DELIMITER //
CREATE TRIGGER memo_format_insert_trigger
BEFORE INSERT ON dashboard_memo
FOR EACH ROW
BEGIN
  SET NEW.formatted_content = CONCAT(NEW.user_id, ': ', NEW.content);
END//
DELIMITER ;

DELIMITER //
CREATE TRIGGER memo_format_update_trigger
BEFORE UPDATE ON dashboard_memo
FOR EACH ROW
BEGIN
  IF NEW.content != OLD.content OR NEW.user_id != OLD.user_id THEN
    SET NEW.formatted_content = CONCAT(NEW.user_id, ': ', NEW.content);
  END IF;
END//
DELIMITER ;

-- 9. dashboard 테이블 트리거 생성 (postal_code 정보 자동 연결)
DELIMITER //
CREATE TRIGGER trg_dashboard_before_insert
BEFORE INSERT ON dashboard
FOR EACH ROW
BEGIN
  -- 지역 정보 조회 및 설정
  DECLARE v_city VARCHAR(100);
  DECLARE v_county VARCHAR(100);
  DECLARE v_district VARCHAR(100);
  DECLARE v_distance INT;
  DECLARE v_duration_time INT;
  DECLARE v_count INT;

  -- postal_code 테이블에서 지역정보 조회
  SELECT COALESCE(city, ''), COALESCE(county, ''), COALESCE(district, '')
  INTO v_city, v_county, v_district
  FROM postal_code
  WHERE postal_code = NEW.postal_code;

  SET NEW.city = v_city;
  SET NEW.county = v_county;
  SET NEW.district = v_district;

  -- postal_code_detail에서 거리/시간 정보 조회
  SELECT COUNT(*) INTO v_count 
  FROM postal_code_detail 
  WHERE postal_code = NEW.postal_code AND warehouse = NEW.warehouse;
  
  IF v_count > 0 THEN
    SELECT distance, duration_time 
    INTO v_distance, v_duration_time
    FROM postal_code_detail 
    WHERE postal_code = NEW.postal_code AND warehouse = NEW.warehouse;
    
    SET NEW.distance = v_distance;
    SET NEW.duration_time = v_duration_time;
  ELSE
    -- 기본값 설정 후 postal_code_detail에 자동 추가
    SET NEW.distance = 0;
    SET NEW.duration_time = 0;
    
    INSERT INTO postal_code_detail (postal_code, warehouse, distance, duration_time)
    VALUES (NEW.postal_code, NEW.warehouse, 0, 0);
  END IF;

  -- 버전 초기화
  IF NEW.version IS NULL THEN
    SET NEW.version = 1;
  END IF;
END//
DELIMITER ;