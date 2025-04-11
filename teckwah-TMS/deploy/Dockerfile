# 1. 프론트엔드 빌드 스테이지
FROM node:20-alpine AS frontend-builder
WORKDIR /app

# package.json과 package-lock.json 파일 복사
COPY frontend/package.json frontend/package-lock.json ./

# 의존성 설치
RUN npm install

# 소스 파일 복사 (폴더 구조 유지)
COPY frontend/src ./src
COPY frontend/public ./public
COPY deploy/.env.frontend ./.env

# 환경 변수 설정
ENV NODE_ENV=production
ENV CI=false
ENV ESLINT_NO_DEV_ERRORS=true
ENV GENERATE_SOURCEMAP=false
ENV REACT_APP_API_URL=http://localhost:8000

# 빌드 실행
RUN npm run build

# 2. 백엔드 의존성 설치 스테이지
FROM node:20-alpine AS backend-deps
WORKDIR /app

# 네이티브 모듈을 위한 빌드 도구 설치
RUN apk add --no-cache python3 make g++ 

# package.json과 package-lock.json 파일 복사
COPY backend/package.json backend/package-lock.json ./

# 프로덕션 의존성만 설치하며 네이티브 모듈을 컨테이너 환경에 맞게 컴파일
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

# 명시적 환경 변수 설정 - docker-compose.yml과 중복될 수 있으나 명확성을 위해 추가
ENV NODE_ENV=production
ENV MYSQL_HOST=host.docker.internal
ENV MYSQL_PORT=3306
ENV MYSQL_USER=root
ENV MYSQL_PASSWORD=1234
ENV MYSQL_DATABASE=delivery_system

# 포트 노출
EXPOSE 8000

# 서버 실행
CMD ["node", "backend/main.js"]