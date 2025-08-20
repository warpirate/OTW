const environment = {
  development: {
    frontend: {
      url: 'http://localhost:3000',
      apiUrl: 'http://localhost:5000/api'
    },
    backend: {
      url: 'http://localhost:5000',
      apiUrl: 'http://localhost:5000/api',
      uploadsUrl: 'http://localhost:5000/uploads'
    }
  },
  production: {
    frontend: {
      url: 'https://your-frontend-domain.com',
      apiUrl: 'https://your-backend-domain.com/api'
    },
    backend: {
      url: 'https://your-backend-domain.com',
      apiUrl: 'https://your-backend-domain.com/api',
      uploadsUrl: 'https://your-backend-domain.com/uploads'
    }
  }
};

const currentEnvironment = process.env.NODE_ENV || 'development';

export const config = environment[currentEnvironment];
export default config;
