export default defineConfig({
  // ... lo que ya tengas
  build: {
    minify: 'esbuild',
    // Evita que esbuild renombre top-level consts a nombres de 1 letra
    target: 'es2020',
  },
  esbuild: {
    // Alternativa más agresiva: no minificar nombres de variables
    keepNames: true,
  },
})
