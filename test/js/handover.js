/**
 * 인수인계 페이지 모듈 (단순화된 버전)
 */
const HandoverPage = {
  // 페이지 상태 관리 (간소화)
  state: {
    // 공지사항 상태
    notice: {
      currentPage: 1,
      pageSize: 10,
      currentData: [],
      filteredData: [],
    },
    // 인수인계 상태
    handover: {
      currentPage: 1,
      pageSize: 10,
      currentData: [],
      filteredData: [],
    },
    // 현재 활성화된 탭
    activeTab: 'notice-section',
    // 현재 편집 중인 인수인계 ID
    editingHandoverId: null,
  },

  /**
   * 페이지 초기화
   */
  init: function () {
    console.log('인수인계 페이지 초기화...');

    // 이벤트 리스너 등록
    this.registerEventListeners();

    // 데이터 로드 및 목록 업데이트
    this.loadData();
  },

  /**
   * 데이터 로드 및 처리
   */
  loadData: function () {
    // 데이터 가져오기 (기존 localStorage 또는 JSON 파일에서 로드)
    fetch('handover_data.json')
      .then((response) => response.json())
      .then((data) => {
        // 전체 데이터 저장
        this.allData = data.handovers || [];

        // 데이터 필터링
        this.filterData();

        // 목록 업데이트
        this.updateLists();
      })
      .catch((error) => {
        console.error('데이터 로드 오류:', error);
        // 에러 메시지 표시
        this.showMessage('데이터를 불러오는 중 오류가 발생했습니다.', 'error');
      });
  },

  /**
   * 이벤트 리스너 등록
   */
  registerEventListeners: function () {
    // 탭 전환
    document.querySelectorAll('.tab').forEach((tab) => {
      tab.addEventListener('click', this.handleTabChange.bind(this));
    });

    // 액션 버튼
    document
      .getElementById('refreshHandoverBtn')
      ?.addEventListener('click', this.loadData.bind(this));
    document
      .getElementById('newHandoverBtn')
      ?.addEventListener('click', this.openNewHandoverModal.bind(this));

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
      ?.addEventListener('click', this.handleSubmitHandover.bind(this));
    document
      .getElementById('editHandoverBtn')
      ?.addEventListener('click', this.openEditModal.bind(this));
    document
      .getElementById('deleteHandoverBtn')
      ?.addEventListener('click', this.handleDeleteHandover.bind(this));

    // 모달 닫기 버튼들
    document.querySelectorAll('.close-modal').forEach((button) => {
      const modalId = button.getAttribute('data-modal');
      button.addEventListener('click', () => {
        this.closeModal(modalId);
      });
    });
  },

  /**
   * 탭 변경 처리
   */
  handleTabChange: function (e) {
    const tabName = e.currentTarget.getAttribute('data-tab');

    // 모든 탭에서 active 클래스 제거
    document.querySelectorAll('.tab').forEach((tab) => {
      tab.classList.remove('active');
    });

    // 클릭한 탭에 active 클래스 추가
    e.currentTarget.classList.add('active');

    // 모든 컨텐츠 섹션 숨기기
    document.querySelectorAll('.content-section').forEach((section) => {
      section.classList.remove('active');
    });

    // 해당 탭의 컨텐츠 섹션 표시
    document.getElementById(tabName).classList.add('active');

    // 현재 활성화된 탭 상태 저장
    this.state.activeTab = tabName;
  },

  /**
   * 모든 목록 업데이트
   */
  updateLists: function () {
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
    if (!this.allData || !Array.isArray(this.allData)) {
      console.error('필터링할 데이터가 없습니다.');
      return;
    }

    // 최신순 정렬
    this.allData.sort((a, b) => {
      return new Date(b.created_at) - new Date(a.created_at);
    });

    // 공지사항 필터링
    this.state.notice.filteredData = this.allData.filter(
      (item) => item.is_notice === true
    );

    // 인수인계 필터링
    this.state.handover.filteredData = this.allData.filter(
      (item) => item.is_notice === false
    );
  },

  /**
   * 현재 페이지 데이터 업데이트
   */
  updateCurrentPageData: function (section) {
    const { currentPage, pageSize, filteredData } = this.state[section];
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    this.state[section].currentData = filteredData.slice(startIndex, endIndex);
  },

  /**
   * 테이블 렌더링
   */
  renderTable: function (section) {
    const { currentData } = this.state[section];
    const tableBody = document.getElementById(`${section}TableBody`);

    if (!tableBody) {
      console.error(`테이블 본문을 찾을 수 없습니다: ${section}TableBody`);
      return;
    }

    // 테이블 초기화
    tableBody.innerHTML = '';

    if (currentData.length === 0) {
      // 데이터가 없을 경우 메시지 표시
      const emptyRow = document.createElement('tr');
      emptyRow.className = 'empty-data-row';
      emptyRow.innerHTML = `
        <td colspan="5" class="text-center">
          <div class="no-data-content">
            <i class="fa-solid fa-inbox"></i>
            <p>데이터가 없습니다.</p>
          </div>
        </td>
      `;
      tableBody.appendChild(emptyRow);
      return;
    }

    // 데이터 행 생성
    currentData.forEach((item) => {
      const row = document.createElement('tr');

      // 행 데이터 속성 설정
      row.setAttribute('data-id', item.handover_id);

      // 행 클릭 이벤트 등록
      row.addEventListener('click', () => this.handleRowClick(item));

      if (section === 'notice') {
        // 공지사항 행
        row.innerHTML = `
          <td>
            <span class="notice-icon">
              <i class="fa-solid fa-bullhorn"></i>
            </span>
            ${this.formatDate(item.created_at)}
          </td>
          <td class="title-cell">${this.escapeHTML(item.title)}</td>
          <td>${item.created_by}</td>
        `;
      } else {
        // 인수인계 행
        row.innerHTML = `
          <td>${this.formatDate(item.created_at)}</td>
          <td class="title-cell">${this.escapeHTML(item.title)}</td>
          <td>${item.created_by}</td>
        `;
      }

      tableBody.appendChild(row);
    });
  },

  /**
   * 행 클릭 이벤트 처리
   */
  handleRowClick: function (item) {
    // 현재 편집 중인 인수인계 ID 저장
    this.state.editingHandoverId = item.handover_id;

    // 상세 모달 내용 설정
    document.getElementById('detailHandoverTitle').textContent = item.title;
    document.getElementById('detailHandoverContent').textContent = item.content;
    document.getElementById('detailHandoverCreator').textContent =
      item.created_by;
    document.getElementById('detailHandoverCreatedAt').textContent =
      this.formatDate(item.created_at);

    // 수정/삭제 버튼 표시 조건 (현재 로그인한 사용자 정보 확인 등)
    const isOwner = true; // 실제 구현에서는 현재 사용자와 작성자 비교 필요
    document.getElementById('editHandoverBtn').style.display = isOwner
      ? 'inline-block'
      : 'none';
    document.getElementById('deleteHandoverBtn').style.display = isOwner
      ? 'inline-block'
      : 'none';

    // 상세 모달 표시
    this.openModal('handoverDetailModal');
  },

  /**
   * 새 인수인계 모달 열기
   */
  openNewHandoverModal: function () {
    // 모달 상태 초기화
    this.state.editingHandoverId = null;

    // 폼 초기화
    document.getElementById('handoverForm').reset();
    document.getElementById('handoverModalTitle').textContent =
      '새 인수인계 작성';

    // 모달 열기
    this.openModal('handoverFormModal');
  },

  /**
   * 인수인계 편집 모달 열기
   */
  openEditModal: function () {
    const itemId = this.state.editingHandoverId;
    if (!itemId) return;

    // 현재 편집 중인 항목 찾기
    const item = this.allData.find((data) => data.handover_id === itemId);
    if (!item) return;

    // 폼 초기화 및 값 설정
    document.getElementById('handoverTitle').value = item.title;
    document.getElementById('handoverContent').value = item.content;
    document.getElementById('isNotice').checked = item.is_notice;

    // 모달 제목 변경
    document.getElementById('handoverModalTitle').textContent = '인수인계 수정';

    // 상세 모달 닫기
    this.closeModal('handoverDetailModal');

    // 편집 모달 열기
    this.openModal('handoverFormModal');
  },

  /**
   * 인수인계 저장 처리
   */
  handleSubmitHandover: function () {
    // 폼 데이터 가져오기
    const title = document.getElementById('handoverTitle').value.trim();
    const content = document.getElementById('handoverContent').value.trim();
    const isNotice = document.getElementById('isNotice').checked;

    // 유효성 검사
    if (!title) {
      this.showMessage('제목을 입력해주세요.', 'warning');
      return;
    }

    if (!content) {
      this.showMessage('내용을 입력해주세요.', 'warning');
      return;
    }

    // 새 인수인계 ID 생성 (실제 구현에서는 서버에서 생성)
    const itemId =
      this.state.editingHandoverId || `H${Date.now().toString().slice(-4)}`;

    // 현재 시간 포맷팅 (실제 구현에서는 서버 시간 사용)
    const now = new Date();
    const createdAt = this.formatDateTime(now);

    // 현재 사용자 정보 (실제 구현에서는 로그인 정보 사용)
    const creator = 'CSAdmin';

    // 새 인수인계 객체 생성
    const newHandover = {
      handover_id: itemId,
      title,
      content,
      created_by: creator,
      created_at: createdAt,
      is_notice: isNotice,
    };

    // 기존 데이터 업데이트 또는 새 데이터 추가
    if (this.state.editingHandoverId) {
      // 기존 항목 업데이트
      const index = this.allData.findIndex(
        (item) => item.handover_id === itemId
      );
      if (index !== -1) {
        this.allData[index] = newHandover;
      }
    } else {
      // 새 항목 추가
      this.allData.unshift(newHandover);
    }

    // 데이터 필터링 및 목록 업데이트
    this.filterData();
    this.updateLists();

    // 모달 닫기
    this.closeModal('handoverFormModal');

    // 성공 메시지 표시
    const message = this.state.editingHandoverId
      ? '인수인계가 성공적으로 수정되었습니다.'
      : '인수인계가 성공적으로 저장되었습니다.';
    this.showMessage(message, 'success');

    // 상태 초기화
    this.state.editingHandoverId = null;
  },

  /**
   * 인수인계 삭제 처리
   */
  handleDeleteHandover: function () {
    const itemId = this.state.editingHandoverId;
    if (!itemId) return;

    // 삭제 확인
    if (!confirm('정말로 이 항목을 삭제하시겠습니까?')) {
      return;
    }

    // 인수인계 삭제
    const index = this.allData.findIndex((item) => item.handover_id === itemId);
    if (index !== -1) {
      this.allData.splice(index, 1);
    }

    // 데이터 필터링 및 목록 업데이트
    this.filterData();
    this.updateLists();

    // 모달 닫기
    this.closeModal('handoverDetailModal');

    // 성공 메시지 표시
    this.showMessage('항목이 성공적으로 삭제되었습니다.', 'success');

    // 상태 초기화
    this.state.editingHandoverId = null;
  },

  /**
   * 페이지 변경 처리
   */
  handlePageChange: function (direction, section) {
    const { currentPage } = this.state[section];
    const totalItems = this.state[section].filteredData.length;
    const { pageSize } = this.state[section];
    const totalPages = Math.ceil(totalItems / pageSize);

    let newPage = currentPage;

    if (direction === 'prev' && currentPage > 1) {
      newPage = currentPage - 1;
    } else if (direction === 'next' && currentPage < totalPages) {
      newPage = currentPage + 1;
    }

    if (newPage !== currentPage) {
      this.state[section].currentPage = newPage;
      this.updateCurrentPageData(section);
      this.renderTable(section);
      this.updatePagination(section);
    }
  },

  /**
   * 페이지네이션 업데이트
   */
  updatePagination: function (section) {
    const { currentPage } = this.state[section];
    const totalItems = this.state[section].filteredData.length;
    const { pageSize } = this.state[section];
    const totalPages = Math.ceil(totalItems / pageSize);

    // 페이지 정보 업데이트
    const pageInfoEl = document.getElementById(`${section}PageInfo`);
    if (pageInfoEl) {
      pageInfoEl.textContent = `${currentPage} / ${totalPages || 1}`;
    }

    // 페이지 버튼 활성화/비활성화
    const prevBtn = document.querySelector(
      `.page-btn[data-page="prev"][data-section="${section}"]`
    );
    const nextBtn = document.querySelector(
      `.page-btn[data-page="next"][data-section="${section}"]`
    );

    if (prevBtn) {
      prevBtn.disabled = currentPage <= 1;
    }

    if (nextBtn) {
      nextBtn.disabled = currentPage >= totalPages;
    }
  },

  /**
   * 모달 열기
   */
  openModal: function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'flex';
      document.body.classList.add('modal-open');
    }
  },

  /**
   * 모달 닫기
   */
  closeModal: function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'none';
      document.body.classList.remove('modal-open');
    }
  },

  /**
   * 메시지 표시
   */
  showMessage: function (message, type = 'info') {
    if (typeof messageUtils !== 'undefined' && messageUtils.showMessage) {
      messageUtils.showMessage(message, type);
    } else {
      alert(message);
    }
  },

  /**
   * 날짜 포맷팅
   */
  formatDate: function (dateStr) {
    if (!dateStr) return '-';

    try {
      const date = new Date(dateStr);

      // 유효한 날짜인지 확인
      if (isNaN(date.getTime())) {
        return dateStr;
      }

      return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      console.warn('날짜 포맷팅 오류:', e);
      return dateStr;
    }
  },

  /**
   * 날짜/시간 포맷팅
   */
  formatDateTime: function (date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return '';
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}`;
  },

  /**
   * HTML 이스케이프
   */
  escapeHTML: function (text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },
};

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function () {
  HandoverPage.init();
});
