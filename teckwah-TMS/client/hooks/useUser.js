import { useState, useEffect } from 'react';
import { getUserFromToken } from '../utils/authHelpers';
import { useQuery } from '@tanstack/react-query';
import { checkSession } from '../utils/api';

/**
 * 현재 인증된 사용자 정보를 제공하는 훅
 * @returns {{user: object, isAdmin: boolean, isLoading: boolean, error: object}}
 */
const useUser = () => {
  const [user, setUser] = useState(null);

  // 세션 체크 쿼리
  const { data, isLoading, error } = useQuery({
    queryKey: ['user-session'],
    queryFn: checkSession,
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    // 로컬 토큰에서 사용자 정보 가져오기
    const userFromToken = getUserFromToken();

    // 세션 체크 응답이 왔을 때 업데이트
    if (data) {
      setUser(data.data);
    } else if (userFromToken) {
      setUser(userFromToken);
    }
  }, [data]);

  // 관리자 여부 체크
  const isAdmin = user?.user_role === 'ADMIN';

  return {
    user,
    isAdmin,
    isLoading,
    error,
  };
};

export default useUser;
