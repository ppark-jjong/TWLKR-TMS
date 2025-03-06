-- 1. 데이터베이스 생성
CREATE DATABASE IF NOT EXISTS delivery_system
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE=utf8mb4_unicode_ci;
USE delivery_system;

-- 2. 기본 지역 정보를 저장할 postal_code 테이블 생성
CREATE TABLE IF NOT EXISTS postal_code (
  postal_code VARCHAR(5) NOT NULL PRIMARY KEY, -- 우편번호 (5자)
  city VARCHAR(100) NULL, -- 지역정보 1
  county VARCHAR(100) NULL, -- 지역정보 2
  district VARCHAR(100) NULL -- 지역정보 3
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- 3. 허브별 거리 및 소요시간 정보를 저장할 postal_code_detail 테이블 생성
CREATE TABLE IF NOT EXISTS postal_code_detail (
  postal_code VARCHAR(5) NOT NULL, -- 우편번호 (5자리)
  warehouse ENUM('SEOUL', 'BUSAN', 'GWANGJU', 'DAEJEON') NOT NULL, -- 허브 종류
  distance INT NOT NULL, -- 거리
  duration_time INT NOT NULL, -- 예상 소요 시간
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

-- 6. 대시보드 정보를 저장할 dashboard 테이블 생성 (version 컬럼 추가)
CREATE TABLE IF NOT EXISTS dashboard (
  dashboard_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, -- 대시보드 id
  order_no BIGINT NOT NULL, -- 주문번호 (배송과 회수 겹칠 때 있음)
  type ENUM('DELIVERY', 'RETURN') NOT NULL, -- 타입 (배송, 회수)
  status ENUM('WAITING', 'IN_PROGRESS', 'COMPLETE', 'ISSUE', 'CANCEL') NOT NULL DEFAULT 'WAITING', -- 상태 (대기, 진행, 완료, 이슈, 취소)
  department ENUM('CS', 'HES', 'LENOVO') NOT NULL, -- user 부서값 중복 저장 
  warehouse ENUM('SEOUL', 'BUSAN', 'GWANGJU', 'DAEJEON') NOT NULL, -- 허브 종류 (서울, 부산, 광주, 대전)
  sla VARCHAR(10) NOT NULL, -- SLA 타입 (입력창 문자열 입력 - 현재는 별 의미 없음)
  eta DATETIME NOT NULL, -- ETA
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, -- dashboard 생성 시각
  depart_time DATETIME NULL, -- 대기 -> 진행 상태 변경 시 시각
  complete_time DATETIME NULL, -- 진행 -> 완료, 취소, 이슈 상태 변경 시 시각
  postal_code VARCHAR(5) NOT NULL, -- 우편번호 (외래키)
  city VARCHAR(100) NULL,   -- postal_code 테이블의 city 데이터 중복 저장
  county VARCHAR(100) NULL, -- postal_code 테이블의 county 데이터 중복 저장
  district VARCHAR(100) NULL, -- postal_code 테이블의 district 데이터 중복 저장
  region VARCHAR(255) GENERATED ALWAYS AS (CONCAT(city, ' ', county, ' ', district)) STORED, -- 지역 정보 조합
  distance INT NULL, -- postal_code_detail 테이블의 distance 데이터 중복 저장
  duration_time INT NULL, -- postal_code_detail 테이블의 duration_time 데이터 중복 저장
  address TEXT NOT NULL, -- 주소
  customer VARCHAR(255) NOT NULL, -- 수령인
  contact VARCHAR(20) NULL, -- 수령인 연락처
  remark TEXT NULL, -- 메모
  driver_name VARCHAR(255) NULL, -- 배송 담당자
  driver_contact VARCHAR(50) NULL, -- 배송 담당자 연락처
  version INT NOT NULL DEFAULT 1, -- 낙관적 락을 위한 버전 필드 추가
  FOREIGN KEY (postal_code) REFERENCES postal_code(postal_code),
  INDEX idx_eta (eta),
  INDEX idx_status (status),
  INDEX idx_department (department),
  INDEX idx_version (version) -- 버전 인덱스 추가
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- 7. dashboard 테이블과 postal_code_detail 테이블의 (postal_code, warehouse) 컬럼 간 복합 외래키 추가
ALTER TABLE dashboard
  ADD CONSTRAINT fk_dashboard_postal_detail
  FOREIGN KEY (postal_code, warehouse) REFERENCES postal_code_detail(postal_code, warehouse);

-- 8. 트리거 생성: INSERT 시 postal_code 테이블에서 지역정보를, 
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
  DECLARE v_count INT;

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
  
  -- 초기 버전 설정 (낙관적 락을 위함)
  IF NEW.version IS NULL THEN
    SET NEW.version = 1;
  END IF;
END//

-- 9. 낙관적 락 충돌을 감지하는 트리거 추가
CREATE TRIGGER trg_dashboard_before_update_version
BEFORE UPDATE ON dashboard
FOR EACH ROW
BEGIN
  -- 버전 증가 (자동으로 처리)
  IF OLD.version = NEW.version THEN
    SET NEW.version = OLD.version + 1;
  END IF;
END//

DELIMITER ;