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
EXPOSE 3000

# 환경 변수 설정
ENV NODE_ENV=production \
    PORT=3000 \
    DB_HOST=db \
    DB_PORT=3306 \
    DB_NAME=teckwah_dashboard \
    DB_USER=teckwah \
    DB_PASSWORD=password123 \
    JWT_SECRET=prod_jwt_secret_key \
    JWT_ACCESS_EXPIRY=15m \
    JWT_REFRESH_EXPIRY=7d \
    ALLOWED_ORIGINS=http://localhost:3000

# .env.local 파일 복사
COPY deploy/.env.local ./

# 서버 실행
CMD ["node", "main.js"]