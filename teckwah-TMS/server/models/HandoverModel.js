const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/Database');
const User = require('./UserModel');

const Handover = sequelize.define(
  'Handover',
  {
    handover_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      comment: '인수인계 ID',
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
    update_by: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '작성/수정자 ID',
      references: {
        model: User,
        key: 'user_id',
      },
    },
    is_notice: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: '공지사항 여부',
    },
    create_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
      comment: '생성 시간',
    },
    update_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
      comment: '수정 시간',
    },
  },
  {
    tableName: 'handover',
    timestamps: false, // 명시적 타임스탬프 필드 사용
    hooks: {
      beforeUpdate: async (instance) => {
        // 수정 시간 업데이트
        instance.update_at = new Date();
      },
    },
    indexes: [
      { name: 'idx_handover_date', fields: ['create_at'] },
      { name: 'idx_handover_notice', fields: ['is_notice'] },
    ],
  }
);

// 관계 설정
Handover.belongsTo(User, {
  foreignKey: 'update_by',
  targetKey: 'user_id',
  as: 'updater',
});

module.exports = Handover;