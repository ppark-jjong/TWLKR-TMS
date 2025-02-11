// frontend/src/index.js

/**
 * 애플리케이션 진입점
 * 전역 스타일 및 설정 적용
 * @module index
 */

import React from 'react';
import ReactDOM from 'react-dom';
import CssBaseline from '@material-ui/core/CssBaseline';
import App from './App';

// 전역 스타일 정의
import './styles/global.css';

// 액시오스 인터셉터 설정
import './services/mainApi';

// API 오류 시 전역 에러 핸들러
window.onerror = function(message, source, lineno, colno, error) {
  console.error('Global error handler:', { message, source, lineno, colno, error });
  // 필요시 에러 로깅 서비스 연동
};

ReactDOM.render(
  <React.StrictMode>
    <CssBaseline />
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);