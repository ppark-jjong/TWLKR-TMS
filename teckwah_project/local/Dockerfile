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

# Frontend 빌드 결과물 복사 (경로 수정)
COPY --from=frontend-build /frontend/build/* /app/static/
RUN mkdir -p /app/data /app/logs

# 실행 권한 설정
RUN chmod -R 755 /app/static /app/data /app/logs

ENV PYTHONPATH=/app

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]