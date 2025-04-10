# 노드 기본 이미지 사용
FROM node:20-alpine

# 작업 디렉토리 설정
WORKDIR /app

# 패키지 파일 복사 (deploy 폴더에서)
COPY teckwah-TMS/deploy/package*.json ./

# 소스 코드 복사
COPY teckwah-TMS/main.js ./
COPY teckwah-TMS/server ./server
COPY teckwah-TMS/client ./client

# 종속성 설치
RUN npm install --production


# 클라이언트 빌드 (클라이언트 디렉토리가 존재하는 경우)
RUN if [ -d "./client" ]; then \
    cd client && \
    npm install && \
    npm run build && \
    cd ..; \
    fi

# 포트 노출
EXPOSE 3000

# 환경 변수 설정
ENV NODE_ENV=production

# 서버 실행
CMD ["node", "main.js"]