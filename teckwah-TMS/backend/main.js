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
    secret: process.env.SESSION_SECRET || "teckwah-tms-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true, // XSS 방지
      secure: false, // 개발 환경에서는 HTTPS가 아니어도 쿠키 사용 가능
      maxAge: 24 * 60 * 60 * 1000, // 24시간 (1일)
      path: "/",
      sameSite: "lax", // 기본값으로 설정
    },
    name: "teckwah.sid", // 세션 쿠키 이름 지정
  })
);

// 세션 디버깅 미들웨어 (개발 모드에서만 활성화)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log("세션 ID:", req.sessionID);
    console.log("세션 데이터:", req.session);
    next();
  });
}

// 6. 기본 보안 헤더 - 필수적인 것만 설정
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  return next();
});

// 6. API 라우트 - 더 명확한 라우팅 설정
app.use("/auth", authRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/handover", handoverRoutes);
app.use("/users", userRoutes);

// 라우팅 디버깅 (개발 모드에서만 활성화)
if (process.env.NODE_ENV !== 'production') {
  console.log("등록된 라우트:");
  app._router.stack.forEach(function (r) {
    if (r.route && r.route.path) {
      console.log(`경로: ${r.route.path}`);
    } else if (r.name === "router" && r.handle.stack) {
      console.log(`라우터: ${r.regexp}`);
      r.handle.stack.forEach(function (r2) {
        if (r2.route && r2.route.path) {
          console.log(`  → ${r2.route.path}`);
        }
      });
    }
  });
}

// 7. 간단한 헬스체크 엔드포인트
app.get("/health", (req, res) => {
  res.status(200).json({ status: "UP", timestamp: new Date().toISOString() });
});

// 8. React 정적 파일 서빙 (모든 환경에서 활성화)
// 명시적인 MIME 타입 설정
const serveOptions = {
  setHeaders: (res, filePath) => {
    // 파일 확장자에 따라 적절한 MIME 타입 설정
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.js') {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (ext === '.css') {
      res.setHeader('Content-Type', 'text/css');
    } else if (ext === '.html') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    } else if (ext === '.json') {
      res.setHeader('Content-Type', 'application/json');
    }
  }
};

// 정적 파일 제공
app.use(express.static(path.join(__dirname, "..", "frontend/build"), serveOptions));

// API 경로가 아닌 모든 요청은 React 앱으로 라우팅
app.get("*", (req, res) => {
  // 최소한의 로깅
  const isAsset = /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i.test(req.path);
  if (!isAsset) {
    console.log("SPA 라우팅:", req.path);
  }
  
  // index.html 파일을 보낼 때 Content-Type 헤더를 명시적으로 설정
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(path.join(__dirname, "..", "frontend/build", "index.html"));
});

// 9. 에러 핸들러 (마지막에 위치)
app.use(errorHandler);

// 서버 시작 함수
async function startServer() {
  try {
    // 데이터베이스 연결 확인
    await sequelize.authenticate();
    console.log("데이터베이스 연결 성공");

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
