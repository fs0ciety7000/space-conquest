export const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8080',
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
} as const;

// Helper pour construire les URLs d'API
export const apiUrl = (path: string): string => {
  // Retire le slash initial si présent
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${config.apiUrl}/${cleanPath}`;
};

// Exemple d'utilisation:
// import { apiUrl } from '@/config/api';
// fetch(apiUrl('planets/123'))
