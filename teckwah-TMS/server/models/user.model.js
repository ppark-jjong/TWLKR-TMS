const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcrypt');

const User = sequelize.define('User', {
  user_id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    allowNull: false,
    comment: '사용자 ID'
  },
  password: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '비밀번호 (해시됨)'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '사용자 이름'
  },
  role: {
    type: DataTypes.ENUM('ADMIN', 'USER'),
    defaultValue: 'USER',
    allowNull: false,
    comment: '사용자 역할 (ADMIN/USER)'
  },
  department: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '부서'
  },
  refresh_token: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '리프레시 토큰'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  }
}, {
  tableName: 'user',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
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
    }
  }
});

// 비밀번호 검증 메소드
User.prototype.validatePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = User;