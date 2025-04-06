# 빌드 스테이지: React 앱 빌드
FROM node:20-slim AS frontend-builder

WORKDIR /build

# package.json 먼저 복사하여 의존성 설치 캐싱
COPY deploy/package.json ./package.json
RUN npm install

# 소스 코드 복사
COPY src/ ./src/

# React 표준 구조 맞추기
RUN mkdir -p ./public && \
    cp -r ./src/public/* ./public/

# 빌드 실행 (PUBLIC_URL을 빈 문자열로 설정하여 상대 경로 사용)
ENV PUBLIC_URL=""
ENV NODE_ENV=production
RUN npm run build

# 최종 스테이지: 실행 환경 구성
FROM python:3.12-slim

WORKDIR /app

# 시스템 의존성 및 Rust 설치
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    default-libmysqlclient-dev \
    pkg-config \
    curl \
    ca-certificates \
    && \
    # Rust 설치
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y && \
    . $HOME/.cargo/env && \
    # PATH에 Rust 추가
    echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> $HOME/.bashrc

# Python 의존성 설치 (Rust 사용)
COPY deploy/requirements.txt .
RUN . $HOME/.cargo/env && \
    pip install --no-cache-dir -r requirements.txt && \
    # 빌드 후 불필요한 패키지 및 Rust 제거
    apt-get remove -y curl && \
    apt-get autoremove -y && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    rm -rf $HOME/.cargo /usr/local/rustup && \
    rm -rf /root/.cache

# 서버 코드 복사
COPY server/ /app/server/

# 정적 파일을 위한 디렉토리 생성
RUN mkdir -p /app/server/static

# 빌드된 React 앱을 정적 파일 디렉토리로 복사
COPY --from=frontend-builder /build/build/ /app/server/static/

# 추가 정적 파일 복사 (로고, 파비콘 등)
COPY src/public/logo.png /app/server/static/
COPY src/public/favicon.ico /app/server/static/
COPY src/public/global.css /app/server/static/

# 환경 변수 설정
COPY deploy/.env.local /app/.env
ENV PYTHONPATH=/app

# 서버 실행
EXPOSE 8000
CMD ["uvicorn", "server.main:app", "--host", "0.0.0.0", "--port", "8000"]