import tailwindcss from '@tailwindcss/vite'

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
      healthUrl:
        process.env.NUXT_PUBLIC_HEALTH_URL ??
        'https://ledgera-4ut6.onrender.com/health',
    },
  },
  vite: {
    plugins: [
      tailwindcss(),
      {
        name: 'ledgera-fix-vue-router-devtools-null-instance',
        enforce: 'pre',
        transform(code, id) {
          if (!id.includes('/vue-router/dist/vue-router.js')) {
            return null;
          }

          return code.replace(
            'instance.__vrv_devtools = info;',
            'if (instance) instance.__vrv_devtools = info;',
          );
        },
      },
    ],
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
