// 인증 상태 확인 후 리다이렉션 처리하는 네비게이션 가드
router.beforeEach((to, from, next) => {
  // 현재 로그인 상태 확인
  const isLoggedIn = !!localStorage.getItem('accessToken');
  console.log(
    `라우팅: ${from.path} -> ${to.path} (로그인 상태: ${isLoggedIn})`
  );

  // 로그인이 필요한 페이지들 목록
  const authRequiredPages = ['/dashboard', '/settings', '/profile'];

  // '/dashboard'로 시작하는 모든 경로도 인증 필요
  const needsAuth =
    authRequiredPages.includes(to.path) || to.path.startsWith('/dashboard/');

  // 인증이 필요한 페이지인데 로그인이 안 된 경우 -> 로그인 페이지로 리다이렉션
  if (needsAuth && !isLoggedIn) {
    console.log('인증 필요: 로그인 페이지로 리다이렉션');
    next('/login');
    return;
  }

  // 이미 로그인된 상태에서 로그인 페이지로 이동 시 -> 대시보드로 리다이렉션
  if ((to.path === '/login' || to.path === '/register') && isLoggedIn) {
    console.log('이미 로그인됨: 대시보드로 리다이렉션');
    next('/dashboard/list');
    return;
  }

  // 그 외의 경우 정상적으로 라우팅 진행
  next();
});
