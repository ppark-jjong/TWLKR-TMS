const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('user', {
  user_id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    allowNull: false
  },
  user_password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  user_department: {
    type: DataTypes.ENUM('CS', 'HES', 'LENOVO'),
    allowNull: false
  },
  user_role: {
    type: DataTypes.ENUM('ADMIN', 'USER'),
    allowNull: false,
    defaultValue: 'USER'
  }
}, {
  tableName: 'user',
  timestamps: false,
  indexes: [
    {
      name: 'idx_user_department',
      fields: ['user_department']
    }
  ]
});

module.exports = User;
