import type { RouterConfig } from '@nuxt/schema'

/**
 * Scrolling between pages. Hash links ("/#how") are handled by pages/index.vue,
 * because pinned GSAP scenes need their real scroll positions — the router's own
 * "scroll to element" would land in the wrong place.
 */
export default <RouterConfig>{
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return false
    return { top: 0 }
  },
}
