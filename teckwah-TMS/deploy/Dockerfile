# 1. 프론트엔드 빌드 스테이지 - 최적화
FROM node:20-alpine AS frontend-builder
WORKDIR /app

# 캐시 활용을 위해 package.json 및 package-lock.json 먼저 복사
COPY frontend/package*.json ./

# 의존성 설치 (CI 모드로 설치하여 lockfile 준수)
RUN npm ci

# 소스 파일 복사 (folding 최적화)
COPY frontend/src ./src
COPY frontend/public ./public
COPY deploy/.env ./.env

# 환경 변수 설정 - .env 파일에서 가져오는 값 사용
ENV NODE_ENV=production
ENV CI=false
ENV ESLINT_NO_DEV_ERRORS=true
ENV GENERATE_SOURCEMAP=false

# 빌드 실행
RUN npm run build

# 2. 백엔드 의존성 설치 스테이지 - 최적화
FROM node:20-alpine AS backend-deps
WORKDIR /app

# 네이티브 모듈을 위한 빌드 도구 설치 - 최소 패키지만 설치
RUN apk add --no-cache python3 make g++ 

# 캐시 활용을 위해 package.json 및 package-lock.json 먼저 복사
COPY backend/package*.json ./

# 프로덕션 의존성만 설치
RUN npm ci --omit=dev

# 3. 최종 이미지 구성 - 경량화 및 보안 강화
FROM node:20-alpine
WORKDIR /app

# 필요한 환경 변수만 설정
ENV NODE_ENV=production
ENV PORT=8080

# 백엔드 의존성 및 소스 코드 복사
COPY --from=backend-deps /app/node_modules ./node_modules
COPY backend/ ./backend/

# 프론트엔드 빌드 결과물 복사
COPY --from=frontend-builder /app/build ./frontend/build

# 환경 변수 파일 복사 및 권한 설정
COPY deploy/.env ./.env
RUN chmod 600 ./.env


# # 보안 강화: 비권한 사용자로 실행
# RUN addgroup -S appgroup && adduser -S appuser -G appgroup
# RUN chown -R appuser:appgroup /app
# USER appuser

# 포트 노출
EXPOSE 8080

# 서버 실행 
CMD ["node", "backend/main.js"]

