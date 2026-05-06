import { environment } from '../../environments/environment';

// Cambiamos la URL de Railway por la IP de tu Gateway de Azure
export const API_BASE_URL = 'http://172.214.17.219/api'; 

export const STORAGE_KEYS = {
  token: 'macacos_token',
  user: 'macacos_user',
} as const;