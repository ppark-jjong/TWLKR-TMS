/**
 * 인수인계 페이지 관련 기능
 */

class HandoverPage {
  constructor() {
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
      
      // 데이터 렌더링
      this.refreshData();
      
    } catch (error) {
      console.error('인수인계 초기화 오류:', error);
      messageUtils.error('인수인계 목록을 초기화하는 중 오류가 발생했습니다.');
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
    
    handovers.forEach(item => {
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
        </td>
      `;
      
      // 상세보기 버튼 이벤트
      const detailBtn = row.querySelector('.detail-btn');
      detailBtn.addEventListener('click', () => {
        this.showHandoverDetail(item.handover_id);
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
