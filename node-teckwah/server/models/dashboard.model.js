const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Dashboard = sequelize.define('dashboard', {
  dashboard_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  order_no: {
    type: DataTypes.STRING(15),
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('DELIVERY', 'RETURN'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('WAITING', 'IN_PROGRESS', 'COMPLETE', 'ISSUE', 'CANCEL'),
    allowNull: false,
    defaultValue: 'WAITING'
  },
  department: {
    type: DataTypes.ENUM('CS', 'HES', 'LENOVO'),
    allowNull: false
  },
  warehouse: {
    type: DataTypes.ENUM('SEOUL', 'BUSAN', 'GWANGJU', 'DAEJEON'),
    allowNull: false
  },
  sla: {
    type: DataTypes.STRING(10),
    allowNull: false
  },
  eta: {
    type: DataTypes.DATE,
    allowNull: false
  },
  create_time: {
    type: DataTypes.DATE,
    allowNull: false
  },
  depart_time: {
    type: DataTypes.DATE,
    allowNull: true
  },
  complete_time: {
    type: DataTypes.DATE,
    allowNull: true
  },
  postal_code: {
    type: DataTypes.STRING(5),
    allowNull: false,
    references: {
      model: 'postal_code',
      key: 'postal_code'
    }
  },
  city: {
    type: DataTypes.STRING(21),
    allowNull: true
  },
  county: {
    type: DataTypes.STRING(51),
    allowNull: true
  },
  district: {
    type: DataTypes.STRING(51),
    allowNull: true
  },
  distance: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  duration_time: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  customer: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  contact: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  driver_name: {
    type: DataTypes.STRING(153),
    allowNull: true
  },
  driver_contact: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  updated_by: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  remark: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  update_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'dashboard',
  timestamps: false,
  indexes: [
    {
      name: 'idx_dashboard_status',
      fields: ['status']
    },
    {
      name: 'idx_dashboard_department',
      fields: ['department']
    },
    {
      name: 'idx_dashboard_eta',
      fields: ['eta']
    }
  ]
});

// region 가상 필드 생성
Dashboard.prototype.getRegion = function() {
  const { city, county, district } = this;
  return [city, county, district].filter(Boolean).join(' ');
};

module.exports = Dashboard;
