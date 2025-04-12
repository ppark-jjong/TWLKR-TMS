const express = require("express");
const { Op } = require("sequelize");
const User = require("../models/UserModel");
const { authenticate, isAdmin } = require("../middlewares/AuthMiddleware");
const {
  createResponse,
  ERROR_CODES,
  DEPARTMENTS,
} = require("../utils/Constants");

const router = express.Router();

/**
 * 사용자 목록 조회 API (관리자 전용)
 * GET /users/list
 * 쿼리 파라미터: role, department, search
 */
router.get("/list", authenticate, isAdmin, async (req, res, next) => {
  try {
    const { role, department, search } = req.query;

    // 조회 조건 설정
    const whereCondition = {};

    if (role) {
      whereCondition.user_role = role;
    }

    if (department) {
      whereCondition.user_department = department;
    }

    if (search) {
      whereCondition[Op.or] = [{ user_id: { [Op.like]: `%${search}%` } }];
    }

    // 정렬 설정
    const allowedSortColumns = [
      "user_id",
      "user_role",
      "user_department",
      "created_at",
    ];

    // 목록 조회 - 페이징 없이 전체 조회
    const users = await User.findAll({
      where: whereCondition,
      attributes: [
        "user_id",
        ["user_role", "role"],
        ["user_department", "department"],
        "created_at",
        "updated_at",
      ],
    });

    return res
      .status(200)
      .json(createResponse(true, "사용자 목록 조회 성공", users));
  } catch (error) {
    next(error);
  }
});

/**
 * 사용자 상세 조회 API (관리자 전용)
 * GET /users/:id
 */
router.get("/:id", authenticate, isAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    // 사용자 조회
    const user = await User.findByPk(id, {
      attributes: [
        "user_id",
        ["user_role", "role"],
        ["user_department", "department"],
        "created_at",
        "updated_at",
      ],
    });

    if (!user) {
      return res
        .status(404)
        .json(
          createResponse(
            false,
            "해당 사용자를 찾을 수 없습니다",
            null,
            ERROR_CODES.NOT_FOUND
          )
        );
    }

    return res
      .status(200)
      .json(createResponse(true, "사용자 상세 조회 성공", user));
  } catch (error) {
    next(error);
  }
});

/**
 * 사용자 생성 API (관리자 전용)
 * POST /users
 */
router.post("/", authenticate, isAdmin, async (req, res, next) => {
  try {
    const { user_id, password, role = "USER", department } = req.body;

    // 기본 유효성 검사
    if (!user_id || !password) {
      return res
        .status(400)
        .json(
          createResponse(
            false,
            "필수 항목을 모두 입력해주세요",
            null,
            ERROR_CODES.VALIDATION_ERROR
          )
        );
    }

    // 부서 유효성 검사
    if (!department || !DEPARTMENTS.includes(department)) {
      return res
        .status(400)
        .json(
          createResponse(
            false,
            "유효한 부서를 입력해주세요",
            null,
            ERROR_CODES.VALIDATION_ERROR
          )
        );
    }

    // 역할 유효성 검사
    if (role !== "ADMIN" && role !== "USER") {
      return res
        .status(400)
        .json(
          createResponse(
            false,
            "유효한 역할을 입력해주세요 (ADMIN 또는 USER)",
            null,
            ERROR_CODES.VALIDATION_ERROR
          )
        );
    }

    // 비밀번호 강도 검사
    if (password.length < 6) {
      return res
        .status(400)
        .json(
          createResponse(
            false,
            "비밀번호는 최소 6자 이상이어야 합니다",
            null,
            ERROR_CODES.VALIDATION_ERROR
          )
        );
    }

    // 사용자 ID 중복 확인
    const existingUser = await User.findByPk(user_id);

    if (existingUser) {
      return res
        .status(400)
        .json(
          createResponse(
            false,
            "이미 존재하는 사용자 ID입니다",
            null,
            ERROR_CODES.VALIDATION_ERROR
          )
        );
    }

    // 사용자 생성
    const newUser = await User.create({
      user_id,
      user_password: password,
      user_role: role,
      user_department: department,
    });

    return res.status(201).json(
      createResponse(true, "사용자가 성공적으로 생성되었습니다", {
        user_id: newUser.user_id,
        role: newUser.user_role,
        department: newUser.user_department,
      })
    );
  } catch (error) {
    next(error);
  }
});

/**
 * 사용자 수정 API (관리자 전용)
 * PUT /users/:id
 */
router.put("/:id", authenticate, isAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { password, role, department } = req.body;

    // 하나 이상의 필드가 있는지 확인
    if (!password && !role && !department) {
      return res
        .status(400)
        .json(
          createResponse(
            false,
            "수정할 필드를 하나 이상 입력해주세요",
            null,
            ERROR_CODES.VALIDATION_ERROR
          )
        );
    }

    // 부서 유효성 검사
    if (department && !DEPARTMENTS.includes(department)) {
      return res
        .status(400)
        .json(
          createResponse(
            false,
            "유효한 부서를 입력해주세요",
            null,
            ERROR_CODES.VALIDATION_ERROR
          )
        );
    }

    // 역할 유효성 검사
    if (role && role !== "ADMIN" && role !== "USER") {
      return res
        .status(400)
        .json(
          createResponse(
            false,
            "유효한 역할을 입력해주세요 (ADMIN 또는 USER)",
            null,
            ERROR_CODES.VALIDATION_ERROR
          )
        );
    }

    // 비밀번호 강도 검사
    if (password && password.length < 6) {
      return res
        .status(400)
        .json(
          createResponse(
            false,
            "비밀번호는 최소 6자 이상이어야 합니다",
            null,
            ERROR_CODES.VALIDATION_ERROR
          )
        );
    }

    // 사용자 조회
    const user = await User.findByPk(id);

    if (!user) {
      return res
        .status(404)
        .json(
          createResponse(
            false,
            "해당 사용자를 찾을 수 없습니다",
            null,
            ERROR_CODES.NOT_FOUND
          )
        );
    }

    // 데이터 업데이트
    if (password) user.user_password = password;
    if (role) user.user_role = role;
    if (department) user.user_department = department;

    await user.save();

    return res.status(200).json(
      createResponse(true, "사용자 정보가 성공적으로 수정되었습니다", {
        user_id: user.user_id,
        role: user.user_role,
        department: user.user_department,
      })
    );
  } catch (error) {
    next(error);
  }
});

/**
 * 사용자 삭제 API (관리자 전용)
 * DELETE /users/:id
 */
router.delete("/:id", authenticate, isAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    // 자기 자신은 삭제 불가
    if (id === req.user.user_id) {
      return res
        .status(400)
        .json(
          createResponse(
            false,
            "자기 자신을 삭제할 수 없습니다",
            null,
            ERROR_CODES.VALIDATION_ERROR
          )
        );
    }

    // 사용자 조회
    const user = await User.findByPk(id);

    if (!user) {
      return res
        .status(404)
        .json(
          createResponse(
            false,
            "해당 사용자를 찾을 수 없습니다",
            null,
            ERROR_CODES.NOT_FOUND
          )
        );
    }

    // 관련 데이터 없이 사용자만 삭제하는 것이 안전
    await user.destroy();

    return res
      .status(200)
      .json(createResponse(true, "사용자가 성공적으로 삭제되었습니다"));
  } catch (error) {
    next(error);
  }
});

/**
 * 부서 목록 조회 API
 * GET /users/departments/list
 */
router.get("/departments/list", authenticate, async (req, res, next) => {
  try {
    return res.status(200).json(
      createResponse(true, "부서 목록 조회 성공", {
        departments: DEPARTMENTS,
      })
    );
  } catch (error) {
    next(error);
  }
});

/**
 * 비밀번호 변경 API
 * PUT /users/password/change
 */
router.put("/password/change", authenticate, async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    const userId = req.user.user_id;

    // 필수 항목 검사
    if (!current_password || !new_password) {
      return res
        .status(400)
        .json(
          createResponse(
            false,
            "현재 비밀번호와 새 비밀번호를 모두 입력해주세요",
            null,
            ERROR_CODES.VALIDATION_ERROR
          )
        );
    }

    // 새 비밀번호 강도 검사
    if (new_password.length < 6) {
      return res
        .status(400)
        .json(
          createResponse(
            false,
            "새 비밀번호는 최소 6자 이상이어야 합니다",
            null,
            ERROR_CODES.VALIDATION_ERROR
          )
        );
    }

    // 사용자 조회
    const user = await User.findByPk(userId);

    if (!user) {
      return res
        .status(404)
        .json(
          createResponse(
            false,
            "사용자 정보를 찾을 수 없습니다",
            null,
            ERROR_CODES.NOT_FOUND
          )
        );
    }

    // 현재 비밀번호 검증
    const isValidPassword = await user.validatePassword(current_password);

    if (!isValidPassword) {
      return res
        .status(400)
        .json(
          createResponse(
            false,
            "현재 비밀번호가 일치하지 않습니다",
            null,
            ERROR_CODES.VALIDATION_ERROR
          )
        );
    }

    // 새 비밀번호가 현재 비밀번호와 같은지 확인
    if (current_password === new_password) {
      return res
        .status(400)
        .json(
          createResponse(
            false,
            "새 비밀번호는 현재 비밀번호와 달라야 합니다",
            null,
            ERROR_CODES.VALIDATION_ERROR
          )
        );
    }

    // 비밀번호 업데이트
    user.user_password = new_password;
    await user.save();

    // 리프레시 토큰 무효화 (선택적)
    user.refresh_token = null;
    await user.save();

    return res
      .status(200)
      .json(
        createResponse(
          true,
          "비밀번호가 성공적으로 변경되었습니다. 다시 로그인해주세요"
        )
      );
  } catch (error) {
    next(error);
  }
});

module.exports = router;
