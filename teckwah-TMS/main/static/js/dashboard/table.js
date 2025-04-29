/**
 * 대시보드 테이블 모듈
 * 주문 테이블 관리를 담당합니다.
 */

// 네임스페이스에 모듈 추가
Dashboard.table = {
  /**
   * 초기화
   */
  init: function() {
    console.log('[Dashboard.table] 초기화');
    
    const orderTable = document.getElementById(Dashboard.config.orderTableId);
    
    if (orderTable) {
      const tbody = orderTable.querySelector('tbody');
      if (tbody) {
        // 행 클릭 이벤트 - 이벤트 위임 패턴 사용
        tbody.addEventListener('click', (e) => {
          const row = e.target.closest('tr');
          if (!row || row.classList.contains('no-data-row')) return;
          
          const orderId = row.getAttribute('data-id');
          if (orderId) {
            Dashboard.openOrderDetail(orderId);
          }
        });
      }
    }
  },
  
  /**
   * 테이블 데이터 업데이트
   * @param {Array} orders - 주문 목록
   */
  update: function(orders) {
    const tbody = document.querySelector(`#${Dashboard.config.orderTableId} tbody`);
    if (!tbody) return;
    
    // 데이터가 없는 경우 - innerHTML 사용 (최적화)
    if (!orders || orders.length === 0) {
      tbody.innerHTML = `
        <tr class="no-data-row">
          <td colspan="9" class="no-data-cell">데이터가 없습니다</td>
        </tr>
      `;
      return;
    }
    
    // 주문 목록 표시 - HTML 문자열 한 번에 생성 (최적화)
    let html = '';
    
    orders.forEach(order => {
      html += `
        <tr class="clickable-row status-row-${order.status}" data-id="${order.dashboardId}">
          <td class="column-department">${order.department || '-'}</td>
          <td class="column-type">${order.typeLabel || order.type_label || '-'}</td>
          <td class="column-warehouse">${order.warehouse || '-'}</td>
          <td class="column-order-no">${order.orderNo || '-'}</td>
          <td class="column-eta">${order.eta || '-'}</td>
          <td class="column-status">
            <span class="status-badge status-${order.status}">${order.statusLabel || order.status_label || '-'}</span>
          </td>
          <td class="column-region">${order.region || '-'}</td>
          <td class="column-customer">${order.customer || '-'}</td>
          <td class="column-driver">${order.driverName || '-'}</td>
        </tr>
      `;
    });
    
    tbody.innerHTML = html;
    
    // 컬럼 설정 적용
    if (Dashboard.columnSelector) {
      Dashboard.columnSelector.applySettings();
    } else {
      Dashboard.applyColumnSettings();
    }
  },
  
  /**
   * 페이지네이션 적용된 데이터 가져오기
   * @returns {Array} 현재 페이지의 주문 목록
   */
  getCurrentPageData: function() {
    // 필터링된 주문 목록
    const filteredOrders = Dashboard.state.filteredOrders || Dashboard.state.orders || [];
    
    // 페이지네이션
    const start = (Dashboard.state.currentPage - 1) * Dashboard.state.pageSize;
    const end = start + Dashboard.state.pageSize;
    
    return filteredOrders.slice(start, end);
  },
  
  /**
   * 행 상태에 따라 배경색 설정
   */
  applyRowStyles: function() {
    const rows = document.querySelectorAll(`#${Dashboard.config.orderTableId} tbody tr`);
    
    rows.forEach(row => {
      const statusClass = Array.from(row.classList).find(cls => cls.startsWith('status-row-'));
      if (statusClass) {
        // 행 기존 상태 클래스 제거
        row.classList.remove(statusClass);
        
        // 행에 새 상태 클래스 추가
        const statusCell = row.querySelector('.column-status');
        if (statusCell) {
          const statusBadge = statusCell.querySelector('.status-badge');
          if (statusBadge) {
            const statusValue = Array.from(statusBadge.classList)
              .find(cls => cls.startsWith('status-'))
              ?.replace('status-', '');
            
            if (statusValue) {
              row.classList.add(`status-row-${statusValue}`);
            }
          }
        }
      }
    });
  },
  
  /**
   * 테이블 정렬
   * @param {string} columnName - 정렬할 컬럼 이름
   * @param {string} direction - 정렬 방향 ('asc' 또는 'desc')
   */
  sort: function(columnName, direction) {
    // 이미 필터링된 주문 목록
    const filteredOrders = Dashboard.state.filteredOrders.slice();
    
    // 정렬 방향
    const sortDir = direction === 'asc' ? 1 : -1;
    
    // 정렬 로직
    filteredOrders.sort((a, b) => {
      let valueA, valueB;
      
      // 컬럼별 특수 처리
      switch (columnName) {
        case 'type':
          valueA = a.typeLabel || a.type_label || '';
          valueB = b.typeLabel || b.type_label || '';
          break;
        case 'status':
          valueA = a.statusLabel || a.status_label || '';
          valueB = b.statusLabel || b.status_label || '';
          break;
        default:
          valueA = a[columnName] || '';
          valueB = b[columnName] || '';
      }
      
      // 문자열 비교
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return sortDir * valueA.localeCompare(valueB);
      }
      
      // 숫자 비교
      return sortDir * (valueA - valueB);
    });
    
    // 결과 저장 및 테이블 업데이트
    Dashboard.state.filteredOrders = filteredOrders;
    
    // 현재 페이지 데이터로 테이블 업데이트
    this.update(this.getCurrentPageData());
    
    // 정렬 상태 표시
    this.updateSortIndicators(columnName, direction);
  },
  
  /**
   * 정렬 표시자 업데이트
   * @param {string} columnName - 정렬된 컬럼 이름
   * @param {string} direction - 정렬 방향
   */
  updateSortIndicators: function(columnName, direction) {
    const headers = document.querySelectorAll(`#${Dashboard.config.orderTableId} th`);
    
    headers.forEach(header => {
      // 기존 정렬 표시자 제거
      header.classList.remove('sort-asc', 'sort-desc');
      
      // 해당 컬럼에 정렬 표시자 추가
      if (header.classList.contains(`column-${columnName}`)) {
        header.classList.add(`sort-${direction}`);
      }
    });
  }
};
