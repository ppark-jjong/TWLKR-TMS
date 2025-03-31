# teckwah_project/deploy/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# 1. 시스템 의존성 설치
RUN apt-get update && \
    apt-get install -y nodejs npm && \
    apt-get install -y --no-install-recommends \
    build-essential \
    default-libmysqlclient-dev \
    pkg-config && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# 2. Python 패키지 설치
COPY deploy/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 3. React 빌드
# 3.1 필요한 소스 파일 복사
COPY src/ /app/src/
COPY deploy/package.json /app/package.json

# 3.2 React 표준 구조 맞추기 (중요: public 폴더는 루트에 있어야 함)
RUN mkdir -p /app/public
RUN cp -r /app/src/public/* /app/public/

# 3.3 빌드 준비
RUN npm install

# 3.4 React 환경 변수 설정 (PUBLIC_URL을 /static으로 설정)
ENV PUBLIC_URL=/static

# 3.5 빌드 실행
RUN npm run build

# 4. 백엔드 준비
# 4.1 FastAPI 서버 코드 복사
COPY server/ /app/server/

# 4.2 정적 디렉토리 생성
RUN mkdir -p /app/server/static

# 4.3 빌드된 React 앱을 정적 디렉토리로 복사
RUN cp -r /app/build/* /app/server/static/

# 5. 디버깅을 위해 빌드 결과 확인
RUN ls -la /app/server/static/

# 6. 환경 변수 설정
COPY deploy/.env.local /app/.env
ENV PYTHONPATH=/app

# 7. 서버 실행
EXPOSE 8000
CMD ["uvicorn", "server.main:app", "--host", "0.0.0.0", "--port", "8000"]