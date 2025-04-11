const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcrypt');

const User = sequelize.define(
  'User',
  {
    user_id: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      allowNull: false,
      comment: '사용자 ID',
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: '비밀번호 (해시됨)',
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '사용자 이름',
    },
    department: {
      type: DataTypes.ENUM('CS', 'HES', 'LENOVO'),
      allowNull: false,
      comment: '사용자 부서',
    },
    role: {
      type: DataTypes.ENUM('ADMIN', 'USER'),
      allowNull: false,
      comment: '사용자 역할 (ADMIN/USER)',
    },
    refresh_token: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'JWT 리프레시 토큰',
    }
  },
  {
    tableName: 'users',
    timestamps: true,
    underscored: true,
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      },
    },
  }
);

// 비밀번호 검증 메소드
User.prototype.validatePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = User;