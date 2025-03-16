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

-- 3. 통합된 postal_code_detail 테이블 생성 (창고별 분리 대신 통합)
CREATE TABLE IF NOT EXISTS postal_code_detail (
   postal_code VARCHAR(5) NOT NULL,
   warehouse ENUM('SEOUL', 'BUSAN', 'GWANGJU', 'DAEJEON') NOT NULL,
   distance INT NOT NULL,
   duration_time INT NOT NULL,
   PRIMARY KEY (postal_code, warehouse),
   FOREIGN KEY (postal_code) REFERENCES postal_code(postal_code),
   INDEX idx_warehouse_postal (warehouse, postal_code) -- 성능 최적화를 위한 복합 인덱스
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
  FOREIGN KEY (user_id) REFERENCES user(user_id) ON DELETE CASCADE,
  INDEX idx_token (refresh_token), -- 토큰 검색 최적화
  INDEX idx_expires (expires_at) -- 만료된 토큰 정리 최적화
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- 6. 대시보드 정보를 저장할 dashboard 테이블 생성 (remark 필드 제거됨)
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
  INDEX idx_create_time (create_time), -- 최적화: 생성 시간 기준 조회 성능 향상
  INDEX idx_status (status),
  INDEX idx_department (department),
  INDEX idx_version (version),
  INDEX idx_order_no (order_no) -- 최적화: 주문번호 기준 검색 성능 향상
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- 7. 대시보드 메모 테이블 생성 (remark 기능 분리)
CREATE TABLE IF NOT EXISTS dashboard_remark (
  remark_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  dashboard_id INT NOT NULL,
  content TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(50) NOT NULL,
  version INT NOT NULL DEFAULT 1,
  FOREIGN KEY (dashboard_id) REFERENCES dashboard(dashboard_id) ON DELETE CASCADE,
  INDEX idx_dashboard_id (dashboard_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- 8. 비관적 락을 관리하기 위한 테이블 생성
CREATE TABLE IF NOT EXISTS dashboard_lock (
  dashboard_id INT NOT NULL PRIMARY KEY,
  locked_by VARCHAR(50) NOT NULL,
  locked_at DATETIME NOT NULL,
  lock_type ENUM('EDIT', 'STATUS', 'ASSIGN', 'REMARK') NOT NULL,
  expires_at DATETIME NOT NULL,
  FOREIGN KEY (dashboard_id) REFERENCES dashboard(dashboard_id) ON DELETE CASCADE,
  INDEX idx_expires_at (expires_at),
  INDEX idx_locked_by (locked_by) -- 최적화: 사용자별 락 조회
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- 10. 트리거 생성: dashboard 테이블 INSERT 시 지역정보와 해당 허브별 거리/소요시간 자동 설정
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
  DECLARE v_postal_exists INT;

  -- 우편번호가 존재하는지 확인
  SELECT COUNT(*) INTO v_postal_exists FROM postal_code WHERE postal_code = NEW.postal_code;
  
  -- 우편번호가 존재하면 지역 정보 가져오기
  IF v_postal_exists > 0 THEN
    SELECT city, county, district
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
      SELECT distance, duration_time INTO v_distance, v_duration_time
      FROM postal_code_detail 
      WHERE postal_code = NEW.postal_code AND warehouse = NEW.warehouse;
      
      SET NEW.distance = v_distance;
      SET NEW.duration_time = v_duration_time;
    ELSE
      -- 해당 허브 정보가 없으면 기본값 0 설정
      SET NEW.distance = 0;
      SET NEW.duration_time = 0;
    END IF;
  ELSE
    -- 우편번호가 존재하지 않으면 기본값 설정
    -- 데이터베이스 레벨에서는 최소한의 처리만 수행 (NULL 유지)
    SET NEW.distance = 0;
    SET NEW.duration_time = 0;
  END IF;
  
  -- 초기 버전 설정
  IF NEW.version IS NULL THEN
    SET NEW.version = 1;
  END IF;
END//

DELIMITER ;

-- 데이터 변경 추적용으로 트리거 수정
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

-- 12. 트리거 생성: dashboard_remark 테이블 INSERT 시 검증
DELIMITER //
CREATE TRIGGER trg_dashboard_remark_before_insert
BEFORE INSERT ON dashboard_remark
FOR EACH ROW
BEGIN
  -- 사용자 ID 존재 확인
  IF NEW.created_by IS NULL OR TRIM(NEW.created_by) = '' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '사용자 ID는 필수 항목입니다';
  END IF;
  
  -- 초기 버전 설정
  IF NEW.version IS NULL THEN
    SET NEW.version = 1;
  END IF;
END//
DELIMITER ;