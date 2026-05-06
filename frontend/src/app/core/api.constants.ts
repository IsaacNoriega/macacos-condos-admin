import { environment } from '../../environments/environment';

// Cambiamos la URL de Railway por la IP de tu Gateway de Azure
export const API_BASE_URL = 'https://macacos-api.eastus.cloudapp.azure.com/api'; 

export const STORAGE_KEYS = {
  token: 'macacos_token',
  user: 'macacos_user',
} as const;