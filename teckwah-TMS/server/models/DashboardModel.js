const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/Database');
const User = require('./user-model');

const Dashboard = sequelize.define(
  'Dashboard',
  {
    dashboard_id: {
      type: DataTypes.STRING(10),
      primaryKey: true,
      allowNull: false,
      comment: '대시보드 ID',
    },
    order_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: '주문 번호',
    },
    customer_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '고객 이름',
    },
    delivery_address: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: '배송 주소',
    },
    phone_number: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: '연락처',
    },
    status: {
      type: DataTypes.ENUM(
        'PENDING',
        'ASSIGNED',
        'IN_TRANSIT',
        'DELIVERED',
        'CANCELLED'
      ),
      defaultValue: 'PENDING',
      allowNull: false,
      comment: '배송 상태',
    },
    department: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '담당 부서',
    },
    driver_id: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: '배송 기사 ID',
      references: {
        model: User,
        key: 'user_id',
      },
    },
    estimated_delivery: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '예상 배송 시간',
    },
    actual_delivery: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '실제 배송 완료 시간',
    },
    order_items: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '주문 품목 (JSON 형식)',
    },
    order_note: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '주문 특이사항',
    },
    priority: {
      type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT'),
      defaultValue: 'MEDIUM',
      comment: '우선순위',
    },
    created_by: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '생성자 ID',
      references: {
        model: User,
        key: 'user_id',
      },
    },
    updated_by: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: '최종 수정자 ID',
      references: {
        model: User,
        key: 'user_id',
      },
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    last_status_change: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '마지막 상태 변경 시간',
    },
    longitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
      comment: '배송지 경도',
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
      comment: '배송지 위도',
    },
    status_history: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '상태 변경 이력 (JSON 형식)',
    },
  },
  {
    tableName: 'dashboard',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
      beforeUpdate: async (instance) => {
        // 상태가 변경되면 상태 변경 시간과 이력 업데이트
        if (instance.changed('status')) {
          instance.last_status_change = new Date();

          let history = [];

          // 기존 이력이 있으면 파싱
          if (instance.status_history) {
            try {
              history = JSON.parse(instance.status_history);
            } catch (e) {
              console.error('상태 이력 파싱 오류:', e);
              history = [];
            }
          }

          // 새 상태 변경 이력 추가
          history.push({
            status: instance.status,
            changed_at: new Date().toISOString(),
            changed_by: instance.updated_by,
          });

          // 이력 저장
          instance.status_history = JSON.stringify(history);

          // DELIVERED 상태로 변경 시 실제 배송 완료 시간 기록
          if (instance.status === 'DELIVERED') {
            instance.actual_delivery = new Date();
          }
        }
      },
    },
    indexes: [
      {
        name: 'idx_dashboard_status',
        fields: ['status'],
      },
      {
        name: 'idx_dashboard_department',
        fields: ['department'],
      },
      {
        name: 'idx_dashboard_estimated_delivery',
        fields: ['estimated_delivery'],
      },
      {
        name: 'idx_dashboard_driver',
        fields: ['driver_id'],
      },
      {
        name: 'idx_dashboard_priority',
        fields: ['priority'],
      },
      {
        name: 'idx_dashboard_last_status_change',
        fields: ['last_status_change'],
      },
    ],
  }
);

// 관계 설정
Dashboard.belongsTo(User, {
  foreignKey: 'created_by',
  targetKey: 'user_id',
  as: 'creator',
});

Dashboard.belongsTo(User, {
  foreignKey: 'updated_by',
  targetKey: 'user_id',
  as: 'updater',
});

Dashboard.belongsTo(User, {
  foreignKey: 'driver_id',
  targetKey: 'user_id',
  as: 'driver',
});

module.exports = Dashboard;
