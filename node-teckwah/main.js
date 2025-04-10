// 통합된 서버 진입점
require('dotenv').config({ path: process.env.NODE_ENV === 'production' ? '.env' : './deploy/.env.local' });
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

// 데이터베이스 초기화
const { sequelize, testConnection } = require('./server/config/database');

// 로거 설정
const logger = require('./server/utils/logger');

// 라우트 임포트
const authRoutes = require('./server/routes/auth.routes');
const dashboardRoutes = require('./server/routes/dashboard.routes');
const handoverRoutes = require('./server/routes/handover.routes');
const downloadRoutes = require('./server/routes/download.routes');

// 미들웨어 임포트
const errorMiddleware = require('./server/middlewares/error.middleware');
const loggerMiddleware = require('./server/middlewares/logger.middleware');

// Express 앱 생성
const app = express();

// 기본 미들웨어 설정
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(loggerMiddleware);

// 기본 보안 헤더
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// API 라우트
app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/handover', handoverRoutes);
app.use('/download', downloadRoutes);

// 정적 파일 서빙 (프로덕션 모드)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'public')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
}

// 에러 핸들링 미들웨어
app.use(errorMiddleware);

// 404 처리
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '요청한 리소스를 찾을 수 없습니다.',
    error_code: 'NOT_FOUND'
  });
});

// 데이터베이스 연결 테스트
testConnection().catch(err => {
  logger.error(`데이터베이스 연결 실패: ${err.message}`);
  process.exit(1);
});

// 서버 시작
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  logger.info(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});

module.exports = app;
