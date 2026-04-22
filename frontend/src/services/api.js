import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

export const getFilters = async () => {
  const response = await axios.get(`${API_BASE_URL}/filters`);
  return response.data;
};

export const getCompanies = async () => {
  const response = await axios.get(`${API_BASE_URL}/companies`);
  return response.data.companies || [];
};

export const getAreas = async (company = null) => {
  const params = {};
  if (company && company !== 'All Companies') params.company = company;
  const response = await axios.get(`${API_BASE_URL}/areas`, { params });
  return response.data.areas || ['All Areas'];
};

export const getTimeSeriesData = async (crop, soil, categories = null, type = null, company = null, area = null) => {
  const params = { crop, soil };
  if (categories && categories.length > 0) {
    if (Array.isArray(categories)) {
      params.categories = categories.join(',');
    } else if (categories !== 'All') {
      params.categories = categories;
    }
  }
  if (type) params.type = type;
  if (company && company !== 'All Companies') params.company = company;
  if (area && area !== 'All Areas') params.area = area;
  const response = await axios.get(`${API_BASE_URL}/data`, { params });
  return response.data.data;
};

export const getSummaryStats = async (crop, soil, categories = null, type = null, company = null, area = null) => {
  const params = { crop, soil };
  if (categories && categories.length > 0) {
    if (Array.isArray(categories)) {
      params.categories = categories.join(',');
    } else if (categories !== 'All') {
      params.categories = categories;
    }
  }
  if (type) params.type = type;
  if (company && company !== 'All Companies') params.company = company;
  if (area && area !== 'All Areas') params.area = area;
  const response = await axios.get(`${API_BASE_URL}/summary`, { params });
  return response.data.summary;
};

export const getDateRange = async (crop, soil, company = null, area = null) => {
  const params = { crop, soil };
  if (company && company !== 'All Companies') params.company = company;
  if (area && area !== 'All Areas') params.area = area;
  const response = await axios.get(`${API_BASE_URL}/date-range`, { params });
  return response.data.windows || [];
};

export const getCategories = async (crop, soil, type = null) => {
  const params = { crop, soil };
  if (type) params.type = type;
  const response = await axios.get(`${API_BASE_URL}/categories`, { params });
  return response.data.categories;
};

export const getAllCategories = async () => {
  const response = await axios.get(`${API_BASE_URL}/all-categories`);
  return response.data;
};

export const getSoilTrajectory = async (crop, soil) => {
  const response = await axios.get(`${API_BASE_URL}/soil-trajectory`, {
    params: { crop, soil },
  });
  return response.data;
};

export const getPlantTrajectory = async (crop, soil) => {
  const response = await axios.get(`${API_BASE_URL}/plant-trajectory`, {
    params: { crop, soil },
  });
  return response.data;
};

export const getBenchmarks = async (crop, soil, categories = null, company = null, area = null) => {
  const params = { crop, soil };
  if (categories && categories.length > 0) {
    if (Array.isArray(categories)) {
      params.categories = categories.join(',');
    } else if (categories !== 'All') {
      params.categories = categories;
    }
  }
  if (company && company !== 'All Companies') params.company = company;
  if (area && area !== 'All Areas') params.area = area;
  const response = await axios.get(`${API_BASE_URL}/benchmarks`, { params });
  return response.data;
};
