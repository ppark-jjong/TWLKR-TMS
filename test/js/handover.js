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
      saveNewHandoverBtn: document.getElementById('saveNewHandoverBtn'),
      handoverCardContainer: document.querySelector('.handover-card-container')
    };
    
    // 이벤트 핸들러 바인딩
    this.bindEvents();
  }
  
  /**
   * 이벤트 핸들러 바인딩
   */
  bindEvents() {
    try {
      // 버튼 이벤트
      if (this.elements.refreshHandoverBtn) {
        this.elements.refreshHandoverBtn.addEventListener('click', this.refreshData.bind(this));
      }
      
      if (this.elements.newHandoverBtn) {
        this.elements.newHandoverBtn.addEventListener('click', () => modalUtils.openModal('newHandoverModal'));
      }
      
      if (this.elements.saveNewHandoverBtn) {
        this.elements.saveNewHandoverBtn.addEventListener('click', this.handleNewHandoverSubmit.bind(this));
      }
      
      console.log('인수인계 페이지 이벤트 핸들러 등록 완료');
    } catch (error) {
      console.error('인수인계 페이지 이벤트 핸들러 등록 오류:', error);
    }
  }
  
  /**
   * 초기화
   */
  async init() {
    try {
      console.log('인수인계 페이지 초기화 중...');
      
      // 데이터가 이미 로드되어 있지 않으면 로드
      if (!dataManager.isLoaded) {
        console.log('데이터 매니저 로드 중...');
        await dataManager.loadData();
      }
      
      // 로컬 스토리지에서 인수인계 데이터 로드
      this.loadHandoversFromLocalStorage();
      
      // 데이터 렌더링
      this.refreshData();
      
      console.log('인수인계 페이지 초기화 완료');
      
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
    try {
      // 데이터 조회
      const handovers = dataManager.getHandovers();
      
      // 카드 형식으로 데이터 렌더링
      this.renderCards(handovers);
      
      // 테이블도 렌더링 (필요 시 전환 가능)
      if (this.elements.handoverTableBody) {
        this.renderTable(handovers);
      }
      
      console.log('인수인계 데이터 렌더링 완료:', handovers.length);
    } catch (error) {
      console.error('인수인계 데이터 새로고침 오류:', error);
    }
  }
  
  /**
   * 카드 형식으로 렌더링
   */
  renderCards(handovers) {
    try {
      // 카드 컨테이너 요소 확인
      if (!this.elements.handoverCardContainer) {
        console.error('인수인계 카드 컨테이너 요소를 찾을 수 없습니다.');
        return;
      }
      
      // 기존 카드 제거
      this.elements.handoverCardContainer.innerHTML = '';
      
      // 데이터가 없을 경우
      if (handovers.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-message';
        emptyMessage.style.textAlign = 'center';
        emptyMessage.style.padding = '40px 0';
        emptyMessage.style.color = '#999';
        emptyMessage.style.fontSize = '1.1rem';
        emptyMessage.innerHTML = '<i class="fa-solid fa-inbox" style="font-size: 3rem; margin-bottom: 15px; color: #ccc;"></i><p>인수인계 데이터가 없습니다.</p>';
        
        this.elements.handoverCardContainer.appendChild(emptyMessage);
        return;
      }
      
      // 최신순으로 정렬
      const sortedHandovers = [...handovers].sort((a, b) => {
        const dateA = new Date(a.created_at);
        const dateB = new Date(b.created_at);
        return dateB - dateA;
      });
      
      // 카드 생성 및 추가
      sortedHandovers.forEach(item => {
        // 우선순위에 따른 스타일
        const priorityClass = statusUtils.getPriorityClass(item.priority);
        const priorityText = statusUtils.getPriorityText(item.priority);
        
        // 카테고리 스타일 설정
        let categoryBgColor = '#e6f7ff';
        let categoryColor = '#1890ff';
        
        switch(item.category) {
          case '배송':
            categoryBgColor = '#e6f7ff';
            categoryColor = '#1890ff';
            break;
          case '야간근무':
            categoryBgColor = '#f9f0ff';
            categoryColor = '#722ed1';
            break;
          case '안전':
            categoryBgColor = '#fff7e6';
            categoryColor = '#fa8c16';
            break;
          case '일반':
            categoryBgColor = '#f9f9f9';
            categoryColor = '#5a5a5a';
            break;
        }
        
        // 카드 생성
        const card = document.createElement('div');
        card.className = 'handover-card';
        card.style.backgroundColor = 'white';
        card.style.borderRadius = '8px';
        card.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
        card.style.padding = '16px';
        card.style.cursor = 'pointer';
        card.style.transition = 'transform 0.2s, box-shadow 0.2s';
        
        // 호버 효과 추가
        card.addEventListener('mouseenter', () => {
          card.style.transform = 'translateY(-3px)';
          card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
        });
        
        card.addEventListener('mouseleave', () => {
          card.style.transform = 'translateY(0)';
          card.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
        });
        
        // 클릭 이벤트 - 상세 정보 표시
        card.addEventListener('click', () => {
          this.showHandoverDetail(item.handover_id);
        });
        
        // 카드 내용 구성
        card.innerHTML = `
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span class="category-badge" style="background-color: ${categoryBgColor}; color: ${categoryColor}; border-radius: 12px; padding: 2px 8px; font-size: 0.8rem;">${item.category}</span>
            <span class="priority-badge ${priorityClass}" style="border-radius: 12px; padding: 2px 8px; font-size: 0.8rem;">${priorityText}</span>
          </div>
          <h4 style="margin: 0 0 10px 0; font-size: 1.1rem; color: #333; font-weight: 600;">${item.title}</h4>
          <p style="margin: 0 0 15px 0; color: #666; font-size: 0.9rem; height: 60px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;">
            ${item.content}
          </p>
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: #999;">
            <span>${item.created_by}</span>
            <span>${item.created_at}</span>
          </div>
        `;
        
        this.elements.handoverCardContainer.appendChild(card);
      });
    } catch (error) {
      console.error('인수인계 카드 렌더링 오류:', error);
    }
  }
  
  /**
   * 테이블 렌더링
   */
  renderTable(handovers) {
    try {
      // 테이블 바디 확인
      if (!this.elements.handoverTableBody) {
        console.error('인수인계 테이블 바디 요소를 찾을 수 없습니다.');
        return;
      }
      
      // 기존 내용 제거
      this.elements.handoverTableBody.innerHTML = '';
      
      // 데이터가 없을 경우
      if (handovers.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `<td colspan="6" class="empty-table">인수인계 데이터가 없습니다.</td>`;
        this.elements.handoverTableBody.appendChild(emptyRow);
        return;
      }
      
      // 최신순으로 정렬
      const sortedHandovers = [...handovers].sort((a, b) => {
        const dateA = new Date(a.created_at);
        const dateB = new Date(b.created_at);
        return dateB - dateA;
      });
      
      // 행 추가
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
        
        this.elements.handoverTableBody.appendChild(row);
      });
    } catch (error) {
      console.error('인수인계 테이블 렌더링 오류:', error);
    }
  }
  
  /**
   * 인수인계 상세 정보 표시
   */
  showHandoverDetail(id) {
    try {
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
    } catch (error) {
      console.error('인수인계 상세 정보 표시 오류:', error);
      messageUtils.error('인수인계 상세 정보를 표시하는 중 오류가 발생했습니다.');
    }
  }
  
  /**
   * 인수인계 삭제
   */
  deleteHandover(id) {
    try {
      if (confirm('정말로 이 인수인계를 삭제하시겠습니까?')) {
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
      }
    } catch (error) {
      console.error('인수인계 삭제 오류:', error);
      messageUtils.error('인수인계를 삭제하는 중 오류가 발생했습니다.');
    }
  }
  
  /**
   * 신규 인수인계 등록 제출 핸들러
   */
  handleNewHandoverSubmit() {
    try {
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
window.handoverPage = new HandoverPage();
