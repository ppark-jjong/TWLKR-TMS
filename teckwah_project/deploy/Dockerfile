# teckwah_project/deploy/Dockerfile

# 빌드 모드 인자 설정 (기본값: development)
ARG BUILD_MODE=development

# 1단계: Node.js 빌드 환경
FROM node:18-alpine AS frontend-builder

WORKDIR /app

# 빌드 모드 설정
ARG BUILD_MODE
ENV BUILD_MODE=${BUILD_MODE}
ENV NODE_ENV=${BUILD_MODE}

# React 앱 빌드에 필요한 파일만 복사
COPY src/ /app/src/
COPY deploy/package.json /app/package.json

# React 표준 구조 맞추기
RUN mkdir -p /app/public

# src/public 폴더가 있는지 확인 후 복사
RUN if [ -d "/app/src/public" ]; then \
        cp -r /app/src/public/* /app/public/; \
    fi

# favicon.ico 처리
RUN if [ -f "/app/src/public/favicon.ico" ]; then \
        cp /app/src/public/favicon.ico /app/public/; \
    fi

# 빌드 실행
RUN npm install
ENV PUBLIC_URL=/static

# 개발 모드 빌드
RUN if [ "$BUILD_MODE" = "development" ]; then \
        npm run build:dev || npm run build; \
    else \
        GENERATE_SOURCEMAP=false npm run build; \
    fi

# 2단계: Python 빌드 환경
FROM python:3.11-slim AS backend-builder

WORKDIR /app

# 필요한 시스템 의존성 설치
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    default-libmysqlclient-dev \
    pkg-config \
    gcc && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Python 패키지 설치
COPY deploy/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir pytest

# 3단계: 최종 이미지
FROM python:3.11-slim

# 빌드 모드 설정
ARG BUILD_MODE
ENV BUILD_MODE=${BUILD_MODE}
ENV DEBUG=True
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# 필요한 런타임 의존성 설치
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    default-libmysqlclient-dev && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Python 패키지 복사
COPY --from=backend-builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=backend-builder /usr/local/bin/ /usr/local/bin/

# 백엔드 코드 복사
COPY server/ /app/server/

# 정적 파일 설정
RUN mkdir -p /app/server/static
COPY --from=frontend-builder /app/build/ /app/server/static/

# favicon.ico 처리
RUN if [ -f "/app/server/static/favicon.ico" ]; then \
        cp /app/server/static/favicon.ico /app/server/favicon.ico; \
    fi

# 환경 변수 설정
COPY deploy/.env.local /app/.env
ENV PYTHONPATH=/app

# 서버 실행
EXPOSE 8000
CMD ["uvicorn", "server.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload", "--reload-dir", "/app/server"]