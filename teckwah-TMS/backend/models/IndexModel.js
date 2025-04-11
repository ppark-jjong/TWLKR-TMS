const User = require('./UserModel');
const Handover = require('./HandoverModel');
const Dashboard = require('./DashboardModel');
const { PostalCode, PostalCodeDetail } = require('./PostalCodeModel');

// 관계 설정
// 사용자-인수인계 관계
User.hasMany(Handover, {
  foreignKey: 'update_by',
  sourceKey: 'user_id',
  as: 'handovers',
});

// 대시보드-우편번호 관계
Dashboard.belongsTo(PostalCode, {
  foreignKey: 'postal_code',
  targetKey: 'postal_code',
  as: 'postal_code_info',
});

PostalCode.hasMany(Dashboard, {
  foreignKey: 'postal_code',
  sourceKey: 'postal_code',
  as: 'dashboards',
});

// 모듈 내보내기
module.exports = {
  User,
  Handover,
  Dashboard,
  PostalCode,
  PostalCodeDetail,
};