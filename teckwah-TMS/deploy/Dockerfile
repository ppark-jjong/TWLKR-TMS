# ================ 빌드 스테이지: 프론트엔드 빌드 ================
FROM node:18-alpine AS frontend-build

WORKDIR /app/frontend-src

# 종속성 파일 복사 및 설치
COPY frontend/package.json ./
RUN npm install --quiet

# 소스 코드 복사
COPY frontend/ ./
COPY deploy/.env ./

# 프론트엔드 빌드
RUN npm run build
# 빌드 성공 여부 확인
RUN if [ ! -d "/app/frontend-src/build" ]; then echo "프론트엔드 빌드 실패" && exit 1; fi
RUN ls -la /app/frontend-src/build

# ================ 백엔드 스테이지 ================
FROM python:3.12-slim

WORKDIR /app

# 시스템 패키지 설치 (최소화) 및 타임존 설정
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    curl \
    tzdata \
    && rm -rf /var/lib/apt/lists/* \
    && ln -fs /usr/share/zoneinfo/Asia/Seoul /etc/localtime \
    && echo "Asia/Seoul" > /etc/timezone \
    && dpkg-reconfigure -f noninteractive tzdata

# 환경 변수 파일 복사
COPY deploy/.env ./

# Python 종속성 설치
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# 백엔드 소스 코드 복사
COPY backend/ ./backend/

# 로그 디렉토리 생성
RUN mkdir -p ./backend/logs

# 프론트엔드 빌드 결과물 복사 - 전체 디렉토리 구조 유지하며 복사
RUN mkdir -p ./frontend
COPY --from=frontend-build /app/frontend-src/build ./frontend
RUN ls -la /app/frontend
RUN ls -la /app/frontend/static 2>/dev/null || echo "static 디렉토리가 없습니다"

# 작업 디렉토리 설정
WORKDIR /app

# Python 임포트 경로 설정을 위한 환경 변수 설정
ENV PYTHONPATH=/app

# 컨테이너가 시작될 때 실행할 명령
CMD ["python", "backend/main.py"]

# 헬스체크용 포트 노출
EXPOSE 8080
