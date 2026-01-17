export const config = {
  apiUrl: import.meta.env.VITE_API_URL || 
    import.meta.env.PROD 
      ? 'https://space-conquest-production.up.railway.app' 
      : 'http://localhost:8080',
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  mode: import.meta.env.MODE,
} as const;

// Helper pour construire les URLs d'API
export const apiUrl = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${config.apiUrl}/${cleanPath}`;
};

// DEBUG LOG (à supprimer après)
console.log('🔧 API URL:', config.apiUrl, 'Mode:', config.mode);

// Exemple d'utilisation:
// fetch(apiUrl('config')) → https://space-conquest-production.up.railway.app/config ✅
