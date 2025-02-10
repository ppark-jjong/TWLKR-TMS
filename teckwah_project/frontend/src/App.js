// src/App.js
import React from "react";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { theme } from "./styles/theme";
import AppRoutes from "./AppRoutes";

/**
 * 앱의 루트 컴포넌트
 * @returns {JSX.Element} 앱 컴포넌트
 */
const App = () => {
  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <CssBaseline />
          <AppRoutes />
        </LocalizationProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
