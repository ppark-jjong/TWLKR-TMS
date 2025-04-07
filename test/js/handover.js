/**
 * 인수인계 페이지 관련 기능
 */

class HandoverPage {
  constructor() {
    // 인수인계 데이터 로컬 스토리지 키
    this.LOCAL_STORAGE_KEY = 'teckwah_handovers';
    
    // 요소
    this.elements = {
      handoverTableBody: document.getElementById('handoverTableBody'),
      refreshHandoverBtn: document.getElementById('refreshHandoverBtn'),
      newHandoverBtn: document.getElementById('newHandoverBtn'),
      saveNewHandoverBtn: document.getElementById('saveNewHandoverBtn')
    };
    
    // 이벤트 핸들러 바인딩
    this.bindEvents();
  }
  
  /**
   * 이벤트 핸들러 바인딩
   */
  bindEvents() {
    // 버튼 이벤트
    this.elements.refreshHandoverBtn.addEventListener('click', this.refreshData.bind(this));
    this.elements.newHandoverBtn.addEventListener('click', () => modalUtils.openModal('newHandoverModal'));
    this.elements.saveNewHandoverBtn.addEventListener('click', this.handleNewHandoverSubmit.bind(this));
  }
  
  /**
   * 초기화
   */
  async init() {
    try {
      // 데이터가 이미 로드되어 있지 않으면 로드
      if (!dataManager.isLoaded) {
        await dataManager.loadData();
      }
      
      // 로컬 스토리지에서 인수인계 데이터 로드
      this.loadHandoversFromLocalStorage();
      
      // 데이터 렌더링
      this.refreshData();
      
    } catch (error) {
      console.error('인수인계 초기화 오류:', error);
      messageUtils.error('인수인계 목록을 초기화하는 중 오류가 발생했습니다.');
    }
  }
  
  /**
   * 로컬 스토리지에서 인수인계 데이터 로드
   */
  loadHandoversFromLocalStorage() {
    try {
      // 로컬 스토리지에서 데이터 가져오기
      const savedHandovers = localStorage.getItem(this.LOCAL_STORAGE_KEY);
      
      if (savedHandovers) {
        // 데이터 파싱 및 dataManager에 설정
        const handovers = JSON.parse(savedHandovers);
        
        // 유효성 검사
        if (Array.isArray(handovers)) {
          // dataManager의 인수인계 배열 설정
          dataManager.handovers = handovers;
          console.log('로컬 스토리지에서 인수인계 데이터 로드됨:', handovers.length);
        } else {
          console.warn('로컬 스토리지에서 잘못된 형식의 인수인계 데이터가 발견되었습니다.');
          // 빈 배열로 초기화
          dataManager.handovers = [];
          // 로컬 스토리지에서 삭제
          localStorage.removeItem(this.LOCAL_STORAGE_KEY);
        }
      } else {
        // 저장된 데이터가 없으면 빈 배열로 초기화
        console.log('로컬 스토리지에 인수인계 데이터가 없습니다. 빈 배열로 시작합니다.');
        dataManager.handovers = [];
      }
    } catch (error) {
      console.error('로컬 스토리지에서 인수인계 데이터 로드 오류:', error);
      // 오류 발생 시 빈 배열로 초기화
      dataManager.handovers = [];
    }
  }
  
  /**
   * 로컬 스토리지에 인수인계 데이터 저장
   */
  saveHandoversToLocalStorage() {
    try {
      // 인수인계 데이터 가져오기
      const handovers = dataManager.getHandovers();
      
      // 로컬 스토리지에 저장
      localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(handovers));
      
      console.log('인수인계 데이터가 로컬 스토리지에 저장되었습니다:', handovers.length);
    } catch (error) {
      console.error('로컬 스토리지에 인수인계 데이터 저장 오류:', error);
    }
  }
  
  /**
   * 데이터 새로고침
   */
  refreshData() {
    // 데이터 조회
    const handovers = dataManager.getHandovers();
    
    // 테이블 렌더링
    this.renderTable(handovers);
  }
  
  /**
   * 테이블 렌더링
   */
  renderTable(handovers) {
    const tableBody = this.elements.handoverTableBody;
    tableBody.innerHTML = '';
    
    if (handovers.length === 0) {
      const emptyRow = document.createElement('tr');
      emptyRow.innerHTML = `<td colspan="6" class="empty-table">인수인계 데이터가 없습니다.</td>`;
      tableBody.appendChild(emptyRow);
      return;
    }
    
    // 최신순으로 정렬
    const sortedHandovers = [...handovers].sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return dateB - dateA;
    });
    
    sortedHandovers.forEach(item => {
      const row = document.createElement('tr');
      
      // 우선순위에 따른 스타일
      const priorityClass = statusUtils.getPriorityClass(item.priority);
      const priorityText = statusUtils.getPriorityText(item.priority);
      
      row.innerHTML = `
        <td>${item.title}</td>
        <td><span class="category-badge">${item.category}</span></td>
        <td><span class="priority-badge ${priorityClass}">${priorityText}</span></td>
        <td>${item.created_by}</td>
        <td>${item.created_at}</td>
        <td>
          <button class="btn secondary-btn btn-sm detail-btn" data-id="${item.handover_id}">
            상세보기
          </button>
          <button class="btn danger-btn btn-sm delete-btn" data-id="${item.handover_id}">
            삭제
          </button>
        </td>
      `;
      
      // 상세보기 버튼 이벤트
      const detailBtn = row.querySelector('.detail-btn');
      detailBtn.addEventListener('click', () => {
        this.showHandoverDetail(item.handover_id);
      });
      
      // 삭제 버튼 이벤트
      const deleteBtn = row.querySelector('.delete-btn');
      deleteBtn.addEventListener('click', () => {
        this.deleteHandover(item.handover_id);
      });
      
      tableBody.appendChild(row);
    });
  }
  
  /**
   * 인수인계 상세 정보 표시
   */
  showHandoverDetail(id) {
    const handover = dataManager.getHandoverById(id);
    if (!handover) {
      messageUtils.error('인수인계 정보를 찾을 수 없습니다.');
      return;
    }
    
    // 우선순위에 따른 스타일
    const priorityClass = statusUtils.getPriorityClass(handover.priority);
    const priorityText = statusUtils.getPriorityText(handover.priority);
    
    // 상세 정보 채우기
    document.getElementById('handoverDetailTitle').textContent = handover.title;
    document.getElementById('handoverDetailCategory').textContent = handover.category;
    document.getElementById('handoverDetailPriority').textContent = priorityText;
    document.getElementById('handoverDetailPriority').className = `priority-badge ${priorityClass}`;
    document.getElementById('handoverDetailAuthor').textContent = handover.created_by;
    document.getElementById('handoverDetailDate').textContent = handover.created_at;
    document.getElementById('handoverDetailContent').textContent = handover.content;
    
    // 모달 표시
    modalUtils.openModal('handoverDetailModal');
  }
  
  /**
   * 인수인계 삭제
   */
  deleteHandover(id) {
    if (confirm('정말로 이 인수인계를 삭제하시겠습니까?')) {
      try {
        // 데이터 관리자로부터 인수인계 삭제
        const handover = dataManager.getHandoverById(id);
        
        if (!handover) {
          messageUtils.error('삭제할 인수인계 정보를 찾을 수 없습니다.');
          return;
        }
        
        // 삭제할 항목 제거 (직접 배열 수정)
        dataManager.handovers = dataManager.handovers.filter(item => item.handover_id !== id);
        
        // 로컬 스토리지 업데이트
        this.saveHandoversToLocalStorage();
        
        // 성공 메시지 표시
        messageUtils.success('인수인계가 삭제되었습니다.');
        
        // 목록 새로고침
        this.refreshData();
      } catch (error) {
        console.error('인수인계 삭제 오류:', error);
        messageUtils.error('인수인계를 삭제하는 중 오류가 발생했습니다.');
      }
    }
  }
  
  /**
   * 신규 인수인계 등록 제출 핸들러
   */
  handleNewHandoverSubmit() {
    const form = document.getElementById('newHandoverForm');
    
    // 폼 유효성 검사
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    
    const newHandoverData = {
      title: document.getElementById('handoverTitle').value,
      category: document.getElementById('handoverCategory').value,
      priority: document.getElementById('handoverPriority').value,
      content: document.getElementById('handoverContent').value
    };
    
    try {
      // 신규 인수인계 등록
      const newHandover = dataManager.addHandover(newHandoverData);
      
      if (newHandover) {
        // 로컬 스토리지 업데이트
        this.saveHandoversToLocalStorage();
        
        modalUtils.closeModal('newHandoverModal');
        messageUtils.success('인수인계가 등록되었습니다.');
        this.refreshData();
        
        // 폼 초기화
        form.reset();
      } else {
        messageUtils.error('인수인계 등록에 실패했습니다.');
      }
    } catch (error) {
      console.error('인수인계 등록 오류:', error);
      messageUtils.error('인수인계 등록 중 오류가 발생했습니다.');
    }
  }
}

// 인수인계 페이지 인스턴스
const handoverPage = new HandoverPage();
