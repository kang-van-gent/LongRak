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
    // Server-only (never sent to the browser). The /ai-check page posts to /api/ai-check,
    // which forwards to this n8n webhook. Empty = analysis not enabled yet (the page says so).
    n8nWebhookUrl: '', // NUXT_N8N_WEBHOOK_URL
    n8nWebhookSecret: '', // NUXT_N8N_WEBHOOK_SECRET — sent as the X-LongRak-Secret header (both webhooks)
    // LongRak Strapi API (server/), called server-side only. Token = Strapi API token of type
    // "Custom" with just: Lead → submit, Analysis-session → record. Empty = not connected.
    strapiUrl: '', // NUXT_STRAPI_URL, e.g. http://server:1337 inside docker compose
    strapiToken: '', // NUXT_STRAPI_TOKEN
    ipHashSalt: '', // NUXT_IP_HASH_SALT — salt for hashing visitor IPs in consent receipts
    // "Request a project" after a check (email + role + analysis id). Empty = not enabled yet.
    n8nProjectWebhookUrl: '', // NUXT_N8N_PROJECT_WEBHOOK_URL
    n8nTimeoutMs: 120000, // NUXT_N8N_TIMEOUT_MS
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
