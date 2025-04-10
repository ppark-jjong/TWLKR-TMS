// 통합된 데이터베이스 설정
const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

// 환경 변수에서 DB 설정 가져오기
const dbConfig = {
  host: process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost',
  port: process.env.DB_PORT || process.env.MYSQL_PORT || 3306,
  username: process.env.DB_USER || process.env.MYSQL_USER || 'root',
  password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || '',
  database: process.env.DB_NAME || process.env.MYSQL_DATABASE || 'delivery_system',
  dialect: 'mysql',
  dialectOptions: {
    timezone: '+09:00', // KST 시간대
    charset: process.env.MYSQL_CHARSET || 'utf8mb4'
  },
  logging: process.env.NODE_ENV === 'development' 
    ? (msg) => logger.debug(msg) 
    : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};

// Sequelize 인스턴스 생성
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    dialectOptions: dbConfig.dialectOptions,
    logging: dbConfig.logging,
    pool: dbConfig.pool
  }
);

// 연결 테스트 함수
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    logger.info('데이터베이스 연결 성공');
    return true;
  } catch (error) {
    logger.error(`데이터베이스 연결 실패: ${error.message}`);
    throw error;
  }
};

// 모델 동기화 함수 (개발 환경에서만 사용)
const syncModels = async (force = false) => {
  if (process.env.NODE_ENV === 'production' && force) {
    logger.error('프로덕션 환경에서 force: true로 syncModels 호출 시도');
    throw new Error('프로덕션 환경에서는 force: true로 syncModels를 호출할 수 없습니다');
  }

  try {
    await sequelize.sync({ force });
    logger.info(`모델 동기화 ${force ? '(테이블 재생성)' : ''} 완료`);
    return true;
  } catch (error) {
    logger.error(`모델 동기화 실패: ${error.message}`);
    throw error;
  }
};

module.exports = {
  sequelize,
  testConnection,
  syncModels,
  dbConfig
};
