-- 데이터베이스 생성
CREATE DATABASE IF NOT EXISTS teckwah_dashboard CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE teckwah_dashboard;

-- 사용자 테이블
CREATE TABLE IF NOT EXISTS user (
  user_id VARCHAR(50) PRIMARY KEY,
  password VARCHAR(100) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role ENUM('ADMIN', 'USER') NOT NULL DEFAULT 'USER',
  department VARCHAR(100),
  refresh_token VARCHAR(500),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 대시보드 테이블
CREATE TABLE IF NOT EXISTS dashboard (
  dashboard_id VARCHAR(10) PRIMARY KEY,
  order_number VARCHAR(50) NOT NULL UNIQUE,
  customer_name VARCHAR(100) NOT NULL,
  delivery_address TEXT NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  status ENUM('PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  department VARCHAR(100) NOT NULL,
  driver_id VARCHAR(50),
  estimated_delivery DATETIME,
  actual_delivery DATETIME,
  order_items TEXT,
  order_note TEXT,
  priority ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM',
  created_by VARCHAR(50) NOT NULL,
  updated_by VARCHAR(50),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_status_change DATETIME,
  longitude DECIMAL(10, 7),
  latitude DECIMAL(10, 7),
  status_history TEXT,
  
  FOREIGN KEY (created_by) REFERENCES user(user_id) ON DELETE CASCADE,
  FOREIGN KEY (updated_by) REFERENCES user(user_id) ON DELETE SET NULL,
  FOREIGN KEY (driver_id) REFERENCES user(user_id) ON DELETE SET NULL,
  
  INDEX idx_dashboard_status (status),
  INDEX idx_dashboard_department (department),
  INDEX idx_dashboard_estimated_delivery (estimated_delivery),
  INDEX idx_dashboard_driver (driver_id),
  INDEX idx_dashboard_priority (priority),
  INDEX idx_dashboard_last_status_change (last_status_change)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 인수인계 테이블
CREATE TABLE IF NOT EXISTS handover (
  handover_id VARCHAR(10) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  created_by VARCHAR(50) NOT NULL,
  updated_by VARCHAR(50),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_notice BOOLEAN DEFAULT FALSE,
  department VARCHAR(100),
  priority ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL DEFAULT 'MEDIUM',
  expiry_date DATETIME,
  
  FOREIGN KEY (created_by) REFERENCES user(user_id) ON DELETE CASCADE,
  FOREIGN KEY (updated_by) REFERENCES user(user_id) ON DELETE SET NULL,
  
  INDEX idx_handover_date (created_at),
  INDEX idx_handover_notice (is_notice),
  INDEX idx_handover_department (department),
  INDEX idx_handover_priority (priority),
  INDEX idx_handover_expiry (expiry_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 기본 관리자 계정 생성 (비밀번호: admin123)
INSERT INTO user (user_id, password, name, role, department)
VALUES ('admin', '$2b$10$iQZ5jB7fM5QUFjJ8.XaMQ.QGc6RqHnZ86LCZgJxR1k.ZK3J3kdZUS', '관리자', 'ADMIN', '시스템관리');

-- 기본 사용자 계정 생성 (비밀번호: user123)
INSERT INTO user (user_id, password, name, role, department)
VALUES 
('user1', '$2b$10$dNMpwRWXkidQkLxS6TBsAObNsn3c5OxMMEAJEyBtvs98XeNc9vE6.', '김배송', 'USER', '배송1팀'),
('user2', '$2b$10$dNMpwRWXkidQkLxS6TBsAObNsn3c5OxMMEAJEyBtvs98XeNc9vE6.', '이관제', 'USER', '배송2팀'),
('user3', '$2b$10$dNMpwRWXkidQkLxS6TBsAObNsn3c5OxMMEAJEyBtvs98XeNc9vE6.', '박직원', 'USER', '운영팀');

-- 샘플 대시보드 데이터
INSERT INTO dashboard (
  dashboard_id, order_number, customer_name, delivery_address, phone_number, 
  status, department, driver_id, estimated_delivery, priority, 
  created_by, order_note, latitude, longitude, status_history
)
VALUES
(
  'D001', 'ORD-20250410-001', '홍길동', '서울시 강남구 역삼동 123-45', '010-1234-5678', 
  'PENDING', '배송1팀', NULL, DATE_ADD(NOW(), INTERVAL 2 DAY), 'MEDIUM', 
  'admin', '부재 시 경비실에 맡겨주세요.', 37.501311, 127.039471,
  '[{"status":"PENDING","changed_at":"2025-04-10T10:00:00.000Z","changed_by":"admin"}]'
),
(
  'D002', 'ORD-20250410-002', '김철수', '서울시 송파구 잠실동 456-78', '010-2345-6789', 
  'ASSIGNED', '배송1팀', 'user1', DATE_ADD(NOW(), INTERVAL 1 DAY), 'HIGH', 
  'admin', '오전 배송 요청', 37.513858, 127.099689,
  '[{"status":"PENDING","changed_at":"2025-04-10T09:00:00.000Z","changed_by":"admin"},{"status":"ASSIGNED","changed_at":"2025-04-10T10:00:00.000Z","changed_by":"admin"}]'
),
(
  'D003', 'ORD-20250410-003', '이영희', '서울시 마포구 합정동 789-12', '010-3456-7890', 
  'IN_TRANSIT', '배송2팀', 'user2', DATE_ADD(NOW(), INTERVAL 6 HOUR), 'URGENT', 
  'admin', NULL, 37.549559, 126.913483,
  '[{"status":"PENDING","changed_at":"2025-04-10T08:00:00.000Z","changed_by":"admin"},{"status":"ASSIGNED","changed_at":"2025-04-10T09:00:00.000Z","changed_by":"admin"},{"status":"IN_TRANSIT","changed_at":"2025-04-10T10:00:00.000Z","changed_by":"user2"}]'
),
(
  'D004', 'ORD-20250410-004', '박민수', '서울시 서초구 방배동 345-67', '010-4567-8901', 
  'DELIVERED', '배송2팀', 'user2', DATE_SUB(NOW(), INTERVAL 1 HOUR), 'MEDIUM', 
  'admin', NULL, 37.483561, 126.997772,
  '[{"status":"PENDING","changed_at":"2025-04-10T05:00:00.000Z","changed_by":"admin"},{"status":"ASSIGNED","changed_at":"2025-04-10T06:00:00.000Z","changed_by":"admin"},{"status":"IN_TRANSIT","changed_at":"2025-04-10T08:00:00.000Z","changed_by":"user2"},{"status":"DELIVERED","changed_at":"2025-04-10T10:00:00.000Z","changed_by":"user2"}]'
),
(
  'D005', 'ORD-20250410-005', '정지훈', '서울시 성동구 성수동 234-56', '010-5678-9012', 
  'CANCELLED', '배송1팀', NULL, DATE_ADD(NOW(), INTERVAL 1 DAY), 'LOW', 
  'admin', '고객 요청으로 취소', 37.542236, 127.054600,
  '[{"status":"PENDING","changed_at":"2025-04-10T04:00:00.000Z","changed_by":"admin"},{"status":"CANCELLED","changed_at":"2025-04-10T10:00:00.000Z","changed_by":"admin"}]'
);

-- 샘플 인수인계 데이터
INSERT INTO handover (handover_id, title, content, created_by, created_at, is_notice, priority, department)
VALUES
('H001', '[공지] 시스템 사용 안내', '배송 실시간 관제 시스템 사용법에 대한 안내입니다.\n\n1. 로그인 후 대시보드에서 배송 현황을 확인할 수 있습니다.\n2. 담당 부서의 배송만 상태 변경이 가능합니다.\n3. 문의사항은 관리자에게 연락주세요.', 'admin', DATE_SUB(NOW(), INTERVAL 2 DAY), TRUE, 'HIGH', NULL),
('H002', '배송1팀 인수인계', '오전 배송 건 중 D001, D002는 오후에 상태 업데이트 필요합니다.\n고객 연락처로 배송 전 연락 부탁드립니다.', 'user1', NOW(), FALSE, 'MEDIUM', '배송1팀'),
('H003', '배송2팀 특이사항', '오늘 오후 배송 예정인 D003은 고객이 부재중일 경우 경비실에 맡겨달라는 요청이 있었습니다.', 'user2', DATE_SUB(NOW(), INTERVAL 2 HOUR), FALSE, 'MEDIUM', '배송2팀'),
('H004', '운영팀 공유사항', '금일 시스템 점검으로 16:00-16:30 사이 접속이 원활하지 않을 수 있습니다. 양해 부탁드립니다.', 'user3', DATE_SUB(NOW(), INTERVAL 5 HOUR), FALSE, 'MEDIUM', '운영팀'),
('H005', '[공지] 주말 배송 안내', '이번 주말(4/13-4/14)은 정상 운영됩니다.\n비상연락처: 관리자(010-9876-5432)', 'admin', DATE_SUB(NOW(), INTERVAL 1 DAY), TRUE, 'HIGH', NULL);