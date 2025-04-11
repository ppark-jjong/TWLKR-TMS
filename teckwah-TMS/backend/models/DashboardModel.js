const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./UserModel');

const Dashboard = sequelize.define(
  'Dashboard',
  {
    dashboard_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      comment: '대시보드 ID',
    },
    order_no: {
      type: DataTypes.STRING(15),
      allowNull: false,
      unique: true,
      comment: '주문 번호',
    },
    type: {
      type: DataTypes.ENUM('DELIVERY', 'RETURN'),
      allowNull: false,
      comment: '배송 유형',
    },
    status: {
      type: DataTypes.ENUM('WAITING', 'IN_PROGRESS', 'COMPLETE', 'ISSUE', 'CANCEL'),
      defaultValue: 'WAITING',
      allowNull: false,
      comment: '배송 상태',
    },
    department: {
      type: DataTypes.ENUM('CS', 'HES', 'LENOVO'),
      allowNull: false,
      comment: '담당 부서',
    },
    warehouse: {
      type: DataTypes.ENUM('SEOUL', 'BUSAN', 'GWANGJU', 'DAEJEON'),
      allowNull: false,
      comment: '창고 위치',
    },
    sla: {
      type: DataTypes.STRING(10),
      allowNull: false,
      comment: 'SLA 정보',
    },
    eta: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: '예상 배송 시간',
    },
    create_time: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: '생성 시간',
    },
    depart_time: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '출발 시간',
    },
    complete_time: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '완료 시간',
    },
    postal_code: {
      type: DataTypes.STRING(5),
      allowNull: false,
      comment: '우편번호',
    },
    city: {
      type: DataTypes.STRING(21),
      allowNull: true,
      comment: '도시',
    },
    county: {
      type: DataTypes.STRING(51),
      allowNull: true,
      comment: '군/구',
    },
    district: {
      type: DataTypes.STRING(51),
      allowNull: true,
      comment: '동/읍/면',
    },
    // region은 GENERATED ALWAYS AS 컬럼이므로 Sequelize 모델에서는 가상 필드로 정의
    region: {
      type: DataTypes.VIRTUAL,
      get() {
        return `${this.city || ''} ${this.county || ''} ${this.district || ''}`.trim();
      },
    },
    distance: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '거리(미터)',
    },
    duration_time: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '소요 시간(초)',
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: '상세 주소',
    },
    customer: {
      type: DataTypes.STRING(150),
      allowNull: false,
      comment: '고객명',
    },
    contact: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: '연락처',
    },
    driver_name: {
      type: DataTypes.STRING(153),
      allowNull: true,
      comment: '기사명',
    },
    driver_contact: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: '기사 연락처',
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
    remark: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '비고',
    },
    update_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
      comment: '수정 시간',
    },
  },
  {
    tableName: 'dashboard',
    timestamps: false, // 명시적 타임스탬프 필드 사용
    hooks: {
      beforeUpdate: async (instance) => {
        // 상태가 변경되면 완료 시간 업데이트
        if (instance.changed('status') && instance.status === 'COMPLETE') {
          instance.complete_time = new Date();
        }
        
        // 수정 시간 업데이트
        instance.update_at = new Date();
      },
    },
    indexes: [
      { name: 'idx_dashboard_status', fields: ['status'] },
      { name: 'idx_dashboard_department', fields: ['department'] },
      { name: 'idx_dashboard_eta', fields: ['eta'] },
      { name: 'idx_dashboard_order_no', fields: ['order_no'] },
    ],
  }
);

// 관계 설정 - 실제 DB 스키마에 맞게 조정
Dashboard.belongsTo(User, {
  foreignKey: 'updated_by',
  targetKey: 'user_id',
  as: 'updater',
});

module.exports = Dashboard;