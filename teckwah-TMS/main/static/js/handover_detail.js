document.addEventListener("DOMContentLoaded", function () {
  const deleteBtn = document.getElementById("deleteHandoverBtn");
  const deleteDialog = document.getElementById("deleteConfirmDialog");
  const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
  const deleteForm = document.getElementById("deleteHandoverForm");
  const mainEditBtn = document.querySelector(
    '.header-actions a[href*="/edit"]'
  ); // 헤더의 수정 버튼

  // 페이지에서 인수인계 ID 추출 (URL 또는 데이터 속성 활용)
  let handoverId = "";
  try {
    // 1. 데이터 속성 시도 (더 안정적)
    const detailContainer = document.querySelector("[data-handover-id]");
    if (detailContainer) {
      handoverId = detailContainer.getAttribute("data-handover-id");
    }
    // 2. URL 파싱 시도 (대체)
    if (!handoverId) {
      const currentUrl = window.location.pathname;
      const parts = currentUrl.split("/");
      const potentialId = parts[parts.length - 1];
      const potentialIdBeforeEdit = parts[parts.length - 2];
      if (!isNaN(parseInt(potentialId))) {
        handoverId = potentialId;
      } else if (
        parts[parts.length - 1] === "edit" &&
        !isNaN(parseInt(potentialIdBeforeEdit))
      ) {
        handoverId = potentialIdBeforeEdit;
      }
    }
    console.log("Handover ID 추출됨:", handoverId);
  } catch (error) {
    console.error("Handover ID 추출 중 오류:", error);
  }

  if (!handoverId) {
    console.error("인수인계 ID(handover_id)를 찾을 수 없습니다.");
    Utils.alerts.showError("인수인계 정보를 식별할 수 없습니다.");
    return; // ID 없으면 이후 로직 실행 불가
  }

  // --- 메인 수정 버튼 클릭 시 락 획득 로직 ---
  if (mainEditBtn) {
    mainEditBtn.addEventListener("click", async function (event) {
      event.preventDefault(); // 기본 링크 이동 방지
      const editUrl = this.href; // 이동할 URL

      console.log(`수정 버튼 클릭: 락 획득 시도 (ID: ${handoverId})`);
      Utils.alerts.showLoading("수정 권한 확인 중...");

      try {
        const response = await fetch(
          `/api/handover/lock/${handoverId}/acquire-for-edit`, // handoverId 사용
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        const result = await response.json();
        Utils.alerts.hideLoading();

        if (response.ok && result.success) {
          console.log("락 획득 성공, 수정 페이지로 이동:", editUrl);
          window.location.href = editUrl;
        } else {
          // 통일된 오류 메시지 표시
          const errorMessage =
            result?.message || "현재 다른 사용자가 편집 중입니다.";
          const lockedByUser = result?.locked_by;

          // 상세 오류 메시지 구성 (락 보유자 정보 포함)
          const displayMessage = lockedByUser
            ? `${lockedByUser}님이 현재 편집 중입니다.`
            : errorMessage;

          console.warn(`락 획득 실패: ${displayMessage}`);
          Utils.alerts.showError(displayMessage);
        }
      } catch (error) {
        Utils.alerts.hideLoading();
        console.error("락 획득 API 호출 오류:", error);
        Utils.alerts.showError(
          "수정 권한 확인 중 오류가 발생했습니다. 네트워크 연결을 확인해주세요."
        );
      }
    });
  }

  // --- 삭제 버튼 관련 로직 ---
  // 삭제 버튼 클릭 시 대화상자 표시
  deleteBtn?.addEventListener("click", async (e) => {
    e.preventDefault(); // 기본 동작 방지

    console.log(`삭제 버튼 클릭: 확인 대화상자 표시 (ID: ${handoverId})`);

    // 삭제 확인 대화상자 표시
    deleteDialog?.classList.add("active");
  });

  // 취소 버튼 클릭 시 대화상자 닫기
  cancelDeleteBtn?.addEventListener("click", () => {
    deleteDialog?.classList.remove("active");
  });

  // 다이얼로그 외부 클릭 시 닫기
  deleteDialog?.addEventListener("click", (e) => {
    if (e.target === deleteDialog) {
      deleteDialog.classList.remove("active");
    }
  });

  // 삭제 폼 제출 처리 (락 확인은 서버에서 수행)
  deleteForm?.addEventListener("submit", (e) => {
    console.log("삭제 폼 제출");
    // 기본 제출 동작 진행 -> 서버에서 처리
  });

  // 페이지 파라미터로 전달된 성공/오류 메시지 처리
  Utils.ui.showPageMessages();
});
