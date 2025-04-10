const { sequelize } = require('../config/database');
const { logger } = require('./logger');

// 모델 불러오기
const User = require('../models/user.model');
const Dashboard = require('../models/dashboard.model');
const Handover = require('../models/handover.model');

/**
 * 데이터베이스 테이블 동기화 함수
 * @param {boolean} force - 기존 테이블 강제 삭제 여부
 * @param {boolean} alter - 테이블 구조 변경 여부
 */
async function syncDatabase(force = false, alter = false) {
  try {
    logger.info(`데이터베이스 동기화 시작 (force: ${force}, alter: ${alter})`);
    
    // 위험한 작업 확인
    if (force && process.env.NODE_ENV === 'production') {
      logger.error('프로덕션 환경에서 force 옵션을 사용할 수 없습니다');
      process.exit(1);
    }
    
    // 데이터베이스 연결 확인
    await sequelize.authenticate();
    logger.info('데이터베이스 연결 성공');
    
    // 테이블 동기화
    await sequelize.sync({ force, alter });
    
    logger.info('데이터베이스 동기화 완료');
    
    // 동기화 후 모델 관계 로그
    logger.info('데이터베이스 모델 관계:');
    logModelAssociations(User);
    logModelAssociations(Dashboard);
    logModelAssociations(Handover);
    
  } catch (error) {
    logger.error('데이터베이스 동기화 실패:', error);
    process.exit(1);
  }
}

// 모델 관계 로깅 함수
function logModelAssociations(model) {
  const modelName = model.name;
  const associations = [];
  
  // 관계 정보 수집
  if (model.associations) {
    for (const [key, association] of Object.entries(model.associations)) {
      associations.push({
        type: association.associationType,
        target: association.target.name,
        as: association.as,
        foreignKey: association.foreignKey
      });
    }
  }
  
  logger.info(`모델: ${modelName}`, { associations });
}

// 커맨드라인 인수 파싱
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    force: false,
    alter: false
  };
  
  for (const arg of args) {
    if (arg === '--force') {
      options.force = true;
    } else if (arg === '--alter') {
      options.alter = true;
    }
  }
  
  return options;
}

// 스크립트가 직접 실행될 때만 데이터베이스 동기화 실행
if (require.main === module) {
  const options = parseArgs();
  
  // 위험한 작업 확인
  if (options.force) {
    logger.warn('--force 옵션이 사용되었습니다. 모든 테이블이 제거되고 다시 생성됩니다.');
    
    if (process.env.NODE_ENV === 'production') {
      logger.error('프로덕션 환경에서는 --force 옵션을 사용할 수 없습니다.');
      process.exit(1);
    }
    
    // 위험한 작업 확인 프롬프트
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    readline.question('정말로 모든 테이블을 삭제하고 다시 생성하시겠습니까? (yes/no): ', async (answer) => {
      readline.close();
      
      if (answer.toLowerCase() === 'yes') {
        await syncDatabase(options.force, options.alter);
        process.exit(0);
      } else {
        logger.info('데이터베이스 동기화가 취소되었습니다.');
        process.exit(0);
      }
    });
  } else {
    // 일반 동기화 실행
    syncDatabase(options.force, options.alter)
      .then(() => {
        process.exit(0);
      })
      .catch(error => {
        logger.error('데이터베이스 동기화 중 오류 발생:', error);
        process.exit(1);
      });
  }
}

module.exports = syncDatabase;