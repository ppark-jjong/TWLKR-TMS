# 빌드 스테이지: React 앱 빌드
FROM node:18-alpine AS frontend-builder

WORKDIR /build

# 클라이언트 package.json 복사하여 의존성 설치 캐싱
COPY client/package*.json ./
RUN npm install

# 클라이언트 소스 코드 복사
COPY client/ ./

# React 앱 빌드
ENV NODE_ENV=production
RUN npm run build

# 서버 스테이지: Node.js 서버 설정
FROM node:18-alpine

WORKDIR /app

# 서버 package.json 복사하여 의존성 설치
COPY deploy/package.json ./
RUN npm install --only=production

# 서버 코드 복사
COPY server/ ./server/
COPY server.js ./

# 클라이언트 빌드 결과물 복사
COPY --from=frontend-builder /build/build/ ./public/

# 환경 변수 설정
COPY deploy/.env.local ./.env

# 포트 노출
EXPOSE 8000

# 서버 실행
CMD ["node", "server.js"]
