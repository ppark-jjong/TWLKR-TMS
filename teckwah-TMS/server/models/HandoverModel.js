const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/Database');
const User = require('./user-model');

const Handover = sequelize.define(
  'Handover',
  {
    handover_id: {
      type: DataTypes.STRING(10),
      primaryKey: true,
      allowNull: false,
      comment: '인수인계 ID (예: H001)',
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: '제목',
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: '내용',
    },
    created_by: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '작성자 ID',
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
    is_notice: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: '공지사항 여부',
    },
    department: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: '관련 부서 (없으면 전체 대상)',
    },
    priority: {
      type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH'),
      defaultValue: 'MEDIUM',
      comment: '중요도',
    },
    expiry_date: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '만료일 (지정된 경우 해당 날짜 이후 표시 안함)',
    },
  },
  {
    tableName: 'handover',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        name: 'idx_handover_date',
        fields: ['created_at'],
      },
      {
        name: 'idx_handover_notice',
        fields: ['is_notice'],
      },
      {
        name: 'idx_handover_department',
        fields: ['department'],
      },
      {
        name: 'idx_handover_priority',
        fields: ['priority'],
      },
      {
        name: 'idx_handover_expiry',
        fields: ['expiry_date'],
      },
    ],
  }
);

// 관계 설정
Handover.belongsTo(User, {
  foreignKey: 'created_by',
  targetKey: 'user_id',
  as: 'creator',
});

Handover.belongsTo(User, {
  foreignKey: 'updated_by',
  targetKey: 'user_id',
  as: 'updater',
});

module.exports = Handover;
