export const config = {
  apiUrl: import.meta,
//  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8080',
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  mode: import.meta.env.MODE,
} as const;

// Helper pour construire les URLs d'API
export const apiUrl = (path: string): string => {
  // Retire le slash initial si présent
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${config.apiUrl}/${cleanPath}`;
};

// Log de la configuration en développement
if (config.isDevelopment) {
  console.log('🔧 Configuration API:', {
    apiUrl: config.apiUrl,
    environment: config.mode,
  });
}