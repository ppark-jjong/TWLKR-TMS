document.addEventListener("DOMContentLoaded", function () {
  // --- DOM 요소 가져오기 ---
  const loadingOverlay = document.getElementById("loadingOverlay");
  const typeFilter = document.getElementById("typeFilter");
  const refreshBtn = document.getElementById("refreshBtn");
  const handoverTableHead = document.getElementById("handoverTableHead");
  const handoverTableBody = document.getElementById("handoverTableBody");
  const paginationControls = document.getElementById("paginationControls");
  const pageInfo = document.getElementById("pageInfo");
  const prevPageBtn = paginationControls?.querySelector('[data-page="prev"]'); // Optional chaining
  const nextPageBtn = paginationControls?.querySelector('[data-page="next"]'); // Optional chaining
  const errorMessageContainer = document.getElementById(
    "errorMessageContainer"
  );
  const errorMessageText = document.getElementById("errorMessageText");

  // --- 상태 변수 ---
  let allItems = [];
  let filteredItems = [];
  let currentPage = 1;
  let rowsPerPage = 30;
  let totalItems = 0;
  let totalPages = 1;
  let initialLoadComplete = false;
  let currentFilter = "all"; // 필터 변수 추가

  // --- 초기화 함수 ---
  function initHandover() {
    showLoading();

    // URL 파라미터에서 알림 확인 - 제거 (base.js에서 일괄 처리됨)
    // checkUrlParamsForNotifications(); // 제거

    // 비동기적으로 전체 데이터 로드
    fetchAllItems()
      .then(() => {
        initialLoadComplete = true;
        console.log("Initial full data load complete.");
        applyFiltersAndRender();
        hideLoading();
        // 데이터 로드 후 알림 확인 - 제거 (base.js에서 일괄 처리됨)
        // checkUrlParamsForNotifications(); // 제거
      })
      .catch((error) => {
        console.error("Error fetching initial full data:", error);
        showError("데이터를 불러오는 중 오류가 발생했습니다.");
        hideLoading();
      });

    setupEventListeners();
  }

  // --- 데이터 처리 함수 ---
  async function fetchAllItems() {
    showLoading();
    clearError();
    console.log("Fetching all handovers and notices using Utils.api...");
    try {
      // Utils.api.get 사용
      const result = await Utils.api.get("/api/handover/list");

      if (result && result.success && result.data) {
        allItems = result.data;
        allItems.sort((a, b) => new Date(b.update_at) - new Date(a.update_at));
        totalItems = allItems.length;
        currentPage = 1;
        console.log(`Successfully fetched ${allItems.length} total items.`);
        // 데이터를 성공적으로 가져왔으므로 필터링 및 렌더링 수행
        // applyFiltersAndRender(); // 이 위치보다는 then 블록에서 호출하는 것이 명확
      } else {
        // Utils.api.get에서 실패 응답(success:false)을 반환했거나 데이터가 없는 경우
        throw new Error(
          result?.message || "Failed to fetch handover/notice data"
        );
      }
    } catch (error) {
      // Utils.api.get 내부에서 throw된 에러 또는 위에서 throw한 에러 처리
      console.error("Error in fetchAllItems:", error);
      showError(`데이터 조회 실패: ${error.message || "알 수 없는 오류"}`);
      allItems = [];
      applyFiltersAndRender(); // 오류 시 빈 테이블 표시
      throw error;
    } finally {
      // finally 블록은 유지하되, hideLoading은 then/catch에서 처리되므로 제거 가능
      // hideLoading(); // 필요 시 유지
    }
  }

  // 현재 필터 및 페이지 상태에 따라 테이블 렌더링
  function applyFiltersAndRender() {
    const selectedType = typeFilter ? typeFilter.value : "all"; // typeFilter null 체크
    currentFilter = selectedType;
    console.log(
      `Applying filter '${selectedType}' and rendering page ${currentPage}`
    );

    filteredItems = allItems.filter((item) => {
      if (currentFilter === "all") return true;
      // is_notice 필드가 boolean 값이라고 가정
      return currentFilter === "notice"
        ? item.is_notice === true
        : item.is_notice === false;
    });
    totalItems = filteredItems.length;
    console.log(`Filtered items count: ${totalItems}`);

    totalPages = Math.ceil(totalItems / rowsPerPage) || 1;
    currentPage = Math.max(1, Math.min(currentPage, totalPages));

    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const pageItems = filteredItems.slice(startIndex, endIndex);
    console.log(`Rendering ${pageItems.length} items for page ${currentPage}`);

    renderHandoverTableRows(pageItems);
    updatePaginationUI();
  }

  // 테이블 행 HTML 생성 및 업데이트
  function renderHandoverTableRows(items) {
    if (!handoverTableBody) return;

    if (items.length === 0) {
      handoverTableBody.innerHTML =
        renderEmptyRow("조건에 맞는 항목이 없습니다.");
      return;
    }

    let tableHTML = "";
    items.forEach((item) => {
      const typeText = item.is_notice ? "공지" : "인수인계";
      const typeClass = item.is_notice ? "notice" : "handover";
      // 날짜는 ISO 형식 그대로 사용
      const formattedDate = item.update_at || "-";

      tableHTML += `<tr class="${typeClass}-row clickable-row" data-id="${
        item.handover_id
      }">
                          <td>${item.title || "-"}</td>
                          <td><span class="tag ${typeClass}-tag">${typeText}</span></td>
                          <td>${item.update_by || "-"}</td>
                          <td>${formattedDate}</td>
                         </tr>`;
    });

    handoverTableBody.innerHTML = tableHTML;
  }

  // 빈 결과 행 HTML 생성
  function renderEmptyRow(message) {
    return `
                <tr class="empty-data-row">
                  <td colspan="4" class="empty-table">
                    <div class="empty-placeholder">
                      <i class="fa-solid fa-clipboard-list"></i>
                      <p>${message}</p>
                    </div>
                  </td>
                </tr>`;
  }

  // 페이지네이션 UI 업데이트
  function updatePaginationUI() {
    if (!pageInfo || !prevPageBtn || !nextPageBtn) return;
    pageInfo.textContent = `${currentPage} / ${totalPages}`;
    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = currentPage >= totalPages;
  }

  // 탭 카운트 업데이트 (이 함수는 현재 호출되지 않음 - 필요시 구현)
  /*
    function updateCounts() {
        // ... DOM 요소 가져오기 (countAllBadge 등)
        countAllBadge.textContent = allItems.length;
        countNoticeBadge.textContent = allItems.filter((item) => item.is_notice).length;
        countHandoverBadge.textContent = allItems.filter((item) => !item.is_notice).length;
    }
    */

  // --- 유틸리티 함수 ---
  function showLoading() {
    // Utils.ui 사용
    Utils.ui?.showLoading();
  }
  function hideLoading() {
    // Utils.ui 사용
    Utils.ui?.hideLoading();
  }
  function showError(message) {
    // Utils.alerts 사용
    Utils.alerts?.showError(message);
    // 기존 로직 대체
    /*
        if (!errorMessageContainer || !errorMessageText) return;
        errorMessageText.textContent = message;
        errorMessageContainer.style.display = 'block';
        */
  }
  function clearError() {
    // 오류는 Utils.alerts가 관리하므로 이 함수는 불필요하거나, 특정 UI를 직접 지우도록 수정
    if (errorMessageContainer) errorMessageContainer.style.display = "none";
  }

  // --- 이벤트 리스너 설정 ---
  function setupEventListeners() {
    typeFilter?.addEventListener("change", () => {
      currentPage = 1; // 필터 변경 시 첫 페이지로
      applyFiltersAndRender();
    });

    prevPageBtn?.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        applyFiltersAndRender();
      }
    });
    nextPageBtn?.addEventListener("click", () => {
      if (currentPage < totalPages) {
        currentPage++;
        applyFiltersAndRender();
      }
    });

    refreshBtn?.addEventListener("click", () => {
      fetchAllItems()
        .then(() => {
          applyFiltersAndRender(); // 데이터 로드 후 렌더링
          hideLoading();
          Utils.alerts?.showSuccess("데이터를 새로고침했습니다.");
        })
        .catch((err) => {
          // fetchAllItems 내부에서 오류 처리됨
          hideLoading();
        });
    });

    handoverTableBody?.addEventListener("click", (e) => {
      const row = e.target.closest("tr.clickable-row");
      if (row) {
        const handoverId = row.dataset.id;
        if (handoverId) {
          window.location.href = `/handover/${handoverId}`;
        }
      }
    });
  }

  // URL 파라미터에서 알림 확인
  function checkUrlParamsForNotifications() {
    // base.html의 공통 스크립트로 이동하는 것이 더 좋음
    // 여기서는 일단 유지하되, Utils.alerts가 로드된 후 실행되도록 initHandover 끝으로 이동
    const urlParams = new URLSearchParams(window.location.search);
    const successMessage = urlParams.get("success");
    const errorMessage = urlParams.get("error");
    const warningMessage = urlParams.get("warning");

    if (successMessage) {
      Utils.alerts?.showSuccess(decodeURIComponent(successMessage));
    }
    if (errorMessage) {
      Utils.alerts?.showError(decodeURIComponent(errorMessage));
    }
    if (warningMessage) {
      Utils.alerts?.showWarning(decodeURIComponent(warningMessage));
    }

    // URL 정리 (선택 사항 - 주석 처리됨)
    if (successMessage || errorMessage || warningMessage) {
      // history.replaceState({}, document.title, window.location.pathname);
    }
  }

  // --- 초기화 실행 ---
  initHandover();
});
