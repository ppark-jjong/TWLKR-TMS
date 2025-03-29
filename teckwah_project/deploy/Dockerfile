# teckwah_project/deploy/Dockerfile
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
COPY deploy/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 백엔드 소스 복사
COPY server/ /app/server/

# 프론트엔드 소스 복사
COPY src/ /app/server/src/

# 환경 변수 설정
COPY deploy/.env.local /app/.env

# 필요한 디렉토리 생성
RUN mkdir -p /app/server/static

# Python 패키지 경로 설정
ENV PYTHONPATH=/app

# 포트 노출
EXPOSE 8000

# FastAPI 서버 실행
CMD ["uvicorn", "server.main:app", "--host", "0.0.0.0", "--port", "8000"]