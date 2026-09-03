import { readFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const brandIcon = path.resolve(__dirname, '../Logo/logo_icon.png');

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'ht-studio-branding',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'logo_icon.png', source: readFileSync(brandIcon) });
      }
    }
  ],
  root: 'src/renderer',
  publicDir: false,
  base: './',
  build: { outDir: '../../build/renderer', emptyOutDir: false }
});
