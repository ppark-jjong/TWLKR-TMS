// frontend/src/index.js
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import 'antd/dist/reset.css';

// React 18의 새로운 createRoot API 사용
const container = document.getElementById('root');
const root = createRoot(container);

// 환경에 따라 정적 파일 경로 설정
const STATIC_URL = process.env.NODE_ENV === 'production' ? '/static/' : '/static/';

root.render(
  <React.StrictMode>
    <App staticUrl={STATIC_URL} />
  </React.StrictMode>
);