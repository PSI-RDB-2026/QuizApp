import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    // base must point to the hosting URL when deploying to GitHub Pages.
    // For a project site the path is "/<repo-name>/". Use a relative base if you
    // want the build to work from any folder.
    //
    // See https://vitejs.dev/guide/static-deploy.html#github-pages
    base: process.env.NODE_ENV === 'production' ? '/QuizApp/' : '/',
  };
});
