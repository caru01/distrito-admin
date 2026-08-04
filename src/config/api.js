const configuredBaseUrl = (import.meta.env.VITE_API_URL || '').trim();
const runtimeBaseUrl = typeof window === 'undefined'
  ? 'http://localhost:3001'
  : `${window.location.protocol}//${window.location.hostname}:${import.meta.env.VITE_API_PORT || '3001'}`;

export const BASE_URL = (
  configuredBaseUrl && configuredBaseUrl !== 'auto' ? configuredBaseUrl : runtimeBaseUrl
).replace(/\/$/, '');
export const API_URL = `${BASE_URL}/api/pedidos`;

const configuredStorefrontUrl = (import.meta.env.VITE_STOREFRONT_URL || '').trim();
const runtimeStorefrontUrl = typeof window === 'undefined'
  ? 'http://localhost:5173'
  : `${window.location.protocol}//${window.location.hostname}:${import.meta.env.VITE_STOREFRONT_PORT || '5173'}`;

export const STOREFRONT_URL = (
  configuredStorefrontUrl && configuredStorefrontUrl !== 'auto'
    ? configuredStorefrontUrl
    : runtimeStorefrontUrl
).replace(/\/$/, '');
