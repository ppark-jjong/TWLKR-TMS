# teckwah_project/deploy/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# 시스템 의존성 설치
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    default-libmysqlclient-dev \
    pkg-config \
    supervisor && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Python 패키지 설치
COPY deploy/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# supervisord 설정 복사
COPY main/supervisord.conf /etc/supervisor/conf.d/app.conf

# 애플리케이션 코드 복사
COPY main/server/ /app/main/server/
COPY main/dash/ /app/main/dash/
COPY deploy/.env.local /app/.env

# 정적 파일 및 디렉토리 생성
RUN mkdir -p /app/main/dash/assets

# 권한 설정
RUN chmod -R 755 /app

# Python 패키지 경로 설정
ENV PYTHONPATH=/app:/app/main/server:/app/main/dash

# supervisord로 FastAPI와 Dash 동시 실행
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/app.conf"]