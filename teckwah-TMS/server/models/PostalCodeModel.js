const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/Database');

const PostalCode = sequelize.define(
  'postal_code',
  {
    postal_code: {
      type: DataTypes.STRING(5),
      primaryKey: true,
      allowNull: false,
      comment: '우편번호',
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: '도시',
    },
    county: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: '군/구',
    },
    district: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: '동/읍/면',
    },
  },
  {
    tableName: 'postal_code',
    timestamps: false,
  }
);

// 우편번호 상세 모델 정의
const PostalCodeDetail = sequelize.define(
  'postal_code_detail',
  {
    postal_code: {
      type: DataTypes.STRING(5),
      primaryKey: true,
      allowNull: false,
      comment: '우편번호',
      references: {
        model: 'postal_code',
        key: 'postal_code',
      },
    },
    warehouse: {
      type: DataTypes.ENUM('SEOUL', 'BUSAN', 'GWANGJU', 'DAEJEON'),
      primaryKey: true,
      allowNull: false,
      comment: '창고',
    },
    distance: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '거리(미터)',
    },
    duration_time: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '소요시간(초)',
    },
  },
  {
    tableName: 'postal_code_detail',
    timestamps: false,
    indexes: [
      {
        name: 'idx_warehouse_postal',
        fields: ['warehouse', 'postal_code'],
      },
    ],
  }
);

// 관계 설정
PostalCode.hasMany(PostalCodeDetail, {
  foreignKey: 'postal_code',
  sourceKey: 'postal_code',
  as: 'details',
});

PostalCodeDetail.belongsTo(PostalCode, {
  foreignKey: 'postal_code',
  targetKey: 'postal_code',
  as: 'postalCode',
});

module.exports = {
  PostalCode,
  PostalCodeDetail,
};