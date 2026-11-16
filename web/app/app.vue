<script setup lang="ts">
// Sets <html lang>, hreflang alternates and og:locale for the current locale
const head = useLocaleHead()
useHead(() => ({
  htmlAttrs: { lang: head.value.htmlAttrs?.lang },
  link: head.value.link,
  meta: head.value.meta,
}))
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtPage />
    <div class="grain-overlay" aria-hidden="true" />
  </div>
</template>
