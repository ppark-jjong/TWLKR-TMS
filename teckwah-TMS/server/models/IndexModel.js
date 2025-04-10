const User = require('./user-model');
const Handover = require('./HandoverModel');
const Dashboard = require('./DashboardModel');
const { PostalCode, PostalCodeDetail } = require('./postal_code.model');

// 관계 설정
// 사용자-인수인계 관계
User.hasMany(Handover, {
  foreignKey: 'created_by',
  sourceKey: 'user_id',
  as: 'handovers',
});

Handover.belongsTo(User, {
  foreignKey: 'created_by',
  targetKey: 'user_id',
  as: 'creator',
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
