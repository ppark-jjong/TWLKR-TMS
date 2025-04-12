# 1. 프론트엔드 빌드 스테이지
FROM node:20-alpine AS frontend-builder
WORKDIR /app

# package.json과 package-lock.json 파일 복사
COPY frontend/package.json frontend/package-lock.json ./

# 의존성 설치
RUN npm ci

# 소스 파일 복사 (폴더 구조 유지)
COPY frontend/src ./src
COPY frontend/public ./public
COPY deploy/.env ./.env

# 환경 변수 설정
ENV NODE_ENV=production
ENV CI=false
ENV ESLINT_NO_DEV_ERRORS=true
ENV GENERATE_SOURCEMAP=false

# 로컬 테스트용 API URL (로컬 테스트 시 사용)
ENV REACT_APP_API_URL=http://localhost:8000

# 실제 배포 환경용 API URL (실제 배포 시 주석 해제)
# ENV REACT_APP_API_URL=https://api.your-domain.com

# 빌드 실행
RUN npm run build

# 2. 백엔드 의존성 설치 스테이지
FROM node:20-alpine AS backend-deps
WORKDIR /app

# 네이티브 모듈을 위한 빌드 도구 설치
RUN apk add --no-cache python3 make g++

# package.json과 package-lock.json 파일 복사
COPY backend/package.json backend/package-lock.json ./

# 프로덕션 의존성만 설치
RUN npm install --omit=dev

# 3. 최종 이미지 구성
FROM node:20-alpine
WORKDIR /app

# 환경 변수 설정
ENV NODE_ENV=production
ENV PORT=8000
ENV LANG=ko_KR.UTF-8
ENV LC_ALL=ko_KR.UTF-8

# 백엔드 의존성 및 소스 코드 복사
COPY --from=backend-deps /app/node_modules ./node_modules
COPY backend/ ./backend/

# 프론트엔드 빌드 결과물 복사
RUN mkdir -p frontend/build
COPY --from=frontend-builder /app/build ./frontend/build

# 환경 변수 파일 복사 및 권한 설정
COPY deploy/.env ./.env
RUN chmod 600 ./.env

# 로컬 테스트용 환경 변수 (로컬 테스트 시 사용)
ENV MYSQL_HOST=host.docker.internal
ENV MYSQL_PORT=3306
ENV MYSQL_USER=root
ENV MYSQL_PASSWORD=1234
ENV MYSQL_DATABASE=delivery_system

# 실제 배포 환경용 환경 변수 (실제 배포 시 주석 해제)
# ENV MYSQL_HOST=your-db-host.com
# ENV MYSQL_PORT=3306
# ENV MYSQL_USER=prod_user
# ENV MYSQL_PASSWORD=prod_password
# ENV MYSQL_DATABASE=delivery_system

# 비권한 사용자로 실행하여 보안 강화
USER node

# 포트 노출
EXPOSE 8000

# 서버 실행
CMD ["node", "backend/main.js"]