/**
 * Links to landing-page sections ("#how", "#pricing"…) that work from any page:
 * on the home page they smooth-scroll; elsewhere they navigate to "/#how" (or "/en#how")
 * and the home page scrolls to the section once it has mounted (see pages/index.vue).
 */
export function useSectionNav() {
  const route = useRoute()
  const localePath = useLocalePath()
  const scrollTo = useSmoothScroll()

  const home = computed(() => localePath('/'))
  const isHome = computed(() => route.path === home.value || route.path === `${home.value}/`)

  const hrefFor = (hash: string) => (isHome.value ? hash : `${home.value}${hash}`)

  function go(hash: string) {
    if (isHome.value) scrollTo(hash)
    else navigateTo(hash === '#top' ? home.value : `${home.value}${hash}`)
  }

  return { isHome, hrefFor, go }
}
