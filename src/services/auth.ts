import axios from 'axios';

const API_URL = '/api/auth/';

export const signup = async (userData: any) => {
  const response = await axios.post(API_URL + 'signup', userData);
  return response.data;
};

export const login = async (userData: any) => {
  const response = await axios.post(API_URL + 'login', userData);
  return response.data;
};

export const logout = async () => {
  const response = await axios.post(API_URL + 'logout');
  return response.data;
};

export const getMe = async () => {
  const response = await axios.get(API_URL + 'me');
  return response.data;
};

export const updateOnboarding = async (data: any) => {
  const response = await axios.put(API_URL + 'onboarding', data);
  return response.data;
};
