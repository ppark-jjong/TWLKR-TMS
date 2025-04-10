// src/pages/NotFoundPage.js
import React from 'react';
import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <Result
      status="404"
      title="404"
      subTitle="존재하지 않는 페이지입니다."
      extra={
        <Button type="primary" onClick={() => navigate('/dashboard')}>
          대시보드로 돌아가기
        </Button>
      }
    />
  );
};

export default NotFoundPage;