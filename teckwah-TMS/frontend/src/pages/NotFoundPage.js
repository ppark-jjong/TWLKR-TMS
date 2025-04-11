import React from 'react';
import { Result, Button } from 'antd';
import { Link } from 'react-router-dom';

/**
 * 404 페이지 컴포넌트
 * 존재하지 않는 페이지 접근 시 표시
 */
const NotFoundPage = () => (
  <Result
    status="404"
    title="404"
    subTitle="요청하신 페이지를 찾을 수 없습니다."
    extra={
      <Link to="/">
        <Button type="primary">홈으로 돌아가기</Button>
      </Link>
    }
  />
);

export default NotFoundPage;
