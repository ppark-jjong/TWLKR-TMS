# 노드 기본 이미지 사용
FROM node:20-alpine

# 작업 디렉토리 설정
WORKDIR /app

# 패키지 파일 복사 (deploy 폴더에서)
COPY deploy/package*.json ./

# 소스 코드 복사
COPY main.js ./
COPY server ./server
COPY client ./client

# 종속성 설치
RUN npm install --production


# 클라이언트 빌드 (클라이언트 디렉토리가 존재하는 경우)
RUN if [ -d "./client" ]; then \
    cd client && \
    npm install && \
    npm run build && \
    cd ..; \
    fi

# 포트 노출
EXPOSE 8000

# 환경 변수 설정 - 기본값 (환경 변수로 덮어쓰기 가능)
ENV NODE_ENV=production \
    API_PORT=8000 \
    DB_HOST=host.docker.internal \
    DB_PORT=3306 \
    DB_NAME=delivery_system \
    DB_USER=root \
    DB_PASSWORD=1234 \
    DEBUG=True \
    API_PREFIX= \
    PROJECT_NAME="TWLKR-TMS" \
    API_BASE_URL=http://0.0.0.0:8000 \
    API_TIMEOUT=10 \
    LOG_LEVEL=INFO \
    ENABLE_ACCESS_LOG=True \
    JWT_SECRET_KEY=4a24ff058be1925b52a62b9d594b367a600dde8730e647d2d29c9b2f7c7f6fff \
    JWT_REFRESH_SECRET_KEY=8b24ff058be1925b52a62b9d594b367a600dde8730e647d2d29c9b2f7c7f6fff \
    JWT_ALGORITHM=HS256 \
    ACCESS_TOKEN_EXPIRE_MINUTES=60 \
    REFRESH_TOKEN_EXPIRE_DAYS=7 \
    LOCK_TIMEOUT_SECONDS=300 \
    LOCK_CLEANUP_INTERVAL_MINUTES=10

# .env 파일 복사하지 않음 (compose에서 처리)
# COPY deploy/.env ./

# 서버 실행
CMD ["node", "main.js"]