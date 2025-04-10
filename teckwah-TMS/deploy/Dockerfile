# 빌드 스테이지
FROM node:20-alpine AS builder

# 작업 디렉토리 설정
WORKDIR /build

# 패키지 파일 복사
COPY deploy/package*.json ./

# 소스 코드 복사
COPY main.js ./
COPY server ./server
COPY client ./client

# 종속성 설치 및 빌드
RUN npm install --production

# 클라이언트 빌드
RUN if [ -d "./client" ]; then \
    cd client && \
    npm install && \
    npm run build && \
    cd ..; \
    fi

# 프로덕션 스테이지
FROM node:20-alpine

# 작업 디렉토리 설정
WORKDIR /app

# 필수 환경변수만 설정 (다른 변수는 docker-compose의 env_file로 처리)
ENV NODE_ENV=production \
    API_PORT=8000

# 빌드 스테이지에서 필요한 파일만 복사
COPY --from=builder --chown=appuser:appgroup /build/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /build/main.js ./
COPY --from=builder --chown=appuser:appgroup /build/server ./server
COPY --from=builder --chown=appuser:appgroup /build/client/build ./client/build

# 포트 노출
EXPOSE 8000


# 서버 실행
CMD ["node", "main.js"]