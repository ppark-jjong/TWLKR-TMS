// frontend/src/components/common/errorDisplay.js

/**
 * 공통 에러 표시 컴포넌트
 * 다양한 에러 상태와 로딩 상태를 시각적으로 표현
 * @module ErrorDisplay
 */

import React from 'react';
import { 
  makeStyles, 
  Paper, 
  Typography, 
  CircularProgress 
} from '@material-ui/core';
import { Error as ErrorIcon } from '@material-ui/icons';

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(3),
    textAlign: 'center',
    marginTop: theme.spacing(2)
  },
  icon: {
    fontSize: 48,
    marginBottom: theme.spacing(2),
    color: theme.palette.error.main
  },
  loading: {
    marginBottom: theme.spacing(2)
  }
}));

/**
 * @typedef {Object} ErrorDisplayProps
 * @property {boolean} loading - 로딩 상태
 * @property {string} error - 에러 메시지
 * @property {boolean} noData - 데이터 없음 상태
 */

const ErrorDisplay = ({ loading, error, noData }) => {
  const classes = useStyles();

  if (loading) {
    return (
      <Paper className={classes.root}>
        <CircularProgress className={classes.loading} />
        <Typography variant="h6">데이터를 불러오는 중입니다...</Typography>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper className={classes.root}>
        <ErrorIcon className={classes.icon} />
        <Typography variant="h6" color="error">
          {error}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          잠시 후 다시 시도해 주세요.
        </Typography>
      </Paper>
    );
  }

  if (noData) {
    return (
      <Paper className={classes.root}>
        <Typography variant="h6" color="textSecondary">
          조회된 데이터가 없습니다.
        </Typography>
      </Paper>
    );
  }

  return null;
};

export default ErrorDisplay;