/**
 * 주문 상세 페이지 스크립트
 * 주문 상세 조회, 삭제 등 기능 처리
 * 인라인 편집 기능 추가 (상태 변경 전용)
 */
document.addEventListener("DOMContentLoaded", function () {
  // 디버깅용 로그 추가
  console.log("order_detail.js 스크립트 초기화");

  // 페이지 데이터 로드 (HTML의 script 태그에서 가져옴)
  let pageData = {};
  let order = null;
  let dashboardId = ""; // 변수명 변경: orderId -> dashboardId
  let currentUserRole = "";
  try {
    const jsonDataElement = document.getElementById("page-data-script");
    if (jsonDataElement) {
      pageData = JSON.parse(jsonDataElement.textContent || "{}");
      order = pageData.order;
      dashboardId = order?.dashboard_id; // 초기화 시 dashboard_id 사용
      currentUserRole = pageData.current_user_role;
      console.log("상세 페이지 데이터 로드 성공 (ID: " + dashboardId + ")");
    } else {
      console.error("페이지 데이터 script 태그를 찾을 수 없음");
      return;
    }
  } catch (error) {
    console.error("데이터 파싱 실패:", error);
    Utils.alerts.showError("페이지 데이터를 로드하는데 실패했습니다.");
    return;
  }

  if (!dashboardId) {
    // 변수명 변경
    console.error("주문 ID(dashboardId)를 찾을 수 없음");
    Utils.alerts.showError("주문 정보를 식별할 수 없습니다.");
    return;
  }

  // DOM 요소 가져오기
  const copyOrderNoBtn = document.getElementById("copyOrderNo");
  const editStatusBtn = document.getElementById("editStatusBtn");
  const statusDisplayElement = document.getElementById("statusDisplay"); // 상태 표시 영역

  // 주문번호 복사 버튼 기능
  if (copyOrderNoBtn) {
    copyOrderNoBtn.addEventListener("click", function () {
      const orderNoElement = document.getElementById("detailOrderNo");
      if (orderNoElement) {
        const orderNo = orderNoElement.textContent;
        if (Utils && Utils.dom && Utils.dom.copyToClipboard) {
          Utils.dom.copyToClipboard(orderNo);
          Utils.alerts.showSuccess("주문번호가 복사되었습니다.");
        } else {
          navigator.clipboard
            .writeText(orderNo)
            .then(() => Utils.alerts.showSuccess("주문번호가 복사되었습니다."))
            .catch((err) => {
              console.error("클립보드 복사 실패:", err);
              Utils.alerts.showError("클립보드 복사에 실패했습니다.");
            });
        }
      }
    });
  }

  // --- 상태 수정 관련 로직 (CSR) ---
  function setupEditButtons() {
    if (!editStatusBtn) {
      console.log("상태 수정 버튼 없음");
      return;
    }

    editStatusBtn.addEventListener("click", async function () {
      if (document.getElementById("statusEditForm")) {
        console.log("이미 상태 편집 UI가 열려 있습니다.");
        return;
      }

      console.log(`상태 수정 버튼 클릭: 드롭다운 표시 준비`);
      Utils.alerts.showLoading("상태 변경 준비 중...");

      try {
        const response = await fetch(
          `/api/orders/${dashboardId}/update-field`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              field: "check_edit_status",
              value: true,
            }),
          }
        );

        const result = await response.json();
        Utils.alerts.hideLoading();

        if (response.ok && result && result.success === true) {
          console.log("상태 편집 가능, 드롭다운 표시");
          createEditForm("status", "상태", order?.status || "WAITING");
        } else {
          // 편집 실패 (락 획득 실패 등)
          const errorMessage =
            result?.message || "현재 다른 사용자가 수정 중입니다.";
          console.warn(`상태 편집 불가: ${errorMessage}`);
          Utils.alerts.showError(errorMessage);
        }
      } catch (error) {
        Utils.alerts.hideLoading();
        console.error("상태 변경 준비 중 오류:", error);
        Utils.alerts.showError(
          "상태 변경 준비 중 오류가 발생했습니다. 네트워크 연결을 확인해주세요."
        );
      }
    });
  }

  // 편집 폼 생성 함수 (CSR 용)
  function createEditForm(fieldName, fieldLabel, currentValue) {
    if (!statusDisplayElement) {
      console.error("상태 표시 영역(statusDisplay)을 찾을 수 없습니다.");
      return;
    }

    const formContainer = document.createElement("div");
    formContainer.className = "edit-form inline-edit-form";
    formContainer.id = `${fieldName}EditForm`;

    const selectElement = document.createElement("select");
    selectElement.className = "form-control";
    selectElement.id = `${fieldName}EditSelect`;

    const statusOptions = [
      { value: "WAITING", label: "대기중" },
      { value: "IN_PROGRESS", label: "진행중" },
      { value: "COMPLETE", label: "완료" },
      { value: "ISSUE", label: "이슈" },
      { value: "CANCEL", label: "취소" },
    ];

    statusOptions.forEach((option) => {
      const optionElement = document.createElement("option");
      optionElement.value = option.value;
      optionElement.textContent = option.label;
      if (option.value === currentValue) {
        optionElement.selected = true;
      }
      selectElement.appendChild(optionElement);
    });

    const btnContainer = document.createElement("div");
    btnContainer.className = "edit-form-actions";

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "btn btn-sm btn-primary";
    saveBtn.textContent = "저장";
    saveBtn.addEventListener("click", () => {
      const newValue = selectElement.value;
      saveFieldEdit(fieldName, newValue);
    });

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "btn btn-sm btn-secondary";
    cancelBtn.textContent = "취소";
    cancelBtn.addEventListener("click", () => {
      closeEditForm(fieldName, true);
    });

    btnContainer.appendChild(saveBtn);
    btnContainer.appendChild(cancelBtn);

    formContainer.appendChild(selectElement);
    formContainer.appendChild(btnContainer);

    // 현재 값을 저장 및 숨김 처리
    const currentValueDisplay =
      statusDisplayElement.querySelector(".value-display");
    if (currentValueDisplay) {
      currentValueDisplay.style.display = "none";
    }

    statusDisplayElement.appendChild(formContainer);
  }

  // 편집 폼 닫기 (저장 없이 취소)
  async function closeEditForm(fieldName, releaseLockFlag = false) {
    const formElement = document.getElementById(`${fieldName}EditForm`);
    if (!formElement) return;

    // 현재 값 표시 복원
    const valueDisplay = statusDisplayElement?.querySelector(".value-display");
    if (valueDisplay) {
      valueDisplay.style.display = "";
    }

    // 폼 제거
    formElement.remove();

    // 락 해제 요청 (선택적)
    if (releaseLockFlag) {
      try {
        await fetch(`/api/orders/${dashboardId}/update-field`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            field: "release_edit_lock",
            value: true,
          }),
        });
        console.log("상태 편집 락 해제 완료");
      } catch (error) {
        console.error("락 해제 중 오류:", error);
      }
    }
  }

  // 필드 값 저장
  async function saveFieldEdit(fieldName, newValue) {
    if (!dashboardId || !fieldName) {
      console.error("필수 정보 누락: dashboard_id 또는 field_name");
      return;
    }

    console.log(`${fieldName} 필드 값 저장 시도: ${newValue}`);
    Utils.alerts.showLoading("상태 변경 중...");

    try {
      const response = await fetch(`/api/orders/${dashboardId}/update-field`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          field: fieldName,
          value: newValue,
        }),
      });

      const result = await response.json();
      Utils.alerts.hideLoading();

      if (response.ok && result.success) {
        console.log(`${fieldName} 필드 업데이트 성공:`, result);

        // UI 업데이트 (상태 표시)
        updateStatusDisplay(newValue);

        // 편집 폼 닫기 (락 해제 불필요 - 서버에서 처리함)
        closeEditForm(fieldName, false);

        // 성공 메시지
        Utils.alerts.showSuccess(`상태가 변경되었습니다.`);

        // 전체 주문 객체 업데이트 (필요 시, 지금은 상태만 갱신)
        if (order) {
          order.status = newValue;
        }
      } else {
        console.error(`${fieldName} 필드 업데이트 실패:`, result);
        Utils.alerts.showError(
          result.message || "상태 변경 중 오류가 발생했습니다."
        );
        closeEditForm(fieldName, true); // 실패해도 폼은 닫기 (락 해제 요청)
      }
    } catch (error) {
      Utils.alerts.hideLoading();
      console.error("필드 저장 중 API 오류:", error);
      Utils.alerts.showError("네트워크 오류로 상태를 변경할 수 없습니다.");
      closeEditForm(fieldName, true); // 오류 발생 시에도 폼은 닫기 (락 해제 요청)
    }
  }

  // 상태 표시 업데이트 (UI)
  function updateStatusDisplay(newStatus) {
    if (!statusDisplayElement) return;

    const valueDisplay = statusDisplayElement.querySelector(".value-display");
    if (!valueDisplay) return;

    // 상태값에 따른 라벨과 클래스
    const statusInfo = {
      WAITING: { label: "대기중", cls: "badge-secondary" },
      IN_PROGRESS: { label: "진행중", cls: "badge-primary" },
      COMPLETE: { label: "완료", cls: "badge-success" },
      ISSUE: { label: "이슈", cls: "badge-danger" },
      CANCEL: { label: "취소", cls: "badge-dark" },
    };

    const statusData = statusInfo[newStatus] || {
      label: newStatus,
      cls: "badge-secondary",
    };

    // 기존 뱃지 클래스 제거 및 새 클래스 추가
    const badgeElement = valueDisplay.querySelector(".badge");
    if (badgeElement) {
      // 모든 badge-* 클래스 제거
      for (const cls of Object.values(statusInfo)) {
        badgeElement.classList.remove(cls.cls);
      }
      // 새 클래스 추가
      badgeElement.classList.add(statusData.cls);
      badgeElement.textContent = statusData.label;
    }
  }

  // 설정 및 초기화 함수 호출
  setupEditButtons();

  // 페이지 파라미터로 전달된 성공/오류 메시지 처리
  Utils.ui.showPageMessages();
});
