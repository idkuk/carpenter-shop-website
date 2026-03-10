const DEFAULT_API_BASE_URL = 'http://localhost:5000/api';

const trimTrailingSlash = (value) => value.replace(/\/+$/, '');

export const getApiBaseUrl = () => trimTrailingSlash(process.env.REACT_APP_API_URL || DEFAULT_API_BASE_URL);

export const getAssetBaseUrl = () => getApiBaseUrl().replace(/\/api$/, '');

export const getAssetUrl = (value) => {
  if (!value) return '';
  if (/^[a-z]+:/i.test(value)) return value;

  const normalizedPath = value.startsWith('/') ? value : `/${value}`;
  return `${getAssetBaseUrl()}${normalizedPath}`;
};
