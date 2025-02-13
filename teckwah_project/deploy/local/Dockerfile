# deploy/local/Dockerfile
FROM node:18 AS frontend-build
WORKDIR /frontend

# 패키지 설치
COPY frontend/package*.json ./
RUN npm install

# 소스 코드 복사 및 빌드
COPY frontend/ ./
RUN npm run build

# Backend stage
FROM python:3.11-slim
WORKDIR /app

# 시스템 의존성 설치
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    default-libmysqlclient-dev \
    pkg-config && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Python 패키지 설치
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 백엔드 코드 복사
COPY backend/ .
COPY backend/app/data /app/data  

# Frontend 빌드 결과물 복사
COPY --from=frontend-build /frontend/build /app/static

# 정적 파일 로고 및 파비콘 복사
COPY frontend/public/logo.png /app/static/
COPY frontend/public/favicon.ico /app/static/

# 디렉토리 권한 설정
RUN mkdir -p /app/data /app/logs && \
    chmod -R 755 /app/static /app/data /app/logs

ENV PYTHONPATH=/app

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]