// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@pinia/nuxt'],
  css: ['ol/ol.css', '~/assets/css/main.css'],
  devServer: {
    host: '127.0.0.1',
    port: 3003,
  },
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE ?? 'http://localhost:3000',
    },
  },
  vite: {
    optimizeDeps: {
      include: [
        'chart.js',
        'vue-chartjs',
        'date-fns',
        'date-fns/locale',
        'ol',
        'zod',
      ],
    },
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false }
})
