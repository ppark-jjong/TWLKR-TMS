// 모의 데이터 스크립트 (mock-data.js)

// 상태 및 유형 매핑 (다른 JS 파일에서 사용)
const statusMap = {
  WAITING: { text: '대기', color: 'orange' },
  IN_PROGRESS: { text: '진행', color: 'blue' },
  COMPLETE: { text: '완료', color: 'green' },
  ISSUE: { text: '이슈', color: 'red' },
  CANCEL: { text: '취소', color: 'gray' },
};

const typeMap = {
  DELIVERY: { text: '배송', color: 'blue' },
  RETURN: { text: '회수', color: 'purple' },
};

// 주소 목록
const addresses = [
  '경기도 성남시 분당구 황새울로 258번길 6, 1층 SK텔레콤',
  '서울특별시 강동구 상일로6길 55 나이스데이터빌딩 2층',
  '남부순환로260길 81 다원씨앤아이 203호',
  '경기도 고양시 덕양구 향동로 217 B동 7층',
  '경기도 화성시 삼성전자로 1-1 DSR-C타워 (18448)',
  '경기도 화성시 삼성전자로 1-1 (반월동) DSR-C 타워',
  '경기 용인시 기흥구 마북로240번길 17-9',
  '경기도 수원시 영통구 삼성로 130 슈퍼컴센터7층',
  '테헤란로 152 강남파이낸스센터 18층',
  '서울 구로구 디지털로30길 28 마리오타워 1313호',
];

// 고객 목록
const customers = [
  '최용석',
  '이승준',
  '강동훈',
  '김지원',
  '김재명',
  '김영수',
  '전상진',
  '황경연',
  '장요한',
  '박민수',
];

// 우편번호 목록
const postalCodes = [
  13595, 5288, 8803, 10545, 18448, 18448, 16891, 16678, 6236, 8389,
];

// SLA 옵션
const slaOptions = ['4HR(8X5)', '4HR(24X7)', 'PO2(24X7)', 'PO4(24X7)'];

// 운전기사 목록
const drivers = [
  '운전기사 1',
  '운전기사 2',
  '운전기사 3',
  '운전기사 4',
  '운전기사 5',
  '운전기사 6',
  '운전기사 7',
  '운전기사 8',
  '운전기사 9',
  '운전기사 10',
];

// 운전기사 연락처 목록
const driverContacts = [
  '010-1111-1111',
  '010-2222-2222',
  '010-3333-3333',
  '010-4444-4444',
  '010-5555-5555',
  '010-6666-6666',
  '010-7777-7777',
  '010-8888-8888',
  '010-9999-9999',
  '010-0000-0000',
];

// 무작위 날짜 생성 함수 (startDate와 endDate 사이)
function randomDate(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const randomTime =
    start.getTime() + Math.random() * (end.getTime() - start.getTime());
  const randomDate = new Date(randomTime);

  // YYYY-MM-DD HH:MM 형식으로 포맷팅
  const year = randomDate.getFullYear();
  const month = String(randomDate.getMonth() + 1).padStart(2, '0');
  const day = String(randomDate.getDate()).padStart(2, '0');
  const hours = String(randomDate.getHours()).padStart(2, '0');
  const minutes = String(randomDate.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// 모의 데이터 생성 함수
function generateMockData(count) {
  const data = [];

  for (let i = 0; i < count; i++) {
    const createTime = randomDate('2024-12-10', '2024-12-15');
    const departTime = randomDate(createTime, '2024-12-15');
    const completeTime = randomDate(departTime, '2024-12-15');
    const eta = randomDate(createTime, '2024-12-20');
    const updateAt = createTime;

    const addressIndex = Math.floor(Math.random() * addresses.length);
    const driverIndex = Math.floor(Math.random() * drivers.length);

    // 코드와 데이터 형식 통합을 위한 데이터 생성
    const item = {
      dashboard_id: i + 1, // 화면에서 참조하기 위한 ID
      order_no: '954564' + String(60000 + i).padStart(5, '0'),
      customer: customers[addressIndex % customers.length],
      type: 'DELIVERY',
      status: 'COMPLETE', // CSV 패턴에 맞춰 COMPLETE로 고정
      department: 'CS',
      warehouse: 'SEOUL',
      postal_code: postalCodes[addressIndex % postalCodes.length],
      address: addresses[addressIndex % addresses.length],
      eta: eta,
      driver_name: drivers[driverIndex],
      driver_contact: driverContacts[driverIndex],
      created_at: createTime,
      updated_at: updateAt,

      // dashboard.csv 형식의 추가 필드
      sla: slaOptions[Math.floor(Math.random() * slaOptions.length)],
      create_time: createTime,
      depart_time: departTime,
      complete_time: completeTime,
      city: '',
      district: '',
      region: '',
      distance: '',
      duration_time: '',
      contact: '',
      remark: Math.random() > 0.8 ? '문 앞 배송 후 연락 요망' : '',
      'driver_contact.1': '',
      update_at: updateAt,
    };

    data.push(item);
  }

  return data;
}

// 대시보드 데이터 생성 (다른 JS 파일에서 사용)
const dashboardData = generateMockData(50);

// 인수인계 모의 데이터
const handoverData = [
  {
    id: 1,
    title: '2024-12-10 주간 인수인계',
    content:
      '1. 김재명 고객 배송 건은 특별 관리 필요\n2. 서울창고 재고 부족 문제 해결 중\n3. 시스템 업데이트로 오후 6시 이후 배치 처리 불가능',
    created_by: '관리자',
    created_at: '2024-12-10 18:30',
    is_notice: true,
  },
  {
    id: 2,
    title: '시스템 점검 공지',
    content:
      '12월 15일 새벽 2시부터 4시까지 시스템 정기 점검이 있을 예정입니다. 해당 시간에는 시스템 이용이 제한됩니다.',
    created_by: '시스템 관리자',
    created_at: '2024-12-11 09:15',
    is_notice: true,
  },
  {
    id: 3,
    title: '오후 배송 지연 안내',
    content:
      '눈으로 인한 도로 상황 악화로 오후 배송이 지연되고 있습니다. 고객 문의 시 양해 안내 부탁드립니다.',
    created_by: '배송팀',
    created_at: '2024-12-12 14:20',
    is_notice: false,
  },
];

// 사용자 모의 데이터
const userData = [
  {
    user_id: 'admin',
    name: '관리자',
    user_password:
      '$2b$12$P6tQZsH1yJwZ4YC.2jF1D.ZBzplXEjzZm5y6.eBgeq6nXvh/TFIfi',
    user_department: '관리부',
    user_role: 'ADMIN',
    status: 'ACTIVE',
  },
  {
    user_id: 'user1',
    name: '홍길동',
    user_password:
      '$2b$12$P6tQZsH1yJwZ4YC.2jF1D.ZBzplXEjzZm5y6.eBgeq6nXvh/TFIfi',
    user_department: 'CS',
    user_role: 'USER',
    status: 'ACTIVE',
  },
  {
    user_id: 'user2',
    name: '김영희',
    user_password:
      '$2b$12$P6tQZsH1yJwZ4YC.2jF1D.ZBzplXEjzZm5y6.eBgeq6nXvh/TFIfi',
    user_department: 'HES',
    user_role: 'USER',
    status: 'ACTIVE',
  },
  {
    user_id: 'user3',
    name: '이철수',
    user_password:
      '$2b$12$P6tQZsH1yJwZ4YC.2jF1D.ZBzplXEjzZm5y6.eBgeq6nXvh/TFIfi',
    user_department: 'LENOVO',
    user_role: 'USER',
    status: 'INACTIVE',
  },
];
