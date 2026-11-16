// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@nuxtjs/i18n'],

  // Thai is the primary market: Thai at "/", English at "/en"
  i18n: {
    locales: [
      { code: 'th', language: 'th-TH', name: 'ไทย' },
      { code: 'en', language: 'en-US', name: 'English' },
    ],
    defaultLocale: 'th',
    strategy: 'prefix_except_default',
    // Absolute URL for hreflang/canonical links; set NUXT_PUBLIC_I18N_BASE_URL in production
    baseUrl: '',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'lr_lang',
      redirectOn: 'root',
    },
  },

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  runtimeConfig: {
    public: {
      // Strapi API base URL, overridden by NUXT_PUBLIC_API_BASE at runtime
      apiBase: '',
    },
  },

  app: {
    head: {
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
      meta: [{ name: 'theme-color', content: '#FFFCFA' }],
      link: [
        { rel: 'icon', type: 'image/png', href: '/favicon.png' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@200;300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap',
        },
      ],
    },
  },
})
