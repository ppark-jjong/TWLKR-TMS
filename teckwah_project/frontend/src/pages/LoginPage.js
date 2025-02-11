// frontend/src/pages/LoginPage.js

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  makeStyles
} from '@material-ui/core';
import AuthService from '../services/authService';

const useStyles = makeStyles((theme) => ({
  container: {
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  paper: {
    padding: theme.spacing(4),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    maxWidth: 400
  },
  logo: {
    marginBottom: theme.spacing(3),
    width: 150
  },
  form: {
    width: '100%',
    marginTop: theme.spacing(1)
  },
  submit: {
    margin: theme.spacing(3, 0, 2)
  }
}));

const LoginPage = () => {
  const classes = useStyles();
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({ user_id: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await AuthService.login(credentials);
      navigate('/dashboard');
    } catch (error) {
      setError('로그인에 실패했습니다.');
    }
  };

  return (
    <Container className={classes.container}>
      <Paper elevation={3} className={classes.paper}>
        <img src="/logo.png" alt="Logo" className={classes.logo} />
        <Typography component="h1" variant="h5">
          로그인
        </Typography>
        <form className={classes.form} onSubmit={handleSubmit}>
          <TextField
            variant="outlined"
            margin="normal"
            required
            fullWidth
            label="아이디"
            name="user_id"
            autoFocus
            value={credentials.user_id}
            onChange={(e) => setCredentials({
              ...credentials,
              user_id: e.target.value
            })}
          />
          <TextField
            variant="outlined"
            margin="normal"
            required
            fullWidth
            name="password"
            label="비밀번호"
            type="password"
            value={credentials.password}
            onChange={(e) => setCredentials({
              ...credentials,
              password: e.target.value
            })}
          />
          {error && (
            <Typography color="error" align="center">
              {error}
            </Typography>
          )}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            className={classes.submit}
          >
            로그인
          </Button>
        </form>
      </Paper>
    </Container>
  );
};

export default LoginPage;