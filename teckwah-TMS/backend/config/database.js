const { Sequelize } = require('sequelize');
const path = require('path');

// 환경변수 설정
require('dotenv').config({
  path: process.env.NODE_ENV === 'production' 
    ? path.join(__dirname, '../../.env') 
    : path.join(__dirname, '../../deploy', '.env')
});

// 커스텀 로거 함수
const customLogger = (query, time) => {
  if (process.env.NODE_ENV === 'development') {
    if (time > 500) { // 500ms 이상 걸리는 쿼리는 경고로 표시
      console.warn(`[DB 쿼리 성능 경고: ${time}ms] ${query}`);
    } else {
      console.log(`[DB 쿼리: ${time}ms] ${query}`);
    }
  }
};

// 데이터베이스 연결 설정
const sequelize = new Sequelize(
  process.env.MYSQL_DATABASE,
  process.env.MYSQL_USER,
  process.env.MYSQL_PASSWORD,
  {
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT || 3306,
    dialect: 'mysql',
    logging: process.env.DB_LOGGING === 'true' ? customLogger : false,
    timezone: '+09:00', // 한국 시간
    pool: {
      max: parseInt(process.env.DB_POOL_MAX || 5),
      min: parseInt(process.env.DB_POOL_MIN || 0),
      acquire: parseInt(process.env.DB_POOL_ACQUIRE || 30000),
      idle: parseInt(process.env.DB_POOL_IDLE || 10000)
    },
    dialectOptions: {
      connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT || 10000),
      // 한글 인코딩 지원
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      // 날짜 포맷팅
      dateStrings: true,
      typeCast: function (field, next) {
        if (field.type === 'DATETIME' || field.type === 'TIMESTAMP') {
          return field.string();
        }
        return next();
      }
    },
    define: {
      timestamps: true, // created_at, updated_at 자동 생성
      underscored: true, // snake_case 컬럼명 사용
      freezeTableName: true, // 테이블명 복수화 방지
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    }
  }
);

module.exports = { sequelize };