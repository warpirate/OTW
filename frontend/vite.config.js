import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    // Use relative base so built assets work from subfolders (e.g., cPanel deployments)
    base: '/',
    
    // Define global constants for environment variables
    define: {
      __APP_ENV__: JSON.stringify(env.APP_ENV),
    },
    
    // Environment-specific configuration
    server: {
      port: 5173,
      host: true,
    },
    
    build: {
      outDir: 'dist',
      sourcemap: mode === 'development',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            router: ['react-router-dom'],
          },
        },
      },
    },
  };
})