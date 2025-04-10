const bcrypt = require('bcrypt');
const { sequelize } = require('../config/database');
const User = require('../models/user.model');
const Dashboard = require('../models/dashboard.model');
const Handover = require('../models/handover.model');
const { logger } = require('./logger');

// 초기 데이터 추가 함수
async function seedDatabase() {
  try {
    logger.info('데이터베이스 초기 데이터 생성 시작');
    
    // 트랜잭션 시작
    const transaction = await sequelize.transaction();
    
    try {
      // 사용자 데이터 생성
      logger.info('사용자 데이터 생성 중...');
      
      const adminPassword = await bcrypt.hash('admin123', 10);
      const userPassword = await bcrypt.hash('user123', 10);
      
      const users = [
        {
          user_id: 'admin',
          password: adminPassword,
          name: '관리자',
          role: 'ADMIN',
          department: '시스템관리'
        },
        {
          user_id: 'user1',
          password: userPassword,
          name: '김배송',
          role: 'USER',
          department: '배송1팀'
        },
        {
          user_id: 'user2',
          password: userPassword,
          name: '이관제',
          role: 'USER',
          department: '배송2팀'
        },
        {
          user_id: 'user3',
          password: userPassword,
          name: '박직원',
          role: 'USER',
          department: '운영팀'
        }
      ];
      
      // 사용자 데이터 저장
      await User.bulkCreate(users, { transaction });
      logger.info(`${users.length}명의 사용자 데이터 생성 완료`);
      
      // 대시보드 데이터 생성
      logger.info('대시보드 데이터 생성 중...');
      
      const dashboards = [
        {
          dashboard_id: 'D001',
          order_number: 'ORD-20250410-001',
          customer_name: '홍길동',
          delivery_address: '서울시 강남구 역삼동 123-45',
          phone_number: '010-1234-5678',
          status: 'PENDING',
          department: '배송1팀',
          driver_id: null,
          estimated_delivery: new Date(new Date().getTime() + 2 * 24 * 60 * 60 * 1000),
          created_by: 'admin',
          updated_by: null,
          priority: 'MEDIUM',
          order_note: '부재 시 경비실에 맡겨주세요.',
          latitude: 37.501311,
          longitude: 127.039471,
          status_history: JSON.stringify([
            {
              status: 'PENDING',
              changed_at: new Date().toISOString(),
              changed_by: 'admin'
            }
          ])
        },
        {
          dashboard_id: 'D002',
          order_number: 'ORD-20250410-002',
          customer_name: '김철수',
          delivery_address: '서울시 송파구 잠실동 456-78',
          phone_number: '010-2345-6789',
          status: 'ASSIGNED',
          department: '배송1팀',
          driver_id: 'user1',
          estimated_delivery: new Date(new Date().getTime() + 1 * 24 * 60 * 60 * 1000),
          created_by: 'admin',
          updated_by: null,
          priority: 'HIGH',
          order_note: '오전 배송 요청',
          latitude: 37.513858,
          longitude: 127.099689,
          status_history: JSON.stringify([
            {
              status: 'PENDING',
              changed_at: new Date(new Date().getTime() - 1 * 60 * 60 * 1000).toISOString(),
              changed_by: 'admin'
            },
            {
              status: 'ASSIGNED',
              changed_at: new Date().toISOString(),
              changed_by: 'admin'
            }
          ])
        },
        {
          dashboard_id: 'D003',
          order_number: 'ORD-20250410-003',
          customer_name: '이영희',
          delivery_address: '서울시 마포구 합정동 789-12',
          phone_number: '010-3456-7890',
          status: 'IN_TRANSIT',
          department: '배송2팀',
          driver_id: 'user2',
          estimated_delivery: new Date(new Date().getTime() + 6 * 60 * 60 * 1000),
          created_by: 'admin',
          updated_by: null,
          priority: 'URGENT',
          latitude: 37.549559,
          longitude: 126.913483,
          status_history: JSON.stringify([
            {
              status: 'PENDING',
              changed_at: new Date(new Date().getTime() - 2 * 60 * 60 * 1000).toISOString(),
              changed_by: 'admin'
            },
            {
              status: 'ASSIGNED',
              changed_at: new Date(new Date().getTime() - 1 * 60 * 60 * 1000).toISOString(),
              changed_by: 'admin'
            },
            {
              status: 'IN_TRANSIT',
              changed_at: new Date().toISOString(),
              changed_by: 'user2'
            }
          ])
        },
        {
          dashboard_id: 'D004',
          order_number: 'ORD-20250410-004',
          customer_name: '박민수',
          delivery_address: '서울시 서초구 방배동 345-67',
          phone_number: '010-4567-8901',
          status: 'DELIVERED',
          department: '배송2팀',
          driver_id: 'user2',
          estimated_delivery: new Date(new Date().getTime() - 1 * 60 * 60 * 1000),
          actual_delivery: new Date(),
          created_by: 'admin',
          updated_by: null,
          priority: 'MEDIUM',
          latitude: 37.483561,
          longitude: 126.997772,
          status_history: JSON.stringify([
            {
              status: 'PENDING',
              changed_at: new Date(new Date().getTime() - 5 * 60 * 60 * 1000).toISOString(),
              changed_by: 'admin'
            },
            {
              status: 'ASSIGNED',
              changed_at: new Date(new Date().getTime() - 4 * 60 * 60 * 1000).toISOString(),
              changed_by: 'admin'
            },
            {
              status: 'IN_TRANSIT',
              changed_at: new Date(new Date().getTime() - 2 * 60 * 60 * 1000).toISOString(),
              changed_by: 'user2'
            },
            {
              status: 'DELIVERED',
              changed_at: new Date().toISOString(),
              changed_by: 'user2'
            }
          ])
        },
        {
          dashboard_id: 'D005',
          order_number: 'ORD-20250410-005',
          customer_name: '정지훈',
          delivery_address: '서울시 성동구 성수동 234-56',
          phone_number: '010-5678-9012',
          status: 'CANCELLED',
          department: '배송1팀',
          driver_id: null,
          estimated_delivery: new Date(new Date().getTime() + 1 * 24 * 60 * 60 * 1000),
          created_by: 'admin',
          updated_by: null,
          priority: 'LOW',
          order_note: '고객 요청으로 취소',
          latitude: 37.542236,
          longitude: 127.054600,
          status_history: JSON.stringify([
            {
              status: 'PENDING',
              changed_at: new Date(new Date().getTime() - 6 * 60 * 60 * 1000).toISOString(),
              changed_by: 'admin'
            },
            {
              status: 'CANCELLED',
              changed_at: new Date().toISOString(),
              changed_by: 'admin'
            }
          ])
        }
      ];
      
      // 대시보드 데이터 저장
      await Dashboard.bulkCreate(dashboards, { transaction });
      logger.info(`${dashboards.length}개의 대시보드 데이터 생성 완료`);
      
      // 인수인계 데이터 생성
      logger.info('인수인계 데이터 생성 중...');
      
      const handovers = [
        {
          handover_id: 'H001',
          title: '[공지] 시스템 사용 안내',
          content: '배송 실시간 관제 시스템 사용법에 대한 안내입니다.\n\n1. 로그인 후 대시보드에서 배송 현황을 확인할 수 있습니다.\n2. 담당 부서의 배송만 상태 변경이 가능합니다.\n3. 문의사항은 관리자에게 연락주세요.',
          created_by: 'admin',
          updated_by: null,
          created_at: new Date(new Date().getTime() - 2 * 24 * 60 * 60 * 1000),
          is_notice: true,
          priority: 'HIGH'
        },
        {
          handover_id: 'H002',
          title: '배송1팀 인수인계',
          content: '오전 배송 건 중 D001, D002는 오후에 상태 업데이트 필요합니다.\n고객 연락처로 배송 전 연락 부탁드립니다.',
          created_by: 'user1',
          updated_by: null,
          department: '배송1팀',
          created_at: new Date(),
          is_notice: false,
          priority: 'MEDIUM'
        },
        {
          handover_id: 'H003',
          title: '배송2팀 특이사항',
          content: '오늘 오후 배송 예정인 D003은 고객이 부재중일 경우 경비실에 맡겨달라는 요청이 있었습니다.',
          created_by: 'user2',
          updated_by: null,
          department: '배송2팀',
          created_at: new Date(new Date().getTime() - 2 * 60 * 60 * 1000),
          is_notice: false,
          priority: 'MEDIUM'
        },
        {
          handover_id: 'H004',
          title: '운영팀 공유사항',
          content: '금일 시스템 점검으로 16:00-16:30 사이 접속이 원활하지 않을 수 있습니다. 양해 부탁드립니다.',
          created_by: 'user3',
          updated_by: null,
          department: '운영팀',
          created_at: new Date(new Date().getTime() - 5 * 60 * 60 * 1000),
          is_notice: false,
          priority: 'MEDIUM'
        },
        {
          handover_id: 'H005',
          title: '[공지] 주말 배송 안내',
          content: '이번 주말(4/13-4/14)은 정상 운영됩니다.\n비상연락처: 관리자(010-9876-5432)',
          created_by: 'admin',
          updated_by: null,
          created_at: new Date(new Date().getTime() - 1 * 24 * 60 * 60 * 1000),
          is_notice: true,
          priority: 'HIGH'
        }
      ];
      
      // 인수인계 데이터 저장
      await Handover.bulkCreate(handovers, { transaction });
      logger.info(`${handovers.length}개의 인수인계 데이터 생성 완료`);
      
      // 트랜잭션 커밋
      await transaction.commit();
      logger.info('데이터베이스 초기 데이터 생성 완료');
      
    } catch (error) {
      // 트랜잭션 롤백
      await transaction.rollback();
      throw error;
    }
    
  } catch (error) {
    logger.error('데이터베이스 초기 데이터 생성 실패:', error);
    process.exit(1);
  }
}

// 스크립트가 직접 실행될 때만 데이터 생성 실행
if (require.main === module) {
  // 데이터베이스 연결 확인 후 데이터 생성
  sequelize.authenticate()
    .then(() => {
      logger.info('데이터베이스 연결 성공');
      return seedDatabase();
    })
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      logger.error('초기 데이터 생성 중 오류 발생:', error);
      process.exit(1);
    });
}

module.exports = seedDatabase;