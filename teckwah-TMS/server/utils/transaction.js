const { sequelize } = require('../config/Database');
const logger = require('./Logger');

/**
 * 트랜잭션 컨텍스트 관리자
 * @param {function} callback - 트랜잭션 내에서 실행할 콜백 함수
 * @returns {Promise} 콜백 함수의 실행 결과
 */
const withTransaction = async (callback) => {
  const transaction = await sequelize.transaction();

  try {
    // 콜백 함수 실행 (트랜잭션 객체를 전달)
    const result = await callback(transaction);

    // 성공 시 커밋
    await transaction.commit();
    return result;
  } catch (error) {
    // 오류 발생 시 롤백
    logger.error(`트랜잭션 오류로 롤백 실행: ${error.message}`, {
      error: error.stack,
    });

    await transaction.rollback();
    throw error;
  }
};

/**
 * 단일 쿼리 트랜잭션 간소화 함수
 * @param {function} queryFunc - 실행할 쿼리 함수
 * @param {Array} args - 쿼리 함수에 전달할 인자
 * @returns {Promise} 쿼리 함수의 실행 결과
 */
const executeWithTransaction = async (queryFunc, ...args) => {
  return withTransaction(async (transaction) => {
    // 쿼리 함수 실행 (트랜잭션 객체와 나머지 인자 전달)
    return queryFunc(...args, { transaction });
  });
};

/**
 * 행 수준 락을 사용한 쿼리 실행
 * @param {Object} model - Sequelize 모델
 * @param {Object} where - 검색 조건
 * @param {Object} options - 추가 옵션
 * @returns {Promise} 쿼리 결과
 */
const findWithRowLock = async (model, where, options = {}) => {
  return withTransaction(async (transaction) => {
    const lockOptions = {
      ...options,
      transaction,
      lock: true,
    };

    return model.findOne({
      where,
      ...lockOptions,
    });
  });
};

module.exports = {
  withTransaction,
  executeWithTransaction,
  findWithRowLock,
};
