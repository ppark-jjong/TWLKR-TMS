/**
 * 대시보드 컬럼 선택기 모듈
 * 테이블 컬럼 가시성 관리를 담당합니다.
 */

// 네임스페이스에 모듈 추가
Dashboard.columnSelector = {
  /**
   * 컬럼 정의
   */
  columns: [
    { name: 'department', label: '부서' },
    { name: 'type', label: '유형' },
    { name: 'warehouse', label: '창고' },
    { name: 'order-no', label: '주문번호' },
    { name: 'eta', label: 'ETA' },
    { name: 'status', label: '상태' },
    { name: 'region', label: '도착지' },
    { name: 'customer', label: '고객명' },
    { name: 'driver', label: '기사명' }
  ],
  
  /**
   * 초기화
   */
  init: function() {
    console.log('[Dashboard.columnSelector] 초기화');
    
    const columnSelectorBtn = document.getElementById('columnSelectorBtn');
    const columnSelectorDropdown = document.getElementById('columnSelectorDropdown');
    const columnSelectorContent = document.getElementById('columnSelectorContent');
    
    if (!columnSelectorBtn || !columnSelectorDropdown || !columnSelectorContent) return;
    
    // 컬럼 설정 불러오기
    this.loadSettings();
    
    // 드롭다운 토글
    columnSelectorBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      columnSelectorDropdown.style.display = 
        columnSelectorDropdown.style.display === 'none' || 
        columnSelectorDropdown.style.display === '' ? 'block' : 'none';
    });
    
    // innerHTML로 한번에 체크박스 생성 (최적화)
    let checkboxesHtml = '';
    this.columns.forEach(col => {
      const isVisible = Dashboard.state.columnSettings === null || 
                      Dashboard.state.columnSettings[col.name] !== false;
      
      checkboxesHtml += `
        <div class="column-checkbox">
          <label>
            <input type="checkbox" name="column-${col.name}" 
                   ${isVisible ? 'checked' : ''}>
            ${col.label}
          </label>
        </div>
      `;
    });
    
    columnSelectorContent.innerHTML = checkboxesHtml;
    
    // 체크박스 이벤트 - 이벤트 위임 패턴 적용
    columnSelectorContent.addEventListener('change', (e) => {
      if (e.target.type === 'checkbox') {
        const columnName = e.target.name.replace('column-', '');
        this.toggleColumn(columnName, e.target.checked);
      }
    });
    
    // 문서 클릭 시 드롭다운 닫기
    document.addEventListener('click', (e) => {
      if (!columnSelectorDropdown.contains(e.target) && 
          e.target !== columnSelectorBtn) {
        columnSelectorDropdown.style.display = 'none';
      }
    });
    
    // 초기 컬럼 가시성 적용
    this.applySettings();
  },
  
  /**
   * 컬럼 설정 불러오기
   */
  loadSettings: function() {
    const settings = localStorage.getItem('dashboard-columns');
    if (settings) {
      try {
        Dashboard.state.columnSettings = JSON.parse(settings);
      } catch (e) {
        console.error('컬럼 설정 파싱 오류:', e);
        Dashboard.state.columnSettings = {};
      }
    } else {
      Dashboard.state.columnSettings = {};
    }
  },
  
  /**
   * 컬럼 토글
   * @param {string} columnName - 컬럼 이름
   * @param {boolean} visible - 표시 여부
   */
  toggleColumn: function(columnName, visible) {
    if (!Dashboard.state.columnSettings) {
      Dashboard.state.columnSettings = {};
    }
    
    Dashboard.state.columnSettings[columnName] = visible;
    localStorage.setItem('dashboard-columns', JSON.stringify(Dashboard.state.columnSettings));
    
    // 컬럼 가시성 변경 - DOM 조작 (적절한 사용 사례)
    const columns = document.querySelectorAll(`.column-${columnName}`);
    columns.forEach(col => {
      col.style.display = visible ? '' : 'none';
    });
  },
  
  /**
   * 컬럼 설정 적용
   */
  applySettings: function() {
    if (!Dashboard.state.columnSettings) {
      this.loadSettings();
    }
    
    Object.keys(Dashboard.state.columnSettings).forEach(columnName => {
      const visible = Dashboard.state.columnSettings[columnName];
      const columns = document.querySelectorAll(`.column-${columnName}`);
      
      columns.forEach(col => {
        col.style.display = visible ? '' : 'none';
      });
    });
  },
  
  /**
   * 컬럼 설정 초기화
   */
  resetSettings: function() {
    Dashboard.state.columnSettings = {};
    localStorage.removeItem('dashboard-columns');
    
    // 모든 컬럼 표시
    this.columns.forEach(col => {
      const columns = document.querySelectorAll(`.column-${col.name}`);
      columns.forEach(column => {
        column.style.display = '';
      });
      
      // 체크박스 상태 업데이트
      const checkbox = document.querySelector(`input[name="column-${col.name}"]`);
      if (checkbox) checkbox.checked = true;
    });
    
    Notify.info('컬럼 설정이 초기화되었습니다.');
  }
};
