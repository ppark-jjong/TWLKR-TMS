const { sequelize } = require('../config/database');

/**
 * 트랜잭션 내에서 비동기 콜백 함수를 실행하는 헬퍼 함수
 * 
 * @param {Function} callback - 트랜잭션 객체를 인자로 받는 비동기 콜백 함수
 * @param {Object} options - 트랜잭션 옵션
 * @returns {Promise<any>} - 콜백 함수의 반환값
 */
async function withTransaction(callback, options = {}) {
  const transaction = await sequelize.transaction(options);
  
  try {
    const result = await callback(transaction);
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * 여러 데이터베이스 작업을 일괄 처리하는 배치 처리 함수
 * 
 * @param {Array<Function>} operations - 트랜잭션 객체를 인자로 받는 비동기 함수 배열
 * @param {Object} options - 트랜잭션 옵션
 * @returns {Promise<Array<any>>} - 각 작업의 결과 배열
 */
async function batchWithTransaction(operations, options = {}) {
  return withTransaction(async (transaction) => {
    const results = [];
    
    for (const operation of operations) {
      const result = await operation(transaction);
      results.push(result);
    }
    
    return results;
  }, options);
}

module.exports = {
  withTransaction,
  batchWithTransaction
};