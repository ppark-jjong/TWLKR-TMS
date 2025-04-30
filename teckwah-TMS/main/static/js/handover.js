/**
 * 인수인계 페이지 스크립트
 * 인수인계 목록 조회, 필터링, 상세 보기 등 기능을 처리합니다.
 */
document.addEventListener('DOMContentLoaded', function () {
  // 인수인계 모듈
  const Handover = {
    // 상태 데이터
    state: {
      handoverItems: [], // 인수인계 목록 데이터
      notices: [], // 공지사항 데이터
      filters: {
        isNotice: false, // 공지사항 여부 필터
        keyword: '', // 검색 키워드
      },
      pagination: {
        currentPage: 1,
        pageSize: 10,
        totalItems: 0,
        totalPages: 1,
      },
    },

    /**
     * 초기화 함수
     */
    init() {
      // DOM 요소 참조 설정
      this.initDomRefs();

      // 서버에서 전달받은 초기 데이터 설정 (있는 경우)
      if (typeof initialData !== 'undefined') {
        console.log('서버에서 받은 초기 데이터 사용');
        this.state.handoverItems = initialData.handoverItems || [];
        this.state.notices = initialData.notices || [];
        this.state.pagination = initialData.pagination || this.state.pagination;
      }

      // 이벤트 리스너 설정
      this.initEventListeners();

      console.log('인수인계 모듈 초기화 완료');
    },

    /**
     * DOM 요소 참조 초기화
     */
    initDomRefs() {
      this.els = {
        // 필터 요소
        keywordInput: document.getElementById('searchKeyword'),
        noticeFilterBtn: document.getElementById('noticeFilterBtn'),
        allFilterBtn: document.getElementById('allFilterBtn'),

        // 버튼
        searchBtn: document.getElementById('searchBtn'),
        createBtn: document.getElementById('createBtn'),

        // 컨테이너
        noticeContainer: document.getElementById('noticeContainer'),
        handoverContainer: document.getElementById('handoverContainer'),

        // 페이지네이션
        pagination: document.getElementById('pagination'),
      };
    },

    /**
     * 이벤트 리스너 설정
     */
    initEventListeners() {
      // 인수인계 항목 클릭 이벤트
      const handoverItems = document.querySelectorAll('.handover-item');
      handoverItems.forEach((item) => {
        item.addEventListener('click', (e) => {
          // 클릭한 요소가 버튼인 경우 기본 동작 수행
          if (e.target.closest('button')) {
            return;
          }

          const handoverId = item.getAttribute('data-id');
          if (handoverId) {
            window.location.href = `/handover/${handoverId}`;
          }
        });
      });

      // 공지사항 필터 버튼
      if (this.els.noticeFilterBtn) {
        this.els.noticeFilterBtn.addEventListener('click', () => {
          this.toggleNoticeFilter(true);
        });
      }

      // 전체 보기 필터 버튼
      if (this.els.allFilterBtn) {
        this.els.allFilterBtn.addEventListener('click', () => {
          this.toggleNoticeFilter(false);
        });
      }

      // 검색 버튼
      if (this.els.searchBtn) {
        this.els.searchBtn.addEventListener('click', () => {
          this.searchHandover();
        });
      }

      // 검색 입력란 엔터 키 이벤트
      if (this.els.keywordInput) {
        this.els.keywordInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            this.searchHandover();
          }
        });
      }

      // 생성 버튼
      if (this.els.createBtn) {
        this.els.createBtn.addEventListener('click', () => {
          window.location.href = '/handover/create';
        });
      }
    },

    /**
     * 공지사항 필터 토글
     */
    toggleNoticeFilter(isNotice) {
      this.state.filters.isNotice = isNotice;

      // URL 쿼리스트링 생성
      const url = new URL(window.location.href);
      url.searchParams.set('is_notice', isNotice ? '1' : '');

      // 페이지 이동
      window.location.href = url.toString();
    },

    /**
     * 인수인계 검색
     */
    searchHandover() {
      if (!this.els.keywordInput) return;

      const keyword = this.els.keywordInput.value.trim();

      // URL 쿼리스트링 생성
      const url = new URL(window.location.href);

      if (keyword) {
        url.searchParams.set('keyword', keyword);
      } else {
        url.searchParams.delete('keyword');
      }

      // 페이지 이동
      window.location.href = url.toString();
    },
  };

  // 인수인계 모듈 초기화
  Handover.init();

  // 전역 접근을 위해 window에 할당
  window.Handover = Handover;
});
