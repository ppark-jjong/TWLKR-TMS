const express = require("express");
const path = require("path");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const session = require("express-session");
const { sequelize } = require("./config/Database");
const authRoutes = require("./routes/AuthRoutes");
const dashboardRoutes = require("./routes/DashboardRoutes");
const handoverRoutes = require("./routes/HandoverRoutes");
const userRoutes = require("./routes/UserRoutes");
const errorHandler = require("./middlewares/ErrorMiddleware");
const { requestLogger } = require("./middlewares/LoggingMiddleware");

// 환경변수 설정 - 단순화
require("dotenv").config({
  path:
    process.env.NODE_ENV === "production"
      ? path.join(__dirname, "..", ".env")
      : path.join(__dirname, "..", "deploy", ".env"),
});

const app = express();
const PORT = process.env.PORT || process.env.API_PORT || 8080;

// 미들웨어 적용 - 순서 최적화
// 1. 요청 로깅 (가장 먼저 적용)
app.use(requestLogger);

// 2. 보안 미들웨어 - 기본 설정으로 단순화
app.use(
  helmet({
    contentSecurityPolicy: process.env.NODE_ENV === "production", // 프로덕션에서만 활성화
  })
);

// 3. CORS 설정 - 기본값 사용
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS || "http://localhost:3000",
    credentials: true,
  })
);

// 4. 기본 미들웨어
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 5. 세션 설정 - 메모리 스토어 사용 (루트 명세서 4.5 보안 설계 원칙에 따름)
app.use(
  session({
    secret:
      process.env.SESSION_SECRET ||
      process.env.JWT_SECRET_KEY ||
      "teckwah-tms-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true, // XSS 방지
      secure: process.env.NODE_ENV === "production", // HTTPS에서만 쿠키 전송
      maxAge: 24 * 60 * 60 * 1000, // 24시간 (1일)
    },
  })
);

// 6. 기본 보안 헤더 - 필수적인 것만 설정
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  return next();
});

// 6. API 라우트 - 백틱 제거로 단순화
app.use("/auth", authRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/handover", handoverRoutes);
app.use("/users", userRoutes);

// 7. 간단한 헬스체크 엔드포인트
app.get("/health", (req, res) => {
  res.status(200).json({ status: "UP", timestamp: new Date().toISOString() });
});

// 8. React 정적 파일 서빙 (프로덕션 환경)
if (process.env.NODE_ENV === "production") {
  // 정적 파일 제공
  app.use(express.static(path.join(__dirname, "..", "frontend/build")));

  // API 경로가 아닌 모든 요청은 React 앱으로 라우팅 - 단순화
  app.get("*", (req, res) => {
    // 모든 다른 경로는 React 앱으로 라우팅
    res.sendFile(path.join(__dirname, "..", "frontend/build", "index.html"));
  });
}

// 9. 에러 핸들러 (마지막에 위치)
app.use(errorHandler);

// 서버 시작 함수
async function startServer() {
  try {
    // 데이터베이스 연결 확인
    await sequelize.authenticate();
    console.log("데이터베이스 연결 성공");

    // 개발환경에서만 모델과 테이블 동기화 (주의: 프로덕션에서는 사용하지 않음)
    if (process.env.NODE_ENV === "development") {
      await sequelize.sync({ alter: true });
      console.log("모델과 테이블 동기화 완료");
    }

    // 서버 시작
    app.listen(PORT, () => {
      console.log(`서버가 포트 ${PORT}에서 실행 중입니다`);
      console.log(`환경: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("서버 시작 실패:", error);
    process.exit(1);
  }
}

// 서버 시작
startServer();
