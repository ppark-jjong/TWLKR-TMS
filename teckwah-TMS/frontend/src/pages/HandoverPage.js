import React, { useState } from "react";
import { Card, Button, notification, Space, Divider, Typography } from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  NotificationOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import HandoverTable from "../components/handover/HandoverTable";
import HandoverDetailModal from "../components/handover/HandoverDetailModal";
import HandoverFormModal from "../components/handover/HandoverFormModal";

import {
  getHandoverList,
  getHandoverDetail,
  createHandover,
  updateHandover,
  deleteHandover,
} from "../api/HandoverService";

const { Title } = Typography;

/**
 * 인수인계 페이지 컴포넌트
 */
const HandoverPage = () => {
  // 상태 관리
  const [noticeFilters, setNoticeFilters] = useState({
    page: 1,
    limit: 5,
  });
  const [handoverFilters, setHandoverFilters] = useState({
    page: 1,
    limit: 10,
  });
  const [selectedHandover, setSelectedHandover] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [isEdit, setIsEdit] = useState(false);

  // React Query 클라이언트
  const queryClient = useQueryClient();

  // 공지사항 목록 조회 쿼리
  const {
    data: noticeData,
    isLoading: isLoadingNotice,
    refetch: refetchNotice,
  } = useQuery(
    ["handoverList", "notice", noticeFilters],
    () =>
      getHandoverList({
        type: "notice",
        page: noticeFilters.page,
        limit: noticeFilters.limit,
      }),
    {
      keepPreviousData: true,
    }
  );

  // 인수인계 목록 조회 쿼리
  const {
    data: handoverData,
    isLoading: isLoadingHandover,
    refetch: refetchHandover,
  } = useQuery(
    ["handoverList", "normal", handoverFilters],
    () =>
      getHandoverList({
        type: "normal",
        page: handoverFilters.page,
        limit: handoverFilters.limit,
      }),
    {
      keepPreviousData: true,
    }
  );

  // 인수인계 상세 조회 쿼리
  const { data: handoverDetail, isLoading: isLoadingDetail } = useQuery(
    ["handoverDetail", selectedHandover?.handover_id],
    () => getHandoverDetail(selectedHandover?.handover_id),
    {
      enabled: !!selectedHandover?.handover_id && detailVisible,
    }
  );

  // 인수인계 생성 뮤테이션
  const createHandoverMutation = useMutation(createHandover, {
    onSuccess: (data) => {
      if (data.success) {
        notification.success({
          message: "등록 성공",
          description: data.data.is_notice
            ? "새로운 공지사항이 등록되었습니다."
            : "새로운 인수인계가 등록되었습니다.",
        });
        setFormVisible(false);
        queryClient.invalidateQueries(["handoverList"]);
      } else {
        notification.error({
          message: "등록 실패",
          description: data.message || "등록 중 오류가 발생했습니다.",
        });
      }
    },
    onError: (error) => {
      notification.error({
        message: "등록 실패",
        description: error.message || "등록 중 오류가 발생했습니다.",
      });
    },
  });

  // 인수인계 수정 뮤테이션
  const updateHandoverMutation = useMutation(
    (data) => updateHandover(data.id, data.values),
    {
      onSuccess: (data) => {
        if (data.success) {
          notification.success({
            message: "수정 성공",
            description: data.data.is_notice
              ? "공지사항이 수정되었습니다."
              : "인수인계가 수정되었습니다.",
          });
          setFormVisible(false);
          setDetailVisible(false);
          queryClient.invalidateQueries(["handoverList"]);
          queryClient.invalidateQueries([
            "handoverDetail",
            selectedHandover?.handover_id,
          ]);
        } else {
          notification.error({
            message: "수정 실패",
            description: data.message || "수정 중 오류가 발생했습니다.",
          });
        }
      },
      onError: (error) => {
        notification.error({
          message: "수정 실패",
          description: error.message || "수정 중 오류가 발생했습니다.",
        });
      },
    }
  );

  // 인수인계 삭제 뮤테이션
  const deleteHandoverMutation = useMutation(deleteHandover, {
    onSuccess: (data) => {
      if (data.success) {
        notification.success({
          message: "삭제 성공",
          description: selectedHandover?.is_notice
            ? "공지사항이 삭제되었습니다."
            : "인수인계가 삭제되었습니다.",
        });
        setDetailVisible(false);
        queryClient.invalidateQueries(["handoverList"]);
      } else {
        notification.error({
          message: "삭제 실패",
          description: data.message || "삭제 중 오류가 발생했습니다.",
        });
      }
    },
    onError: (error) => {
      notification.error({
        message: "삭제 실패",
        description: error.message || "삭제 중 오류가 발생했습니다.",
      });
    },
  });

  // 공지사항 페이지 변경 핸들러
  const handleNoticePageChange = (page, pageSize) => {
    setNoticeFilters({
      ...noticeFilters,
      page,
      limit: pageSize,
    });
  };

  // 인수인계 페이지 변경 핸들러
  const handleHandoverPageChange = (page, pageSize) => {
    setHandoverFilters({
      ...handoverFilters,
      page,
      limit: pageSize,
    });
  };

  // 데이터 새로고침 핸들러
  const handleRefresh = () => {
    refetchNotice();
    refetchHandover();
  };

  // 행 클릭 핸들러
  const handleRowClick = (record) => {
    setSelectedHandover(record);
    setDetailVisible(true);
  };

  // 신규 등록 핸들러
  const handleNewHandover = () => {
    setIsEdit(false);
    setFormVisible(true);
  };

  // 수정 핸들러
  const handleEdit = (record) => {
    setSelectedHandover(record);
    setIsEdit(true);
    setFormVisible(true);
  };

  // 삭제 핸들러
  const handleDelete = (id) => {
    deleteHandoverMutation.mutate(id);
  };

  // 폼 제출 핸들러
  const handleFormSubmit = (values) => {
    if (isEdit) {
      // 수정
      updateHandoverMutation.mutate({
        id: selectedHandover.handover_id,
        values: {
          ...values,
          update_at: new Date().toISOString(),
        },
      });
    } else {
      // 생성
      const userData = JSON.parse(localStorage.getItem("teckwah_tms_user"));

      createHandoverMutation.mutate({
        ...values,
        update_by: userData?.user_id || "unknown",
        create_at: new Date().toISOString(),
        update_at: new Date().toISOString(),
      });
    }
  };

  // 페이지네이션 설정 - 공지사항
  const noticePaginationConfig = {
    current: noticeFilters.page,
    pageSize: noticeFilters.limit,
    total: noticeData?.data?.total || 0,
    onChange: handleNoticePageChange,
    showSizeChanger: true,
    showTotal: (total) => `총 ${total}건`,
  };

  // 페이지네이션 설정 - 인수인계
  const handoverPaginationConfig = {
    current: handoverFilters.page,
    pageSize: handoverFilters.limit,
    total: handoverData?.data?.total || 0,
    onChange: handleHandoverPageChange,
    showSizeChanger: true,
    showTotal: (total) => `총 ${total}건`,
  };

  // 필터링된 데이터 - 공지사항
  const noticeItems = noticeData?.data?.items || [];

  // 필터링된 데이터 - 인수인계
  const handoverItems = handoverData?.data?.items || [];

  return (
    <div className="handover-page">
      <Card
        title="Work-Notice"
        extra={
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleNewHandover}
            >
              신규 등록
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              loading={isLoadingNotice || isLoadingHandover}
            >
              새로고침
            </Button>
          </Space>
        }
      >
        {/* 공지사항 섹션 */}
        <div style={{ marginBottom: 24 }}>
          <div
            style={{ display: "flex", alignItems: "center", marginBottom: 16 }}
          >
            <NotificationOutlined
              style={{ marginRight: 8, color: "#1890ff" }}
            />
            <Title level={4} style={{ margin: 0 }}>
              공지사항
            </Title>
            <div style={{ marginLeft: 8, color: "#1890ff" }}>
              ({noticeData?.data?.total || 0})
            </div>
          </div>

          <HandoverTable
            data={noticeItems}
            loading={isLoadingNotice}
            onRowClick={handleRowClick}
            pagination={noticePaginationConfig}
            isNotice={true}
          />
        </div>

        <Divider />

        {/* 인수인계 섹션 */}
        <div>
          <div
            style={{ display: "flex", alignItems: "center", marginBottom: 16 }}
          >
            <SwapOutlined style={{ marginRight: 8, color: "#1890ff" }} />
            <Title level={4} style={{ margin: 0 }}>
              인수인계
            </Title>
            <div style={{ marginLeft: 8, color: "#1890ff" }}>
              ({handoverData?.data?.total || 0})
            </div>
          </div>

          <HandoverTable
            data={handoverItems}
            loading={isLoadingHandover}
            onRowClick={handleRowClick}
            pagination={handoverPaginationConfig}
            isNotice={false}
          />
        </div>
      </Card>

      {/* 상세 모달 */}
      <HandoverDetailModal
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        data={handoverDetail?.data}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={isLoadingDetail}
      />

      {/* 등록/수정 모달 */}
      <HandoverFormModal
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        onSubmit={handleFormSubmit}
        data={handoverDetail?.data}
        loading={
          createHandoverMutation.isLoading || updateHandoverMutation.isLoading
        }
        isEdit={isEdit}
      />
    </div>
  );
};

export default HandoverPage;
