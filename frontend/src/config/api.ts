// 🎯 Configuration multi-environnements
const API_URLS = {
  development: 'http://localhost:8080',
  render: 'https://space-conquest.onrender.com',  // à remplacer après déploiement
  railway: 'https://space-conquest-production.up.railway.app',
} as const;

export const config = {
  // Priorité: VITE_API_URL > PROD (Render/Railway) > DEV (localhost)
  apiUrl: import.meta.env.VITE_API_URL || 
    (import.meta.env.PROD 
      ? API_URLS.render  // Production par défaut = Render
      : API_URLS.development),
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  mode: import.meta.env.MODE,
} as const;

// Helper pour construire les URLs d'API
export const apiUrl = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${config.apiUrl}/${cleanPath}`;
};

// Log configuration (dev uniquement)
if (config.isDevelopment) {
  console.log('🔧 API Config:', {
    url: config.apiUrl,
    mode: config.mode,
    env: import.meta.env.VITE_API_URL || 'default',
  });
}

// Exemples d'utilisation:
// fetch(apiUrl('planets/123'))  // http://localhost:8080/planets/123 (dev)
// fetch(apiUrl('/config'))      // https://space-conquest.onrender.com/config (prod)
