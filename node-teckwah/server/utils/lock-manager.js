const { Sequelize } = require('sequelize');
const logger = require('./logger');

class LockManager {
  constructor() {
    this.maxRetry = 2; // 락 획득 최대 재시도 횟수
    this.retryDelay = 500; // 재시도 간 지연 시간(ms)
  }

  /**
   * 행 수준 락 획득
   * @param {Object} model - Sequelize 모델
   * @param {Number|String} resourceId - 리소스 ID
   * @param {String} userId - 사용자 ID
   * @param {String} actionType - 작업 유형 (EDIT, STATUS, ASSIGN 등)
   * @param {Boolean} nowait - 즉시 실패 여부
   * @returns {Object} 락 결과 객체
   */
  async acquireLock(model, resourceId, userId, actionType = 'EDIT', nowait = true) {
    try {
      // 모델의 기본 키 필드명 가져오기
      const primaryKeyField = model.primaryKeyField || Object.keys(model.primaryKeys)[0];
      
      // 트랜잭션 생성
      const transaction = await model.sequelize.transaction();
      
      try {
        // SELECT FOR UPDATE 쿼리 실행
        const lockOptions = {
          where: { [primaryKeyField]: resourceId },
          transaction,
          lock: nowait ? Sequelize.Transaction.LOCK.UPDATE : true
        };
        
        const resource = await model.findOne(lockOptions);
        
        if (!resource) {
          await transaction.rollback();
          return {
            success: false,
            message: `ID가 ${resourceId}인 리소스를 찾을 수 없습니다`,
            error_code: 'NOT_FOUND'
          };
        }

        // UI 표시용 락 정보 업데이트
        if (resource.updated_by !== undefined) {
          resource.updated_by = userId;
          await resource.save({ transaction });
        }

        // 락 정보 생성
        const now = new Date();
        const lockInfo = {
          resource_id: resourceId,
          resource_type: model.name,
          locked_by: userId,
          action_type: actionType,
          locked_at: now,
          expires_at: new Date(now.getTime() + 5 * 60 * 1000) // 5분 후 만료
        };

        await transaction.commit();
        logger.info(`락 획득 성공: ${model.name}(ID: ${resourceId}) - 사용자: ${userId}`);
        
        return {
          success: true,
          message: '락 획득에 성공했습니다',
          data: lockInfo
        };
      } catch (error) {
        await transaction.rollback();
        
        // 락 충돌 오류 처리
        if (error.name === 'SequelizeDatabaseError' && 
           (error.message.includes('could not obtain lock') || 
            error.message.includes('deadlock detected'))) {
          
          logger.warn(`락 충돌 발생: ${model.name}(ID: ${resourceId}) - 사용자: ${userId}`);
          
          return {
            success: false,
            message: '다른 사용자가 현재 이 데이터를 수정 중입니다. 잠시 후 다시 시도해주세요.',
            error_code: 'LOCK_CONFLICT'
          };
        }
        
        throw error;
      }
    } catch (error) {
      logger.error(`락 획득 중 오류 발생: ${error.message}`, {
        model: model.name,
        resourceId,
        userId,
        error: error.stack
      });
      
      return {
        success: false,
        message: `락 획득 중 오류가 발생했습니다: ${error.message}`,
        error_code: 'SERVER_ERROR'
      };
    }
  }

  /**
   * 여러 리소스에 대한 락 획득
   * @param {Object} model - Sequelize 모델
   * @param {Array} resourceIds - 리소스 ID 배열
   * @param {String} userId - 사용자 ID
   * @param {String} actionType - 작업 유형
   * @returns {Object} 락 결과 객체
   */
  async acquireMultipleLocks(model, resourceIds, userId, actionType = 'EDIT') {
    const results = {
      success: true,
      message: '모든 리소스에 대한 락 획득 성공',
      locks: [],
      failed_ids: []
    };
    
    const acquiredLocks = [];
    
    try {
      // 모든 ID에 대해 락 획득 시도
      for (const resourceId of resourceIds) {
        const lockResult = await this.acquireLock(model, resourceId, userId, actionType);
        
        if (lockResult.success) {
          acquiredLocks.push(lockResult.data);
        } else {
          results.failed_ids.push(resourceId);
          results.success = false;
        }
      }
      
      // 일부 실패한 경우
      if (results.failed_ids.length > 0) {
        const failedCount = results.failed_ids.length;
        const totalCount = resourceIds.length;
        
        results.message = `${totalCount}개 항목 중 ${failedCount}개 항목의 락 획득에 실패했습니다.`;
        
        // 이미 획득한 락 해제
        if (acquiredLocks.length > 0) {
          const acquiredIds = acquiredLocks.map(lock => lock.resource_id);
          await this.releaseMultipleLocks(model, acquiredIds, userId);
        }
        
        return results;
      }
      
      // 모든 락 획득 성공
      results.locks = acquiredLocks;
      return results;
    } catch (error) {
      logger.error(`다중 락 획득 중 오류 발생: ${error.message}`, {
        model: model.name,
        resourceIds,
        userId,
        error: error.stack
      });
      
      // 획득한 락 해제
      if (acquiredLocks.length > 0) {
        const acquiredIds = acquiredLocks.map(lock => lock.resource_id);
        await this.releaseMultipleLocks(model, acquiredIds, userId);
      }
      
      return {
        success: false,
        message: `락 획득 중 오류가 발생했습니다: ${error.message}`,
        error_code: 'SERVER_ERROR'
      };
    }
  }

  /**
   * 락 해제 (트랜잭션 종료 시 자동 해제되므로 로깅만 수행)
   * @param {Object} model - Sequelize 모델
   * @param {Number|String} resourceId - 리소스 ID
   * @param {String} userId - 사용자 ID
   * @returns {Object} 락 해제 결과
   */
  async releaseLock(model, resourceId, userId) {
    try {
      logger.info(`락 해제: ${model.name}(ID: ${resourceId}) - 사용자: ${userId}`);
      
      return {
        success: true,
        message: '락이 해제되었습니다'
      };
    } catch (error) {
      logger.error(`락 해제 중 오류 발생: ${error.message}`, {
        model: model.name,
        resourceId,
        userId,
        error: error.stack
      });
      
      return {
        success: false,
        message: `락 해제 중 오류가 발생했습니다: ${error.message}`,
        error_code: 'SERVER_ERROR'
      };
    }
  }

  /**
   * 여러 락 해제
   * @param {Object} model - Sequelize 모델
   * @param {Array} resourceIds - 리소스 ID 배열
   * @param {String} userId - 사용자 ID
   * @returns {Object} 락 해제 결과
   */
  async releaseMultipleLocks(model, resourceIds, userId) {
    let success = true;
    const failedIds = [];
    
    for (const resourceId of resourceIds) {
      try {
        await this.releaseLock(model, resourceId, userId);
      } catch (error) {
        logger.error(`락 해제 중 오류 발생: ${error.message}`, {
          model: model.name,
          resourceId,
          userId
        });
        
        success = false;
        failedIds.push(resourceId);
      }
    }
    
    if (success) {
      return {
        success: true,
        message: `${resourceIds.length}개 항목의 락이 해제되었습니다`
      };
    } else {
      return {
        success: false,
        message: `${failedIds.length}개 항목의 락 해제에 실패했습니다`,
        failed_ids: failedIds
      };
    }
  }

  /**
   * 현재 락 정보 조회 (UI 표시용)
   * @param {Object} model - Sequelize 모델
   * @param {Number|String} resourceId - 리소스 ID
   * @returns {Object} 락 정보
   */
  async getLockInfo(model, resourceId) {
    try {
      // 모델의 기본 키 필드명 가져오기
      const primaryKeyField = model.primaryKeyField || Object.keys(model.primaryKeys)[0];
      
      // 리소스 조회
      const resource = await model.findOne({
        where: { [primaryKeyField]: resourceId }
      });
      
      if (!resource) {
        return null;
      }
      
      // updated_by와 updated_at 필드가 있으면 가상 락 정보 생성
      if (resource.updated_by && resource.update_at) {
        const lastUpdatedBy = resource.updated_by;
        const lastUpdatedAt = resource.update_at;
        
        // 5분 이내에 업데이트된 경우 편집 중으로 간주
        const now = new Date();
        const timeDiff = Math.floor((now - lastUpdatedAt) / 1000);
        
        if (timeDiff < 300) {  // 5분(300초) 이내
          return {
            is_locked: true,
            metadata: {
              resource_id: resourceId,
              resource_type: model.name,
              locked_by: lastUpdatedBy,
              locked_at: lastUpdatedAt,
              expires_at: new Date(lastUpdatedAt.getTime() + 300 * 1000),
              is_virtual: true  // 실제 DB 락이 아닌 가상 정보
            }
          };
        }
      }
      
      // 락 정보 없음
      return {
        is_locked: false,
        metadata: null
      };
    } catch (error) {
      logger.error(`락 정보 조회 중 오류 발생: ${error.message}`, {
        model: model.name,
        resourceId,
        error: error.stack
      });
      
      return {
        is_locked: false,
        metadata: null,
        error: error.message
      };
    }
  }
}

module.exports = new LockManager();
