/**
 * 대시보드 날짜 선택기 모듈
 * 날짜 선택 및 관련 이벤트를 처리합니다.
 */

// 네임스페이스에 모듈 추가
Dashboard.datePicker = {
  /**
   * 초기화
   */
  init: function() {
    console.log('[Dashboard.datePicker] 초기화');
    
    const dateRangePicker = document.getElementById('dateRangePicker');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    if (!dateRangePicker) return;
    
    // Air Datepicker 초기화
    new AirDatepicker(dateRangePicker, {
      range: true,
      multipleDates: true,
      multipleDatesSeparator: ' ~ ',
      autoClose: true,
      locale: window.AirDatepickerLocaleKO,
      onSelect: ({ formattedDate }) => {
        if (Array.isArray(formattedDate) && formattedDate.length === 2) {
          Dashboard.state.startDate = formattedDate[0];
          Dashboard.state.endDate = formattedDate[1];
          
          if (startDateInput) startDateInput.value = formattedDate[0];
          if (endDateInput) endDateInput.value = formattedDate[1];
        }
      }
    });
    
    // 오늘 버튼 이벤트
    const todayBtn = document.getElementById('todayBtn');
    if (todayBtn) {
      todayBtn.addEventListener('click', () => {
        const today = new Date();
        const formattedDate = Utils.formatDate(today);
        
        Dashboard.state.startDate = formattedDate;
        Dashboard.state.endDate = formattedDate;
        
        if (startDateInput) startDateInput.value = formattedDate;
        if (endDateInput) endDateInput.value = formattedDate;
        
        if (dateRangePicker) {
          dateRangePicker.value = formattedDate;
        }
        
        // 오늘 데이터 조회
        Dashboard.loadOrders();
      });
    }
    
    // 검색 버튼 이벤트
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
      searchBtn.addEventListener('click', () => {
        Dashboard.loadOrders();
      });
    }
  },
  
  /**
   * 날짜 범위 설정
   * @param {string} startDate - 시작 날짜 (YYYY-MM-DD)
   * @param {string} endDate - 종료 날짜 (YYYY-MM-DD)
   */
  setDateRange: function(startDate, endDate) {
    const dateRangePicker = document.getElementById('dateRangePicker');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    Dashboard.state.startDate = startDate;
    Dashboard.state.endDate = endDate;
    
    if (startDateInput) startDateInput.value = startDate;
    if (endDateInput) endDateInput.value = endDate;
    
    if (dateRangePicker) {
      dateRangePicker.value = startDate === endDate ? 
        startDate : `${startDate} ~ ${endDate}`;
    }
  },
  
  /**
   * 현재 날짜로 설정
   */
  setToday: function() {
    const today = new Date();
    const formattedDate = Utils.formatDate(today);
    
    this.setDateRange(formattedDate, formattedDate);
  },
  
  /**
   * URL에서 날짜 파라미터 가져오기
   */
  getDateFromUrl: function() {
    const startDate = Utils.getUrlParam('start_date');
    const endDate = Utils.getUrlParam('end_date');
    
    if (startDate && endDate) {
      this.setDateRange(startDate, endDate);
      return true;
    }
    
    return false;
  }
};
