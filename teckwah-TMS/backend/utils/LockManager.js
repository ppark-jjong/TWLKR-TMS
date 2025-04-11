const { sequelize } = require('../config/database');
const { ERROR_CODES } = require('./constants');

// 락 충돌 예외 클래스
class LockConflictException extends Error {
  constructor(message = '다른 사용자가 현재 이 데이터를 수정 중입니다') {
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
 * @param {string|number} id - 리소스 ID
 * @param {Object} options - 추가 옵션
 * @returns {Promise<Object>} - 찾은 리소스 객체
 */
async function findWithRowLock(model, id, options = {}) {
  const transaction = await sequelize.transaction();
  
  try {
    const primaryKeyField = model.primaryKeyAttribute || 'id';
    
    // 조회 조건 설정
    const where = {};
    where[primaryKeyField] = id;
    
    // SELECT FOR UPDATE로 행 락 획득
    const resource = await model.findOne({
      where,
      transaction,
      lock: transaction.LOCK.UPDATE,
      ...options
    });
    
    if (!resource) {
      await transaction.rollback();
      throw new NotFoundException(id);
    }
    
    // 트랜잭션은 리턴된 객체가 사용되는 동안 열려있어야 함
    // 호출자가 명시적으로 transaction.commit() 또는 transaction.rollback()을 호출해야 함
    resource.transaction = transaction;
    
    return resource;
  } catch (error) {
    await transaction.rollback();
    
    // 락 충돌 감지 및 예외 변환
    if (
      error.name === 'SequelizeDatabaseError' &&
      (error.message.includes('could not obtain lock') ||
       error.message.includes('Lock wait timeout') ||
       error.message.includes('Deadlock found'))
    ) {
      throw new LockConflictException();
    }
    
    throw error;
  }
}

/**
 * 이미 락 획득한 인스턴스를 업데이트하는 함수
 * @param {Object} resource - 락 획득된 Sequelize 모델 인스턴스
 * @param {Object} updateData - 업데이트할 데이터
 * @returns {Promise<Object>} - 업데이트된 리소스 객체
 */
async function updateWithLock(resource, updateData) {
  try {
    // resource에 transaction 속성이 있는지 확인
    if (!resource.transaction) {
      throw new Error('락이 설정된 리소스가 아닙니다. findWithRowLock으로 먼저 락을 획득하세요.');
    }
    
    const transaction = resource.transaction;
    
    // 데이터 업데이트
    Object.keys(updateData).forEach(key => {
      resource[key] = updateData[key];
    });
    
    // 변경사항 저장
    await resource.save({ transaction });
    
    // 트랜잭션 커밋
    await transaction.commit();
    
    return resource;
  } catch (error) {
    // 에러 발생 시 롤백
    if (resource.transaction) {
      await resource.transaction.rollback();
    }
    
    // 락 충돌 감지 및 예외 변환
    if (
      error.name === 'SequelizeDatabaseError' &&
      (error.message.includes('could not obtain lock') ||
       error.message.includes('Lock wait timeout') ||
       error.message.includes('Deadlock found'))
    ) {
      throw new LockConflictException();
    }
    
    throw error;
  }
}

/**
 * 락 해제 함수 - 주로 작업 취소 시 사용
 * @param {Object} resource - 락 획득된 Sequelize 모델 인스턴스
 * @returns {Promise<boolean>} - 해제 성공 여부
 */
async function releaseLock(resource) {
  try {
    // resource에 transaction 속성이 있는지 확인
    if (!resource.transaction) {
      return false;
    }
    
    // 트랜잭션 롤백으로 락 해제
    await resource.transaction.rollback();
    return true;
  } catch (error) {
    console.error('락 해제 중 오류 발생:', error);
    return false;
  }
}

module.exports = {
  findWithRowLock,
  updateWithLock,
  releaseLock,
  LockConflictException,
  NotFoundException
};