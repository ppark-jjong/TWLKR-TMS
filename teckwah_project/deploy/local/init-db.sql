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

-- 3. 허브별 상세 정보를 저장할 개별 테이블 생성 (warehouse 컬럼 제거)
CREATE TABLE IF NOT EXISTS postal_seoul (
  postal_code VARCHAR(5) NOT NULL PRIMARY KEY,
  distance INT NOT NULL,
  duration_time INT NOT NULL,
  FOREIGN KEY (postal_code) REFERENCES postal_code(postal_code)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS postal_daejeon (
  postal_code VARCHAR(5) NOT NULL PRIMARY KEY,
  distance INT NOT NULL,
  duration_time INT NOT NULL,
  FOREIGN KEY (postal_code) REFERENCES postal_code(postal_code)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS postal_busan (
  postal_code VARCHAR(5) NOT NULL PRIMARY KEY,
  distance INT NOT NULL,
  duration_time INT NOT NULL,
  FOREIGN KEY (postal_code) REFERENCES postal_code(postal_code)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS postal_gwangju (
  postal_code VARCHAR(5) NOT NULL PRIMARY KEY,
  distance INT NOT NULL,
  duration_time INT NOT NULL,
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

-- 6. 대시보드 정보를 저장할 dashboard 테이블 생성
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
  city VARCHAR(21) NULL,-- 한글 7글자
  county VARCHAR(51) NULL, -- 한글 17글자
  district VARCHAR(51) NULL, -- 한글 17글자
  region VARCHAR(153) GENERATED ALWAYS AS (CONCAT(city, ' ', county, ' ', district)) STORED,
  distance INT NULL,
  duration_time INT NULL,
  address TEXT NOT NULL,
  customer VARCHAR(150) NOT NULL, -- 한글 50글자
  contact VARCHAR(20) NULL, 
  remark TEXT NULL,
  driver_name VARCHAR(153) NULL, -- 한글 50글자
  driver_contact VARCHAR(50) NULL,
  version INT NOT NULL DEFAULT 1,
  FOREIGN KEY (postal_code) REFERENCES postal_code(postal_code),
  INDEX idx_eta (eta),
  INDEX idx_status (status),
  INDEX idx_department (department),
  INDEX idx_version (version)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- 7. 트리거 생성: dashboard 테이블 INSERT 시 지역정보와 해당 허브별 거리/소요시간 자동 설정
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
  DECLARE v_count INT;

  -- (1) postal_code 테이블에서 지역정보 조회
  SELECT COALESCE(city, ''), COALESCE(county, ''), COALESCE(district, '')
  INTO v_city, v_county, v_district
  FROM postal_code
  WHERE postal_code = NEW.postal_code;

  SET NEW.city = v_city;
  SET NEW.county = v_county;
  SET NEW.district = v_district;

  -- (2) warehouse 값에 따라 해당 테이블에서 distance와 duration_time 조회 및 없으면 기본값(0, 0)으로 INSERT
  IF NEW.warehouse = 'SEOUL' THEN
    SELECT COUNT(*) INTO v_count FROM postal_seoul WHERE postal_code = NEW.postal_code;
    IF v_count > 0 THEN
      SELECT distance, duration_time INTO v_distance, v_duration_time
      FROM postal_seoul WHERE postal_code = NEW.postal_code;
    ELSE
      SET v_distance = 0;
      SET v_duration_time = 0;
      INSERT INTO postal_seoul (postal_code, distance, duration_time)
      VALUES (NEW.postal_code, v_distance, v_duration_time);
    END IF;
    
  ELSEIF NEW.warehouse = 'DAEJEON' THEN
    SELECT COUNT(*) INTO v_count FROM postal_daejeon WHERE postal_code = NEW.postal_code;
    IF v_count > 0 THEN
      SELECT distance, duration_time INTO v_distance, v_duration_time
      FROM postal_daejeon WHERE postal_code = NEW.postal_code;
    ELSE
      SET v_distance = 0;
      SET v_duration_time = 0;
      INSERT INTO postal_daejeon (postal_code, distance, duration_time)
      VALUES (NEW.postal_code, v_distance, v_duration_time);
    END IF;
    
  ELSEIF NEW.warehouse = 'BUSAN' THEN
    SELECT COUNT(*) INTO v_count FROM postal_busan WHERE postal_code = NEW.postal_code;
    IF v_count > 0 THEN
      SELECT distance, duration_time INTO v_distance, v_duration_time
      FROM postal_busan WHERE postal_code = NEW.postal_code;
    ELSE
      SET v_distance = 0;
      SET v_duration_time = 0;
      INSERT INTO postal_busan (postal_code, distance, duration_time)
      VALUES (NEW.postal_code, v_distance, v_duration_time);
    END IF;
    
  ELSEIF NEW.warehouse = 'GWANGJU' THEN
    SELECT COUNT(*) INTO v_count FROM postal_gwangju WHERE postal_code = NEW.postal_code;
    IF v_count > 0 THEN
      SELECT distance, duration_time INTO v_distance, v_duration_time
      FROM postal_gwangju WHERE postal_code = NEW.postal_code;
    ELSE
      SET v_distance = 0;
      SET v_duration_time = 0;
      INSERT INTO postal_gwangju (postal_code, distance, duration_time)
      VALUES (NEW.postal_code, v_distance, v_duration_time);
    END IF;
  END IF;

  SET NEW.distance = v_distance;
  SET NEW.duration_time = v_duration_time;
  
  -- (3) 초기 버전 값 설정 (낙관적 락을 위함)
  IF NEW.version IS NULL THEN
    SET NEW.version = 1;
  END IF;
END//
  
DELIMITER ;

-- 8. 트리거 생성: dashboard 테이블 UPDATE 시 버전 자동 증가 (낙관적 락)
DELIMITER //
CREATE TRIGGER trg_dashboard_before_update_version
BEFORE UPDATE ON dashboard
FOR EACH ROW
BEGIN
  IF OLD.version = NEW.version THEN
    SET NEW.version = OLD.version + 1;
  END IF;
END//
DELIMITER ;
