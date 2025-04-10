const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Handover = sequelize.define('handover', {
  handover_id: {
    type: DataTypes.STRING(10),
    primaryKey: true,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  created_by: {
    type: DataTypes.STRING(50),
    allowNull: false,
    references: {
      model: 'user',
      key: 'user_id'
    }
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  is_notice: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'handover',
  timestamps: false,
  indexes: [
    {
      name: 'idx_handover_date',
      fields: ['created_at']
    },
    {
      name: 'idx_handover_notice',
      fields: ['is_notice']
    }
  ]
});

module.exports = Handover;
