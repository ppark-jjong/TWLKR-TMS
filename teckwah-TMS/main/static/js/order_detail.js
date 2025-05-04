/**
 * 주문 상세 페이지 스크립트
 * 주문 상세 조회, 삭제 등 기능 처리
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

  // 페이지 파라미터로 전달된 성공/오류 메시지 처리
  Utils.ui.showPageMessages();
});
