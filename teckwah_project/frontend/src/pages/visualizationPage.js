// frontend/src/pages/visualizationPage.js

/**
 * 시각화 페이지 컴포넌트
 * 배송 현황 및 시간대별 접수량 차트 표시
 * @module VisualizationPage
 */

import React, { useState, useEffect } from 'react';
import {
  makeStyles,
  Paper,
  Grid,
  Typography,
  MenuItem,
  TextField
} from '@material-ui/core';
import { DateRangePicker } from '@material-ui/pickers';
import { subDays } from 'date-fns';
import StatusChart from '../components/visualization/statusChart';
import HourlyChart from '../components/visualization/hourlyChart';
import ErrorDisplay from '../components/common/ErrorDisplay';
import VisualizationService from '../services/visualizationService';

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(3)
  },
  paper: {
    padding: theme.spacing(3),
    height: '100%'
  },
  header: {
    marginBottom: theme.spacing(3),
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  chartContainer: {
    height: 400,
    marginTop: theme.spacing(3)
  }
}));

const CHART_TYPES = [
  { value: 'status', label: '배송 현황' },
  { value: 'hourly', label: '시간별 접수량' }
];

const VisualizationPage = () => {
  const classes = useStyles();
  const [chartType, setChartType] = useState('status');
  const [dateRange, setDateRange] = useState([
    subDays(new Date(), 7),
    new Date()
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError('');

    try {
      const [startDate, endDate] = dateRange.map(date => 
        date.toISOString().split('T')[0]
      );

      let response;
      if (chartType === 'status') {
        response = await VisualizationService.getDeliveryStatus(startDate, endDate);
      } else {
        response = await VisualizationService.getHourlyVolume(startDate, endDate);
      }
      setData(response);
    } catch (error) {
      setError('데이터 조회 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [chartType, dateRange]);

  return (
    <div className={classes.root}>
      <Paper className={classes.paper}>
        <div className={classes.header}>
          <Typography variant="h6">배송 데이터 시각화</Typography>
          <Grid container spacing={2} justify="flex-end">
            <Grid item>
              <TextField
                select
                label="차트 유형"
                value={chartType}
                onChange={(e) => setChartType(e.target.value)}
                variant="outlined"
                size="small"
              >
                {CHART_TYPES.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item>
              <DateRangePicker
                value={dateRange}
                onChange={setDateRange}
                disableFuture
                maxDate={new Date()}
                minDate={subDays(new Date(), 30)}
              />
            </Grid>
          </Grid>
        </div>

        {loading || error ? (
          <ErrorDisplay
            loading={loading}
            error={error}
          />
        ) : (
          <div className={classes.chartContainer}>
            {chartType === 'status' ? (
              <StatusChart data={data} />
            ) : (
              <HourlyChart data={data} />
            )}
          </div>
        )}
      </Paper>
    </div>
  );
};

export default VisualizationPage;