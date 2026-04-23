import { environment } from '../../environments/environment';

export const API_BASE_URL = environment.apiBaseUrl;

export const STORAGE_KEYS = {
  token: 'macacos_token',
  user: 'macacos_user',
} as const;
