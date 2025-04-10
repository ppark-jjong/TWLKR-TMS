/**
 * 인수인계 페이지 모듈 (개선된 버전)
 */
const HandoverPage = {
  // 페이지 상태 관리
  state: {
    // 공지사항 상태
    notice: {
      currentPage: 1,
      pageSize: 10,
      totalPages: 1,
      currentData: [],
      filteredData: [],
    },
    // 인수인계 상태
    handover: {
      currentPage: 1,
      pageSize: 10,
      totalPages: 1,
      currentData: [],
      filteredData: [],
    },
    // 현재 활성화된 탭
    activeTab: "notice-section",
    // 현재 편집 중인 인수인계 ID
    editingHandoverId: null,
    // 모달이 수정 모드인지 여부
    isEditMode: false,
  },

  // 중복 제출 방지 플래그
  isSubmitting: false,

  /**
   * 페이지 초기화
   */
  init: function () {
    console.log("인수인계 페이지 초기화...");

    // 이벤트 리스너 등록
    this.registerEventListeners();

    // 데이터 로드되었으면 테이블 업데이트
    if (TMS.store.isDataLoaded) {
      this.updateLists();
    } else {
      // 데이터 로드 대기
      document.addEventListener("tms:dataLoaded", () => {
        this.updateLists();
      });
    }

    // 데이터 변경 이벤트 리스닝
    document.addEventListener("tms:handoverDataChanged", () => {
      this.updateLists();
    });
  },

  // 이벤트 리스너 등록 여부 체크 플래그
  hasRegisteredEvents: false,

  /**
   * 이벤트 리스너 등록 (중복 등록 방지)
   */
  registerEventListeners: function () {
    // 이미 이벤트가 등록되어 있으면 중복 등록하지 않음
    if (this.hasRegisteredEvents) {
      console.log("이벤트 리스너가 이미 등록되어 있습니다.");
      return;
    }

    console.log("이벤트 리스너 등록 시작");

    // 탭 전환
    document.querySelectorAll(".tab").forEach((tab) => {
      tab.addEventListener("click", this.handleTabChange.bind(this));
    });

    // 액션 버튼
    document
      .getElementById("refreshHandoverBtn")
      .addEventListener("click", this.refreshData.bind(this));
    document
      .getElementById("newHandoverBtn")
      .addEventListener("click", this.openNewHandoverModal.bind(this));

    // 페이지네이션 - 공지사항
    document
      .querySelectorAll('.page-btn[data-section="notice"]')
      .forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const direction = e.currentTarget.getAttribute("data-page");
          this.handlePageChange(direction, "notice");
        });
      });

    // 페이지네이션 - 인수인계
    document
      .querySelectorAll('.page-btn[data-section="handover"]')
      .forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const direction = e.currentTarget.getAttribute("data-page");
          this.handlePageChange(direction, "handover");
        });
      });

    // 모달 버튼에 이벤트 리스너 한 번만 추가
    const submitBtn = document.getElementById("submitHandoverBtn");
    submitBtn.removeEventListener("click", this.handleSubmitHandover); // 기존 이벤트 제거
    submitBtn.addEventListener("click", this.handleSubmitHandover.bind(this));

    const editBtn = document.getElementById("editHandoverBtn");
    editBtn.removeEventListener("click", this.openEditModal); // 기존 이벤트 제거
    editBtn.addEventListener("click", this.openEditModal.bind(this));

    const deleteBtn = document.getElementById("deleteHandoverBtn");
    deleteBtn.removeEventListener("click", this.confirmDeleteHandover); // 기존 이벤트 제거
    deleteBtn.addEventListener("click", this.confirmDeleteHandover.bind(this));

    // 모달 닫기 버튼들에 이벤트 리스너 추가
    document.querySelectorAll(".close-modal").forEach((button) => {
      const modalId = button.getAttribute("data-modal");
      button.addEventListener("click", () => {
        modalUtils.closeModal(modalId);
      });
    });

    // 이벤트 등록 완료 플래그 설정
    this.hasRegisteredEvents = true;
    console.log("이벤트 리스너 등록 완료");
  },

  /**
   * 탭 변경 처리
   */
  handleTabChange: function (e) {
    const tabName = e.currentTarget.getAttribute("data-tab");

    // 모든 탭에서 active 클래스 제거
    document.querySelectorAll(".tab").forEach((tab) => {
      tab.classList.remove("active");
    });

    // 클릭한 탭에 active 클래스 추가
    e.currentTarget.classList.add("active");

    // 모든 컨텐츠 섹션 숨기기
    document.querySelectorAll(".content-section").forEach((section) => {
      section.classList.remove("active");
    });

    // 해당 탭의 컨텐츠 섹션 표시
    document.getElementById(tabName).classList.add("active");

    // 현재 활성화된 탭 상태 저장
    this.state.activeTab = tabName;
  },

  /**
   * 모든 목록 업데이트
   */
  updateLists: function () {
    // 데이터 필터링
    this.filterData();

    // 공지사항 목록 업데이트
    this.updateCurrentPageData("notice");
    this.renderTable("notice");
    this.updatePagination("notice");

    // 인수인계 목록 업데이트
    this.updateCurrentPageData("handover");
    this.renderTable("handover");
    this.updatePagination("handover");
  },

  /**
   * 데이터 필터링
   */
  filterData: function () {
    // 전체 데이터 가져오기
    const allData = TMS.getHandoverData();

    // 최신순 정렬
    allData.sort((a, b) => {
      return new Date(b.created_at) - new Date(a.created_at);
    });

    // 공지사항 필터링
    this.state.notice.filteredData = allData.filter(
      (item) => item.is_notice === true
    );

    // 인수인계 필터링
    this.state.handover.filteredData = allData.filter(
      (item) => item.is_notice === false
    );
  },

  /**
   * 현재 페이지 데이터 업데이트
   */
  updateCurrentPageData: function (section) {
    const state = this.state[section];
    const start = (state.currentPage - 1) * state.pageSize;
    const end = start + state.pageSize;

    state.currentData = state.filteredData.slice(start, end);
    state.totalPages =
      Math.ceil(state.filteredData.length / state.pageSize) || 1;

    // 페이지가 범위를 벗어나면 첫 페이지로
    if (state.currentPage > state.totalPages) {
      state.currentPage = 1;
      this.updateCurrentPageData(section);
    }
  },

  /**
   * 테이블 렌더링 (개선된 버전)
   */
  renderTable: function (section) {
    const tableId =
      section === "notice" ? "noticeTableBody" : "handoverTableBody";
    const tableBody = document.getElementById(tableId);
    const state = this.state[section];

    // 테이블 내용 초기화
    tableBody.innerHTML = "";

    // 데이터가 없는 경우
    if (state.currentData.length === 0) {
      const emptyRow = document.createElement("tr");
      emptyRow.className = "empty-data-row"; // 빈 데이터 행 스타일 추가
      emptyRow.innerHTML = `<td colspan="4" class="empty-table">조회된 ${
        section === "notice" ? "공지사항" : "인수인계"
      }이 없습니다.</td>`;
      tableBody.appendChild(emptyRow);
      return;
    }

    // 행 추가
    state.currentData.forEach((item) => {
      const row = document.createElement("tr");
      row.setAttribute("data-id", item.handover_id);

      // 작성자 셀
      const authorCell = document.createElement("td");
      authorCell.style.textAlign = "center";
      authorCell.style.borderRight = "1px solid #e8e8e8";
      authorCell.textContent = item.created_by;
      row.appendChild(authorCell);

      // 작성일시 셀
      const dateCell = document.createElement("td");
      dateCell.style.textAlign = "center";
      dateCell.style.borderRight = "1px solid #e8e8e8";
      dateCell.textContent = this.formatDateString(item.created_at);
      row.appendChild(dateCell);

      // 제목 셀
      const titleCell = document.createElement("td");
      titleCell.className = "title-cell";
      titleCell.style.textAlign = "center";
      titleCell.style.borderRight = "1px solid #e8e8e8";

      // 공지사항인 경우 아이콘 추가
      if (item.is_notice) {
        const noticeIcon = document.createElement("span");
        noticeIcon.className = "notice-icon";
        noticeIcon.innerHTML =
          '<i class="fa-solid fa-bullhorn" style="color: #1890ff; margin-right: 5px;"></i>';
        titleCell.appendChild(noticeIcon);
      }

      const titleText = document.createElement("span");
      titleText.className = "text-ellipsis";
      titleText.textContent = item.title;
      titleCell.appendChild(titleText);
      row.appendChild(titleCell);

      // 내용 셀
      const contentCell = document.createElement("td");
      contentCell.className = "content-cell";
      contentCell.style.textAlign = "center";
      const contentText = document.createElement("span");
      contentText.className = "text-ellipsis";
      contentText.textContent = item.content.replace(/\n/g, " "); // 줄바꿈 제거
      contentCell.appendChild(contentText);
      row.appendChild(contentCell);

      // 클릭 이벤트 리스너
      row.addEventListener("click", () => {
        this.openDetailModal(item.handover_id);
      });

      tableBody.appendChild(row);
    });
  },

  /**
   * 공지사항 상태 토글
   */
  toggleNoticeStatus: function (handoverId, isNotice) {
    const item = TMS.getHandoverItemById(handoverId);
    if (!item) return;

    // 같은 상태면 변경 필요 없음
    if (item.is_notice === isNotice) return;

    // 공지사항 상태 변경
    const confirmMsg = isNotice
      ? "선택한 인수인계를 공지사항으로 등록하시겠습니까?"
      : "선택한 공지사항을 인수인계로 변경하시겠습니까?";

    if (confirm(confirmMsg)) {
      this.updateHandoverItem(handoverId, {
        title: item.title,
        content: item.content,
        is_notice: isNotice,
      });

      // 성공 메시지
      messageUtils.success(
        isNotice ? "공지사항으로 등록되었습니다." : "인수인계로 변경되었습니다."
      );
    } else {
      // 취소 시 체크박스 원래 상태로 복원
      document.querySelector(
        `.notice-checkbox[data-id="${handoverId}"]`
      ).checked = item.is_notice;
    }
  },

  /**
   * 날짜 문자열 포맷팅
   */
  formatDateString: function (dateStr) {
    if (!dateStr) return "";

    try {
      const date = new Date(dateStr.replace(" ", "T"));
      return date.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch (e) {
      return dateStr;
    }
  },

  /**
   * 페이지네이션 업데이트
   */
  updatePagination: function (section) {
    const state = this.state[section];
    const infoId = section === "notice" ? "noticePageInfo" : "handoverPageInfo";

    document.getElementById(
      infoId
    ).textContent = `${state.currentPage} / ${state.totalPages}`;
  },

  /**
   * 페이지 변경 처리
   */
  handlePageChange: function (direction, section) {
    const state = this.state[section];

    if (direction === "prev" && state.currentPage > 1) {
      state.currentPage--;
    } else if (direction === "next" && state.currentPage < state.totalPages) {
      state.currentPage++;
    }

    this.updateCurrentPageData(section);
    this.renderTable(section);
    this.updatePagination(section);
  },

  /**
   * 데이터 새로고침 처리
   */
  refreshData: function () {
    // 로딩 표시 추가
    const tablesContainer = document.querySelector(".content-section.active");
    if (tablesContainer) {
      const loadingOverlay = document.createElement("div");
      loadingOverlay.className = "loading-overlay";
      loadingOverlay.id = "handoverLoadingOverlay";
      loadingOverlay.innerHTML = `
        <div class="loading-content">
          <i class="fa-solid fa-spinner loading-spinner"></i>
          <span>데이터를 불러오는 중...</span>
        </div>
      `;
      tablesContainer.style.position = "relative";
      tablesContainer.appendChild(loadingOverlay);
    }

    // 인수인계 데이터 다시 로드
    TMS.initHandoverData()
      .then(() => {
        // 로딩 표시 제거
        const loadingOverlay = document.getElementById(
          "handoverLoadingOverlay"
        );
        if (loadingOverlay) {
          loadingOverlay.remove();
        }

        // 성공 메시지
        messageUtils.success("목록이 새로고침되었습니다.");
      })
      .catch((error) => {
        // 로딩 표시 제거
        const loadingOverlay = document.getElementById(
          "handoverLoadingOverlay"
        );
        if (loadingOverlay) {
          loadingOverlay.remove();
        }

        console.error("데이터 로드 실패:", error);
        messageUtils.error("데이터 새로고침 중 오류가 발생했습니다.");
      });
  },

  /**
   * 상세 모달 열기 (개선된 버전)
   */
  openDetailModal: function (handoverId) {
    const item = TMS.getHandoverItemById(handoverId);

    if (!item) {
      messageUtils.error("정보를 찾을 수 없습니다.");
      return;
    }

    // 모달 제목 설정
    const modalTitle = item.is_notice
      ? "공지사항 상세 정보"
      : "인수인계 상세 정보";
    document.getElementById("detailTitle").textContent = modalTitle;

    // 모달 데이터 채우기
    document.getElementById("detailTitle2").textContent = item.title || "-";
    document.getElementById("detailAuthor").textContent =
      item.created_by || "-";

    // 날짜 포맷팅
    const dateStr = item.created_at;
    const dateDisplay = dateStr ? this.formatDateString(dateStr) : "-";
    document.getElementById("detailDate").textContent = dateDisplay;

    // 공지여부 - 아이콘 추가
    const isNoticeElement = document.getElementById("detailIsNotice");
    if (item.is_notice) {
      isNoticeElement.innerHTML =
        '<i class="fa-solid fa-bullhorn" style="color: #1890ff; margin-right: 5px;"></i> 예';
    } else {
      isNoticeElement.textContent = "아니오";
    }

    // 내용 - 줄바꿈 유지
    const contentElement = document.getElementById("detailContent");
    contentElement.textContent = item.content || "-";
    contentElement.style.whiteSpace = "pre-line"; // 줄바꿈 유지

    // 선택된 인수인계 ID 저장
    this.selectedHandoverId = handoverId;

    // 모달 열기
    modalUtils.openModal("handoverDetailModal");

    // 권한 체크 (본인이 작성한 경우만 수정/삭제 가능)
    const currentUser = TMS.store.userData.userName;
    const editBtn = document.getElementById("editHandoverBtn");
    const deleteBtn = document.getElementById("deleteHandoverBtn");

    const isAuthor = currentUser === item.created_by;
    editBtn.style.display = isAuthor ? "inline-block" : "none";
    deleteBtn.style.display = isAuthor ? "inline-block" : "none";
  },

  /**
   * 수정 모달 열기
   */
  openEditModal: function () {
    const handoverId = this.selectedHandoverId;
    if (!handoverId) return;

    const item = TMS.getHandoverItemById(handoverId);
    if (!item) return;

    // 모달 제목 변경
    document.getElementById("handoverModalTitle").textContent = "인수인계 수정";
    document.getElementById("submitBtnText").textContent = "수정하기";

    // ID를 hidden 필드에 저장
    document.getElementById("handoverId").value = handoverId;

    // 폼 필드에 데이터 채우기
    document.getElementById("handoverTitle").value = item.title;
    document.getElementById("handoverContent").value = item.content;

    // 공지 여부 설정
    document.getElementById("isNotice").checked = item.is_notice;

    // 수정 모드로 설정
    this.state.isEditMode = true;

    // 상세 모달 닫기 및 수정 모달 열기
    modalUtils.closeModal("handoverDetailModal");
    modalUtils.openModal("newHandoverModal");
  },

  /**
   * 인수인계 등록 모달 열기
   */
  openNewHandoverModal: function () {
    // 모달 제목 변경
    document.getElementById("handoverModalTitle").textContent = "인수인계 등록";
    document.getElementById("submitBtnText").textContent = "등록하기";

    // 입력 필드 초기화
    document.getElementById("handoverId").value = "";
    document.getElementById("handoverTitle").value = "";
    document.getElementById("handoverContent").value = "";
    document.getElementById("isNotice").checked = false;

    // 신규 등록 모드로 설정
    this.state.isEditMode = false;

    // 모달 열기
    modalUtils.openModal("newHandoverModal");
  },

  /**
   * 인수인계 등록/수정 처리 (대시보드 생성/수정 패턴 참조)
   */
  handleSubmitHandover: function () {
    console.log("인수인계 등록/수정 시작 - 대시보드 패턴 적용");

    // 중복 제출 방지를 위한 플래그 확인
    if (this.isSubmitting) {
      console.log("이미 처리 중입니다. 중복 제출 방지");
      return;
    }

    // 제출 시작 시 플래그 설정
    this.isSubmitting = true;

    // 입력 값 가져오기
    const handoverId = document.getElementById("handoverId").value.trim();
    const title = document.getElementById("handoverTitle").value.trim();
    const content = document.getElementById("handoverContent").value.trim();
    const isNotice = document.getElementById("isNotice").checked;

    // 필수 필드 확인
    if (!title) {
      messageUtils.warning("제목을 입력해주세요.");
      this.isSubmitting = false; // 플래그 초기화
      return;
    }

    if (!content) {
      messageUtils.warning("내용을 입력해주세요.");
      this.isSubmitting = false; // 플래그 초기화
      return;
    }

    try {
      let result = false;

      if (this.state.isEditMode) {
        console.log("수정 모드 - 기존 항목 업데이트");
        // 수정 로직
        result = this.updateHandoverItem(handoverId, {
          title,
          content,
          is_notice: isNotice,
        });
      } else {
        console.log("신규 등록 모드 - 대시보드 생성 방식 참고");
        // 신규 등록 로직 - 대시보드 생성 방식으로 처리
        result = this.createNewHandover({
          title,
          content,
          is_notice: isNotice,
        });
      }

      // 성공 여부 확인 및 후속 처리
      if (result) {
        console.log("처리 성공");

        // 모달 닫기 (대시보드 생성/수정과 동일한 패턴)
        modalUtils.closeModal("newHandoverModal");

        // 성공 메시지 표시 (대시보드 생성/수정과 동일)
        messageUtils.success(
          `${isNotice ? "공지사항" : "인수인계"}가 ${
            this.state.isEditMode ? "수정" : "등록"
          }되었습니다.`
        );
      } else {
        // 실패 처리
        console.error("인수인계 처리 실패");
        messageUtils.error("처리에 실패했습니다. 다시 시도해주세요.");
      }
    } catch (error) {
      console.error("인수인계 처리 오류:", error);
      messageUtils.error("처리 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      // 플래그 초기화
      this.isSubmitting = false;
    }
  },

  /**
   * 새 인수인계 생성 (대시보드 생성 패턴 참조)
   */
  createNewHandover: function (data) {
    try {
      console.log("새 인수인계 생성 시작 - 대시보드 패턴 참조");

      // 로딩 표시
      messageUtils.info("등록 중입니다...");

      // 현재 시간 기반 ID 생성
      const timestamp = new Date().getTime();
      const uniqueId = `H${timestamp}`;

      console.log(`생성된 고유 ID: ${uniqueId}`);

      // 데이터 생성
      const newHandover = {
        handover_id: uniqueId,
        title: data.title,
        content: data.content,
        is_notice: data.is_notice,
        created_by: TMS.store.userData.userName,
        created_at: new Date().toISOString().replace("T", " ").substr(0, 16),
      };

      // 스토어에 추가
      if (!TMS.store.handoverData) {
        TMS.store.handoverData = [];
      }

      // 이미 존재하는 ID가 있는지 확인
      const existingItem = TMS.store.handoverData.find(
        (item) => item.handover_id === uniqueId
      );

      if (existingItem) {
        console.warn("이미 존재하는 인수인계 ID입니다.");
        messageUtils.error("인수인계 등록에 실패했습니다.");
        return false;
      }

      // 배열에 추가
      TMS.store.handoverData.push(newHandover);
      console.log(`인수인계 항목 추가 완료: ${uniqueId}`);

      // 화면 갱신을 위한 이벤트 발생
      document.dispatchEvent(new CustomEvent("tms:handoverDataChanged"));

      return true;
    } catch (error) {
      console.error("인수인계 생성 오류:", error);
      messageUtils.error("등록 중 오류가 발생했습니다.");
      return false;
    }
  },

  /**
   * 인수인계 항목 수정 (대시보드 수정 패턴 참조)
   */
  updateHandoverItem: function (handoverId, data) {
    console.log(`인수인계 항목 수정 시작: ${handoverId}`);

    // 기존 데이터 가져오기
    const index = TMS.store.handoverData.findIndex(
      (item) => item.handover_id === handoverId
    );

    if (index === -1) {
      console.error(`수정할 항목을 찾을 수 없습니다: ${handoverId}`);
      return false;
    }

    // 변경된 데이터 적용
    try {
      // 기존 데이터 복사 및 수정
      const updatedItem = {
        ...TMS.store.handoverData[index],
        title: data.title,
        content: data.content,
        is_notice: data.is_notice,
      };

      console.log("업데이트할 항목:", updatedItem);

      // 데이터 업데이트
      TMS.store.handoverData[index] = updatedItem;

      // 변경 이벤트 발생 - 대시보드 패턴 동일
      document.dispatchEvent(new CustomEvent("tms:handoverDataChanged"));

      console.log("인수인계 항목 수정 완료");
      return true;
    } catch (error) {
      console.error("인수인계 항목 수정 실패:", error);
      return false;
    }
  },

  /**
   * 삭제 확인
   */
  confirmDeleteHandover: function () {
    const handoverId = this.selectedHandoverId;
    if (!handoverId) return;

    const item = TMS.getHandoverItemById(handoverId);
    if (!item) {
      messageUtils.error("삭제할 항목을 찾을 수 없습니다.");
      return;
    }

    // 삭제 확인
    if (
      confirm(
        `정말로 이 ${
          item.is_notice ? "공지사항" : "인수인계"
        }을 삭제하시겠습니까?`
      )
    ) {
      this.deleteHandoverItem(handoverId);
    }
  },

  /**
   * 인수인계 항목 삭제
   */
  deleteHandoverItem: function (handoverId) {
    // 로딩 표시
    messageUtils.info("삭제 중입니다...");

    // 기존 데이터 가져오기
    const index = TMS.store.handoverData.findIndex(
      (item) => item.handover_id === handoverId
    );

    if (index === -1) {
      messageUtils.error("삭제할 항목을 찾을 수 없습니다.");
      return false;
    }

    // 데이터 삭제
    const deletedItem = TMS.store.handoverData.splice(index, 1)[0];

    // 모달 닫기
    modalUtils.closeModal("handoverDetailModal");

    // 변경 이벤트 발생
    document.dispatchEvent(new CustomEvent("tms:handoverDataChanged"));

    // 성공 메시지
    messageUtils.success(
      `${deletedItem.is_notice ? "공지사항" : "인수인계"}이 삭제되었습니다.`
    );

    return true;
  },
};

// 전역 객체에 페이지 모듈 할당
window.HandoverPage = HandoverPage;

// 이벤트 리스너 초기화 여부 플래그 (전역 수준)
let isHandoverInitialized = false;

// 페이지 로드 시 초기화 (중복 초기화 방지)
document.addEventListener("DOMContentLoaded", function () {
  if (!isHandoverInitialized) {
    console.log("인수인계 페이지 초기화 - 최초 실행");
    HandoverPage.init();
    isHandoverInitialized = true;
  } else {
    console.log("인수인계 페이지 초기화 - 이미 초기화됨");
  }
});
