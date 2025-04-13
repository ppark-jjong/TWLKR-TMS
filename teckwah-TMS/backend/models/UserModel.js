const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/Database");
const bcrypt = require("bcryptjs");

const User = sequelize.define(
  "User",
  {
    user_id: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      allowNull: false,
      comment: "사용자 ID",
    },
    user_password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: "비밀번호 (해시됨)",
    },
    user_department: {
      type: DataTypes.ENUM("CS", "HES", "LENOVO"),
      allowNull: false,
      comment: "사용자 부서",
    },
    user_role: {
      type: DataTypes.ENUM("ADMIN", "USER"),
      allowNull: false,
      comment: "사용자 역할 (ADMIN/USER)",
    },
  },
  {
    tableName: "user",
    timestamps: true,
    underscored: true,
    hooks: {
      beforeCreate: async (user) => {
        if (user.user_password) {
          user.user_password = await bcrypt.hash(user.user_password, 10);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed("user_password")) {
          user.user_password = await bcrypt.hash(user.user_password, 10);
        }
      },
    },
  }
);

// 비밀번호 검증 메소드
User.prototype.validatePassword = async function (password) {
  return await bcrypt.compare(password, this.user_password);
};

module.exports = User;
