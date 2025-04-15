# 배송 실시간 관제 시스템 (TeckwahKR-TMS)

배송 실시간 관제 시스템은 ETA 기준으로 주문을 조회하고 상태를 관리하는 웹 애플리케이션입니다.

## 주요 기능

- 실시간 배송 주문 관리: ETA 기준 주문 조회 및 상태 관리
- 효율적 배차 처리: 담당자(기사) 배정 및 상태 관리 통합 제공
- 데이터 기반 의사결정: 시각화 및 주문 데이터 분석 기능
- 권한별 기능 구분: 일반 사용자 / 관리자 권한 분리

## 기술 스택

### 백엔드
- Python 3.12
- FastAPI
- SQLAlchemy
- MySQL 8.0

### 프론트엔드
- React 18
- Ant Design 5.x
- React Query
- Axios

### 배포
- Docker
- Docker Compose

## 시스템 요구사항

- Docker & Docker Compose
- MySQL 8.0 서버 (외부 연결)
- 50명 미만의 동시 접속자 지원

## 설치 및 실행 방법

### 환경 설정

1. 프로젝트를 클론합니다.
2. `deploy/.env` 파일을 수정하여 필요한 환경 변수를 설정합니다.

### Docker를 통한 실행

1. 프로젝트 루트 디렉토리에서 다음 명령어를 실행합니다.

```bash
cd deploy
docker-compose up -d --build
```

2. 애플리케이션이 http://localhost:8080 에서 접근 가능합니다.

### 개발 모드 실행

#### 백엔드

```bash
cd backend
pip install -r requirements.txt
python main.py
```

#### 프론트엔드

```bash
cd frontend
npm install
npm start
```

## 환경 변수 설정

`deploy/.env` 파일에서 다음과 같은 주요 환경 변수를 설정할 수 있습니다:

- `PORT`: 서버 포트 (기본값: 8080)
- `DEBUG`: 디버그 모드 활성화 여부 (True/False)
- `MYSQL_HOST`: MySQL 호스트 주소
- `MYSQL_PORT`: MySQL 포트
- `MYSQL_USER`: MySQL 사용자명
- `MYSQL_PASSWORD`: MySQL 비밀번호
- `MYSQL_DATABASE`: MySQL 데이터베이스명
- `SESSION_SECRET`: 세션 암호화 키
- `SESSION_EXPIRE_HOURS`: 세션 만료 시간 (시간 단위)

## 폴더 구조

- `backend/`: 백엔드 소스 코드
  - `app/`: 애플리케이션 코드
    - `models/`: 데이터 모델
    - `routes/`: API 엔드포인트
    - `middleware/`: 미들웨어
    - `utils/`: 유틸리티 함수
- `frontend/`: 프론트엔드 소스 코드
  - `src/`: 소스 코드
    - `components/`: React 컴포넌트
    - `pages/`: 페이지 컴포넌트
    - `services/`: API 서비스
    - `contexts/`: React 컨텍스트
    - `routes/`: 라우팅 설정
- `deploy/`: 배포 관련 파일
  - `Dockerfile`: Docker 빌드 설정
  - `docker-compose.yml`: Docker Compose 설정
  - `.env`: 환경 변수 설정
  - `init-db.sql`: 초기 데이터베이스 스키마
