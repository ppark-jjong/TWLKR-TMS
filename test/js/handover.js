/**
 * 인수인계 페이지 모듈
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
    activeTab: 'notice-section',
    // 현재 편집 중인 인수인계 ID
    editingHandoverId: null,
    // 모달이 수정 모드인지 여부
    isEditMode: false,
  },

  /**
   * 페이지 초기화
   */
  init: function () {
    console.log('인수인계 페이지 초기화...');

    // 모달 관련 상태 초기화
    this.selectedHandoverId = null;
    this.state.isEditMode = false;

    // 이벤트 리스너 등록
    this.registerEventListeners();

    // 데이터 로드되었으면 테이블 업데이트
    if (DataManager.isDataLoaded()) {
      this.updateLists();
    } else {
      // 데이터 로드 대기
      document.addEventListener('data:loaded', () => {
        this.updateLists();
      });
    }

    // 데이터 변경 이벤트 리스닝
    document.addEventListener('data:handoverChanged', () => {
      this.updateLists();
    });
    
    // 모달 이벤트 리스닝
    document.addEventListener('modal:opened', (e) => {
      console.log(`모달 열림: ${e.detail.modalId}`);
    });
    
    document.addEventListener('modal:closed', (e) => {
      console.log(`모달 닫힘: ${e.detail.modalId}`);
      
      // 모달이 닫힐 때 수정 모드 상태 초기화
      if (e.detail.modalId === 'newHandoverModal') {
        this.state.isEditMode = false;
      }
    });
  },

  /**
   * 이벤트 리스너 등록
   */
  registerEventListeners: function () {
    // 체크박스 이벤트 리스너 등록
    document.getElementById('showNoticeCheck').addEventListener('change', this.toggleSectionVisibility.bind(this));
    document.getElementById('showHandoverCheck').addEventListener('change', this.toggleSectionVisibility.bind(this));

    // 액션 버튼
    document
      .getElementById('refreshHandoverBtn')
      .addEventListener('click', this.refreshData.bind(this));
    document
      .getElementById('newHandoverBtn')
      .addEventListener('click', this.openNewHandoverModal.bind(this));

    // 페이지네이션 - 공지사항
    document
      .querySelectorAll('.page-btn[data-section="notice"]')
      .forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const direction = e.currentTarget.getAttribute('data-page');
          this.handlePageChange(direction, 'notice');
        });
      });

    // 페이지네이션 - 인수인계
    document
      .querySelectorAll('.page-btn[data-section="handover"]')
      .forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const direction = e.currentTarget.getAttribute('data-page');
          this.handlePageChange(direction, 'handover');
        });
      });

    // 모달 버튼
    document
      .getElementById('submitHandoverBtn')
      .addEventListener('click', this.handleSubmitHandover.bind(this));
    document
      .getElementById('editHandoverBtn')
      .addEventListener('click', this.openEditModal.bind(this));
    document
      .getElementById('deleteHandoverBtn')
      .addEventListener('click', this.confirmDeleteHandover.bind(this));

    // 테이블 행 이벤트 설정
    DOMUtils.setupTableRowEvents(
      document.getElementById('noticeTable'),
      this.openDetailModal.bind(this)
    );
    DOMUtils.setupTableRowEvents(
      document.getElementById('handoverTable'),
      this.openDetailModal.bind(this)
    );
  },

  /**
   * 섹션 가시성 토글
   */
  toggleSectionVisibility: function() {
    const showNotice = document.getElementById('showNoticeCheck').checked;
    const showHandover = document.getElementById('showHandoverCheck').checked;
    
    // 공지사항 섹션 토글
    if (showNotice) {
      document.getElementById('notice-section').style.display = 'block';
    } else {
      document.getElementById('notice-section').style.display = 'none';
    }
    
    // 인수인계 섹션 토글
    if (showHandover) {
      document.getElementById('handover-section').style.display = 'block';
    } else {
      document.getElementById('handover-section').style.display = 'none';
    }
    
    // 최소한 하나의 섹션은 보이도록 함
    if (!showNotice && !showHandover) {
      document.getElementById('showHandoverCheck').checked = true;
      document.getElementById('handover-section').style.display = 'block';
      MessageManager.warning('최소한 하나의 섹션은 표시되어야 합니다.');
    }
    
    // 레이아웃 조정 - 한 섹션만 보일 때 높이 조정
    if (showNotice && !showHandover) {
      document.getElementById('notice-section').style.flex = '1';
    } else if (!showNotice && showHandover) {
      document.getElementById('handover-section').style.flex = '1';
    } else {
      document.getElementById('notice-section').style.flex = '0 0 30%';
      document.getElementById('handover-section').style.flex = '1';
    }
  },

  /**
   * 모든 목록 업데이트
   */
  updateLists: function () {
    // 데이터 필터링
    this.filterData();

    // 공지사항 목록 업데이트
    this.updateCurrentPageData('notice');
    this.renderTable('notice');
    this.updatePagination('notice');

    // 인수인계 목록 업데이트
    this.updateCurrentPageData('handover');
    this.renderTable('handover');
    this.updatePagination('handover');
  },

  /**
   * 데이터 필터링
   */
  filterData: function () {
    // 전체 데이터 가져오기
    const allData = DataManager.getHandoverData();

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
      (item) => item.is_notice !== true
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
   * 테이블 렌더링
   */
  renderTable: function (section) {
    const tableId =
      section === 'notice' ? 'noticeTableBody' : 'handoverTableBody';
    const tableBody = document.getElementById(tableId);
    const state = this.state[section];

    // 테이블 내용 초기화
    tableBody.innerHTML = '';

    // 데이터가 없는 경우
    if (state.currentData.length === 0) {
      const emptyRow = document.createElement('tr');
      emptyRow.innerHTML = `<td colspan="4" class="empty-table">조회된 ${
        section === 'notice' ? '공지사항' : '인수인계'
      }이 없습니다.</td>`;
      tableBody.appendChild(emptyRow);
      return;
    }

    // 행 추가
    state.currentData.forEach((item) => {
      const row = document.createElement('tr');
      row.setAttribute('data-id', item.handover_id);

      // 작성자 셀
      const authorCell = document.createElement('td');
      authorCell.textContent = item.created_by;
      row.appendChild(authorCell);

      // 작성일시 셀
      const dateCell = document.createElement('td');
      dateCell.textContent = this.formatDateString(item.created_at);
      row.appendChild(dateCell);

      // 제목 셀
      const titleCell = document.createElement('td');
      titleCell.className = 'title-cell';
      const titleText = document.createElement('span');
      titleText.className = 'text-ellipsis';
      titleText.textContent = item.title;
      titleCell.appendChild(titleText);
      row.appendChild(titleCell);

      // 내용 셀
      const contentCell = document.createElement('td');
      contentCell.className = 'content-cell';
      const contentText = document.createElement('span');
      contentText.className = 'text-ellipsis';
      contentText.textContent = item.content.replace(/\n/g, ' '); // 줄바꿈 제거
      contentCell.appendChild(contentText);
      row.appendChild(contentCell);

      tableBody.appendChild(row);
    });
  },

  /**
   * 날짜 문자열 포맷팅
   */
  formatDateString: function (dateStr) {
    if (!dateStr) return '';

    try {
      const date = new Date(dateStr.replace(' ', 'T'));
      return date.toLocaleDateString('ko-KR');
    } catch (e) {
      return dateStr;
    }
  },

  /**
   * 페이지네이션 업데이트
   */
  updatePagination: function (section) {
    const state = this.state[section];
    const infoId = section === 'notice' ? 'noticePageInfo' : 'handoverPageInfo';

    document.getElementById(
      infoId
    ).textContent = `${state.currentPage} / ${state.totalPages}`;
  },

  /**
   * 페이지 변경 처리
   */
  handlePageChange: function (direction, section) {
    const state = this.state[section];

    if (direction === 'prev' && state.currentPage > 1) {
      state.currentPage--;
    } else if (direction === 'next' && state.currentPage < state.totalPages) {
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
    // 인수인계 데이터 다시 로드
    DataManager.loadHandoverData();
    // 화면 업데이트는 이벤트로 자동 처리

    MessageManager.success('목록이 새로고침되었습니다.');
  },

  /**
   * 상세 모달 열기
   */
  openDetailModal: function (handoverId) {
    const item = DataManager.getHandoverItemById(handoverId);

    if (!item) {
      MessageManager.error('정보를 찾을 수 없습니다.');
      return;
    }

    // 모달 제목 설정
    const modalTitle = item.is_notice
      ? '공지사항 상세 정보'
      : '인수인계 상세 정보';
    document.getElementById('detailTitle').textContent = modalTitle;

    // 모달 데이터 채우기
    document.getElementById('detailTitle2').textContent = item.title || '-';
    document.getElementById('detailAuthor').textContent =
      item.created_by || '-';

    // 날짜 포맷팅
    const dateStr = item.created_at;
    const dateDisplay = dateStr ? this.formatDateString(dateStr) : '-';
    document.getElementById('detailDate').textContent = dateDisplay;

    // 공지여부
    document.getElementById('detailIsNotice').textContent = item.is_notice
      ? '예'
      : '아니오';

    // 내용
    document.getElementById('detailContent').textContent = item.content || '-';

    // 선택된 인수인계 ID 저장
    this.selectedHandoverId = handoverId;

    // 모달 열기
    ModalManager.openModal('handoverDetailModal');

    // 권한 체크 (본인이 작성한 경우만 수정/삭제 가능)
    const userData = DataManager.getUserData();
    const currentUser = userData.userName;
    const editBtn = document.getElementById('editHandoverBtn');
    const deleteBtn = document.getElementById('deleteHandoverBtn');

    const isAuthor = currentUser === item.created_by;
    editBtn.style.display = isAuthor ? 'inline-block' : 'none';
    deleteBtn.style.display = isAuthor ? 'inline-block' : 'none';
  },

  /**
   * 수정 모달 열기
   */
  openEditModal: function () {
    const handoverId = this.selectedHandoverId;
    if (!handoverId) return;

    const item = DataManager.getHandoverItemById(handoverId);
    if (!item) return;

    // 모달 제목 변경
    document.getElementById('handoverModalTitle').textContent = '인수인계 수정';
    document.getElementById('submitBtnText').textContent = '수정하기';

    // ID를 hidden 필드에 저장
    document.getElementById('handoverId').value = handoverId;

    // 폼 필드에 데이터 채우기
    document.getElementById('handoverTitle').value = item.title;
    document.getElementById('handoverContent').value = item.content;

    // 공지 여부 설정
    document.getElementById('isNotice').checked = item.is_notice;

    // 수정 모드로 설정
    this.state.isEditMode = true;

    // 상세 모달 닫기 및 수정 모달 열기
    ModalManager.closeModal('handoverDetailModal');
    ModalManager.openModal('newHandoverModal');
  },

  /**
   * 인수인계 등록 모달 열기
   */
  openNewHandoverModal: function () {
    // 모달 제목 변경
    document.getElementById('handoverModalTitle').textContent = '인수인계 등록';
    document.getElementById('submitBtnText').textContent = '등록하기';

    // 입력 필드 초기화
    document.getElementById('handoverId').value = '';
    document.getElementById('handoverTitle').value = '';
    document.getElementById('handoverContent').value = '';
    document.getElementById('isNotice').checked = false;

    // 신규 등록 모드로 설정
    this.state.isEditMode = false;

    // 모달 열기
    ModalManager.openModal('newHandoverModal');
  },

  /**
   * 인수인계 등록/수정 처리
   */
  handleSubmitHandover: function () {
    // 입력 값 가져오기
    const handoverId = document.getElementById('handoverId').value.trim();
    const title = document.getElementById('handoverTitle').value.trim();
    const content = document.getElementById('handoverContent').value.trim();
    const isNotice = document.getElementById('isNotice').checked;

    // 필수 필드 확인
    if (!title || !content) {
      MessageManager.warning('제목과 내용을 입력해주세요.');
      return;
    }

    if (this.state.isEditMode) {
      // 수정 로직
      this.updateHandoverItem(handoverId, {
        title,
        content,
        is_notice: isNotice,
      });
    } else {
      // 신규 등록 로직
      this.createNewHandover({
        title,
        content,
        is_notice: isNotice,
      });
    }

    // 모달 닫기
    ModalManager.closeModal('newHandoverModal');
  },

  /**
   * 새 인수인계 생성
   */
  createNewHandover: function (data) {
    // DataManager를 통해 추가
    const result = DataManager.addHandoverItem(data);

    // 성공 메시지
    if (result) {
      MessageManager.success(
        `${data.is_notice ? '공지사항' : '인수인계'}이 등록되었습니다.`
      );

      // 공지사항일 경우 공지 탭으로 전환
      if (data.is_notice && this.state.activeTab !== 'notice-section') {
        document.querySelector('.tab[data-tab="notice-section"]').click();
      }
      // 인수인계일 경우 인수인계 탭으로 전환
      else if (!data.is_notice && this.state.activeTab !== 'handover-section') {
        document.querySelector('.tab[data-tab="handover-section"]').click();
      }
    } else {
      MessageManager.error('등록에 실패했습니다.');
    }
  },

  /**
   * 인수인계 항목 수정
   */
  updateHandoverItem: function (handoverId, data) {
    // DataManager를 통해 업데이트
    const result = DataManager.updateHandoverItem(handoverId, data);

    // 성공 메시지
    if (result) {
      MessageManager.success('정보가 수정되었습니다.');

      // 공지여부가 변경된 경우 해당 탭으로 전환
      if (data.is_notice && this.state.activeTab !== 'notice-section') {
        document.querySelector('.tab[data-tab="notice-section"]').click();
      } else if (!data.is_notice && this.state.activeTab !== 'handover-section') {
        document.querySelector('.tab[data-tab="handover-section"]').click();
      }
    } else {
      MessageManager.error('수정에 실패했습니다.');
    }
  },

  /**
   * 삭제 확인
   */
  confirmDeleteHandover: function () {
    const handoverId = this.selectedHandoverId;
    if (!handoverId) return;

    const item = DataManager.getHandoverItemById(handoverId);
    if (!item) {
      MessageManager.error('삭제할 항목을 찾을 수 없습니다.');
      return;
    }

    // 삭제 확인
    if (
      confirm(
        `정말로 이 ${
          item.is_notice ? '공지사항' : '인수인계'
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
    // DataManager를 통해 삭제
    const item = DataManager.getHandoverItemById(handoverId);
    const result = DataManager.deleteHandoverItem(handoverId);

    // 모달 닫기
    ModalManager.closeModal('handoverDetailModal');

    // 성공 메시지
    if (result) {
      MessageManager.success(
        `${item.is_notice ? '공지사항' : '인수인계'}이 삭제되었습니다.`
      );
    } else {
      MessageManager.error('삭제에 실패했습니다.');
    }
  }
};

// 전역 객체에 페이지 모듈 할당
window.HandoverPage = HandoverPage;
