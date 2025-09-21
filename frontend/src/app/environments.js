// Build URLs from Vite env with safe fallbacks
const ENV = import.meta.env || {};
const baseRoot = ENV.VITE_API_BASE_URL || window.location.origin;

const environment = {
  development: {
    backend: {
      url: baseRoot,
      apiUrl: `${baseRoot}/api`,
      uploadsUrl: `${baseRoot}/uploads`
    }
  },
  production: {
    backend: {
      url: baseRoot,
      apiUrl: `${baseRoot}/api`,
      uploadsUrl: `${baseRoot}/uploads`
    }
  }
};

const currentEnvironment = ENV.MODE || (location.hostname === 'localhost' ? 'development' : 'production');

export const config = environment[currentEnvironment] || environment.production;
export default config;
