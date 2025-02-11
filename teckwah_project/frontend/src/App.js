// frontend/src/App.js

/**
 * 애플리케이션의 최상위 컴포넌트
 * 라우팅 및 전역 설정을 관리
 * @module App
 */

import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@material-ui/core/styles';
import { LocalizationProvider } from '@material-ui/pickers';
import DateFnsUtils from '@date-io/date-fns';
import koLocale from 'date-fns/locale/ko';
import Routes from './routes';

// Material-UI 테마 커스터마이징
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#63a4ff',
      dark: '#004ba0'
    },
    secondary: {
      main: '#388e3c',
      light: '#6abf69',
      dark: '#00600f'
    },
    error: {
      main: '#d32f2f'
    },
    background: {
      default: '#f5f5f5'
    }
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif'
    ].join(',')
  },
  overrides: {
    MuiTableCell: {
      head: {
        fontWeight: 'bold',
        backgroundColor: '#f5f5f5'
      }
    }
  }
});

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={DateFnsUtils} locale={koLocale}>
        <BrowserRouter>
          <Routes />
        </BrowserRouter>
      </LocalizationProvider>
    </ThemeProvider>
  );
};

export default App;