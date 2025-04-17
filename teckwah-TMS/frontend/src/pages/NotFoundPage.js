/**
 * 404 Not Found 페이지 컴포넌트
 */
import React from 'react';
import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <MainLayout>
      <Result
        status="404"
        title="404"
        subTitle="요청하신 페이지를 찾을 수 없습니다"
        extra={
          <Button type="primary" onClick={() => navigate(-1)}>
            이전 페이지로 이동
          </Button>
        }
      />
    </MainLayout>
  );
};

export default NotFoundPage;
