import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base relativa para funcionar no GitHub Pages em qualquer nome de repositório
export default defineConfig({
  base: './',
  plugins: [react()],
  test: { environment: 'node' },
} as any)
