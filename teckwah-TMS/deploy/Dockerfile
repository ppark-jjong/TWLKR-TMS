# 1. 빌드 스테이지
FROM node:20-alpine AS builder
WORKDIR /app

# 환경변수 파일 복사
COPY deploy/.env ./.env

<<<<<<< HEAD
# 백엔드 의존성 설치
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci

# 프론트엔드 의존성 설치
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN cd frontend && npm ci

# 백엔드 소스 복사
COPY backend/ ./backend/

# 프론트엔드 소스 복사
COPY frontend/ ./frontend/

# 빌드 환경 설정 
ENV NODE_ENV=production
=======
# 환경 변수 설정 - .env 파일에서 가져오는 값 사용
ENV NODE_ENV=development
>>>>>>> main
ENV CI=false
ENV ESLINT_NO_DEV_ERRORS=true
ENV GENERATE_SOURCEMAP=false

# 프론트엔드 빌드
WORKDIR /app/frontend
RUN npm run build

# 빌드 결과 확인 (디버깅용)
RUN echo "===== 프론트엔드 빌드 결과 확인 =====" && \
    ls -la /app/frontend/build/ || echo "build 폴더가 존재하지 않음!"

# 2. 프로덕션 스테이지
FROM node:20-alpine
WORKDIR /app

<<<<<<< HEAD
# 환경변수 파일 복사
COPY deploy/.env ./.env
RUN chmod 600 ./.env

# 백엔드 의존성 설치 (프로덕션 모드)
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci --omit=dev

# 백엔드 소스 복사
COPY backend/ ./backend/

# 프론트엔드 빌드 결과물 복사
COPY --from=builder /app/frontend/build/ ./frontend/

# 복사된 프론트엔드 빌드 결과 확인 (디버깅용)
RUN echo "===== 복사된 프론트엔드 파일 확인 =====" && \
    ls -la /app/frontend/ || echo "frontend 폴더에 파일이 없음!"

# 환경 설정
ENV NODE_ENV=production
ENV PORT=8080

# 포트 설정 및 실행
EXPOSE 8080
CMD ["node", "backend/main.js"]
=======
# 필요한 환경 변수만 설정
ENV NODE_ENV=development
ENV PORT=8080

# 프론트엔드 디렉토리 먼저 생성하여 확실히 경로 존재하도록 함
RUN mkdir -p ./frontend

# 백엔드 의존성 및 소스 코드 복사
COPY --from=backend-deps /app/node_modules ./node_modules
COPY backend/ ./backend/

# 프론트엔드 빌드 결과물 복사 - 전체 디렉토리 구조 유지
COPY --from=frontend-builder /app/build ./frontend

# 간단한 경로 확인 (기본 진단용)
RUN echo "프론트엔드 경로 확인: ls -la /app/frontend" && \
    ls -la /app/frontend | grep index.html

# 환경 변수 파일 복사 및 권한 설정 - 단일 컨테이너 환경에 맞게 수정
COPY deploy/.env ./.env
RUN chmod 600 ./.env

# 포트 노출
EXPOSE 8080

# 서버 실행 
CMD ["node", "backend/main.js"]
>>>>>>> main
