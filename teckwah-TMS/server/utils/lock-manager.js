const { sequelize } = require('../config/database');
const { ERROR_CODES } = require('./constants');

// 락 충돌 예외 클래스
class LockConflictException extends Error {
  constructor(message) {
    super(message);
    this.name = 'LockConflictException';
    this.code = ERROR_CODES.LOCK_CONFLICT;
  }
}

// 리소스 찾을 수 없음 예외 클래스
class NotFoundException extends Error {
  constructor(id) {
    super(`ID가 ${id}인 리소스를 찾을 수 없습니다`);
    this.name = 'NotFoundException';
    this.code = ERROR_CODES.NOT_FOUND;
  }
}

/**
 * 행 단위 락을 이용하여 리소스를 찾는 함수
 * @param {Object} model - Sequelize 모델
 * @param {string} id - 리소스 ID
 * @param {string} userId - 현재 사용자 ID
 * @param {number} retries - 최대 재시도 횟수
 * @param {number} retryDelay - 재시도 간격 (밀리초)
 * @returns {Promise<Object>} - 찾은 리소스 객체
 */
async function findWithRowLock(model, id, userId, retries = 2, retryDelay = 500) {
  let currentTry = 0;
  let lastError = null;
  
  while (currentTry <= retries) {
    // Sequelize 트랜잭션 시작
    const transaction = await sequelize.transaction();
    
    try {
      const primaryKeyField = model.primaryKeyAttribute;
      
      // SELECT FOR UPDATE 락 획득
      const query = {};
      query[primaryKeyField] = id;
      
      const result = await model.findOne({
        where: query,
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      
      if (!result) {
        await transaction.rollback();
        throw new NotFoundException(id);
      }
      
      // 행 락 획득 성공, UI 락 정보 업데이트
      result.updated_by = userId;
      result.updated_at = new Date();
      await result.save({ transaction });
      
      // 트랜잭션 커밋
      await transaction.commit();
      return result;
    } catch (error) {
      // 롤백 및 에러 처리
      await transaction.rollback();
      
      // 락 충돌 감지
      if (
        error.name === 'SequelizeDatabaseError' && 
        (error.message.includes('could not obtain lock') || 
         error.message.includes('Lock wait timeout') || 
         error.message.includes('Deadlock found'))
      ) {
        lastError = error;
        
        if (currentTry < retries) {
          // 재시도 전 잠시 대기
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          currentTry++;
          continue;
        }
        
        throw new LockConflictException('다른 사용자가 현재 이 데이터를 수정 중입니다');
      }
      
      throw error;
    }
  }
  
  // 모든 재시도 실패 시
  throw lastError || new Error('알 수 없는 오류로 데이터를 잠금할 수 없습니다');
}

/**
 * 리소스 업데이트 함수
 * @param {Object} model - Sequelize 모델
 * @param {string} id - 리소스 ID
 * @param {Object} updateData - 업데이트할 데이터
 * @param {string} userId - 현재 사용자 ID
 * @returns {Promise<Object>} - 업데이트된 리소스 객체
 */
async function updateWithLock(model, id, updateData, userId) {
  const transaction = await sequelize.transaction();
  
  try {
    const primaryKeyField = model.primaryKeyAttribute;
    
    // 락 획득
    const query = {};
    query[primaryKeyField] = id;
    
    const resource = await model.findOne({
      where: query,
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    
    if (!resource) {
      await transaction.rollback();
      throw new NotFoundException(id);
    }
    
    // 데이터 업데이트
    Object.keys(updateData).forEach(key => {
      resource[key] = updateData[key];
    });
    
    // 업데이트 메타데이터
    resource.updated_by = userId;
    resource.updated_at = new Date();
    
    await resource.save({ transaction });
    await transaction.commit();
    
    return resource;
  } catch (error) {
    await transaction.rollback();
    
    if (
      error.name === 'SequelizeDatabaseError' && 
      (error.message.includes('could not obtain lock') || 
       error.message.includes('Lock wait timeout') || 
       error.message.includes('Deadlock found'))
    ) {
      throw new LockConflictException('다른 사용자가 현재 이 데이터를 수정 중입니다');
    }
    
    throw error;
  }
}

/**
 * 모델에서 행 락 해제하는 함수
 * @param {Object} model - Sequelize 모델
 * @param {string} id - 리소스 ID
 * @param {string} userId - 현재 사용자 ID (락 소유자 검증용)
 * @returns {Promise<boolean>} - 해제 성공 여부
 */
async function releaseLock(model, id, userId) {
  const transaction = await sequelize.transaction();
  
  try {
    const primaryKeyField = model.primaryKeyAttribute;
    
    // 리소스 조회
    const query = {};
    query[primaryKeyField] = id;
    
    const resource = await model.findOne({
      where: query,
      transaction
    });
    
    if (!resource) {
      await transaction.rollback();
      throw new NotFoundException(id);
    }
    
    // 락 소유자 검증
    if (resource.updated_by !== userId) {
      await transaction.rollback();
      return false;
    }
    
    // 락 해제
    resource.updated_by = null;
    await resource.save({ transaction });
    
    await transaction.commit();
    return true;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

module.exports = {
  findWithRowLock,
  updateWithLock,
  releaseLock,
  LockConflictException,
  NotFoundException
};