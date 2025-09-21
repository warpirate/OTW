import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Use relative base so built assets work from subfolders (e.g., cPanel deployments)
  base: '/',
})