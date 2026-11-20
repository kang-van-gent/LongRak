<script setup lang="ts">
import { gsap } from 'gsap'

const root = ref<HTMLElement | null>(null)
const open = ref(false)
const { isHome, hrefFor, go: goSection } = useSectionNav()
const localePath = useLocalePath()
const route = useRoute()
const onChecker = computed(() => route.path === localePath('/ai-check'))

const { locale, locales } = useI18n()
const switchLocalePath = useSwitchLocalePath()

const t = useCopy({
  th: {
    links: [
      { href: '#why', label: 'ทำไมต้อง LongRak' },
      { href: '#report', label: 'ตัวอย่างรายงาน' },
      { href: '#how', label: 'วิธีทำงาน' },
      { href: '#pricing', label: 'ราคา' },
      { href: '#faq', label: 'คำถาม' },
    ],
    skip: 'ข้ามไปยังเนื้อหา',
    home: 'LongRak หลงรัก — กลับด้านบน',
    nav: 'เมนูหลัก',
    navMobile: 'เมนูมือถือ',
    cta: 'ลองตรวจเอกสารฟรี',
    ctaShort: 'ลองฟรี',
    checker: 'ตรวจเอกสารด้วย AI',
    open: 'เปิดเมนู',
    close: 'ปิดเมนู',
    lang: 'เลือกภาษา',
  },
  en: {
    links: [
      { href: '#why', label: 'Why LongRak' },
      { href: '#report', label: 'Sample report' },
      { href: '#how', label: 'How it works' },
      { href: '#pricing', label: 'Pricing' },
      { href: '#faq', label: 'FAQ' },
    ],
    skip: 'Skip to content',
    home: 'LongRak — back to top',
    nav: 'Main menu',
    navMobile: 'Mobile menu',
    cta: 'Check a document free',
    ctaShort: 'Try free',
    checker: 'AI document check',
    open: 'Open menu',
    close: 'Close menu',
    lang: 'Choose language',
  },
})
const links = computed(() => t.value.links)
const otherLocales = computed(() => locales.value.map((l) => ({ code: l.code, name: l.name ?? l.code })))

function go(href: string) {
  open.value = false
  goSection(href)
}

// ---- Active menu (scroll-spy) on the home page
// Each nav item also covers the sections that follow it until the next item.
const sectionGroups: Record<string, string[]> = {
  '#why': ['why', 'pillars'],
  '#report': ['report'],
  '#how': ['how', 'ledger'],
  '#pricing': ['pricing', 'trust'],
  '#faq': ['faq'],
}
const active = ref('')
let raf = 0
function spy() {
  raf = 0
  const line = window.innerHeight * 0.45
  let current = ''
  for (const [href, ids] of Object.entries(sectionGroups)) {
    for (const id of ids) {
      const el = document.getElementById(id)
      if (!el) continue
      // pinned sections are measured by their pin spacer (their real scroll range)
      const box = el.parentElement?.classList.contains('pin-spacer') ? el.parentElement : el
      const r = box.getBoundingClientRect()
      if (r.top <= line && r.bottom > line) current = href
    }
  }
  active.value = current
}
const onScroll = () => { if (!raf) raf = requestAnimationFrame(spy) }
watch(isHome, (home) => {
  if (!home) active.value = ''
}, { immediate: true })
onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
  spy()
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
  cancelAnimationFrame(raf)
})

// Reading-progress foil line, scrubbed to the whole document (in and out)
useScene(root, () => {
  gsap.fromTo(
    '.hdr-progress',
    { scaleX: 0 },
    {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: { trigger: document.documentElement, start: 'top top', end: 'bottom bottom', scrub: true },
    },
  )
  // Header compacts as soon as the hero starts moving
  gsap.to('.hdr-shell', {
    paddingTop: 8,
    paddingBottom: 8,
    ease: 'none',
    scrollTrigger: { trigger: document.documentElement, start: 'top top', end: '+=240', scrub: true },
  })
})
</script>

<template>
  <header ref="root" class="fixed inset-x-0 top-0 z-50 px-3 pt-3 md:px-6 md:pt-4">
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded-full focus:bg-navy-900 focus:px-4 focus:py-2 focus:text-paper"
    >{{ t.skip }}</a>

    <div class="hdr-shell glass relative mx-auto flex max-w-7xl items-center justify-between gap-4 overflow-hidden rounded-full border border-white/70 py-3 pl-4 pr-3 shadow-[0_8px_40px_-20px_rgba(19,45,80,.35)] md:pl-6">
      <a :href="hrefFor('#top')" class="flex shrink-0 items-center gap-2" :aria-label="t.home" @click.prevent="go('#top')">
        <img src="/brand/longrak-mark.webp" alt="" width="46" height="38" class="h-9 w-auto">
        <img src="/brand/longrak-wordmark.webp" alt="LongRak" width="120" height="32" class="hidden h-6 w-auto sm:block">
      </a>

      <nav :aria-label="t.nav" class="hidden xl:block">
        <ul class="flex items-center gap-1">
          <li v-for="l in links" :key="l.href">
            <a
              :href="hrefFor(l.href)"
              class="relative block rounded-full px-4 py-2 text-[14px] transition-colors duration-500"
              :class="active === l.href ? 'bg-white text-navy-900 shadow-[0_6px_20px_-12px_rgba(19,45,80,.45)]' : 'text-navy-700 hover:bg-white/80 hover:text-navy-900'"
              :aria-current="active === l.href ? 'location' : undefined"
              @click.prevent="go(l.href)"
            >
              {{ l.label }}
              <!-- active marker: gold dot under the label -->
              <span
                class="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-gold-500 transition-all duration-500"
                :class="active === l.href ? 'scale-100 opacity-100' : 'scale-0 opacity-0'"
                aria-hidden="true"
              />
            </a>
          </li>
        </ul>
      </nav>

      <div class="flex items-center gap-2">
        <!-- Language switch: TH / EN -->
        <div class="flex items-center rounded-full border border-navy-900/10 bg-white/50 p-0.5 font-mono text-[11px] tracking-[0.12em]" role="group" :aria-label="t.lang">
          <NuxtLink
            v-for="l in otherLocales"
            :key="l.code"
            :to="switchLocalePath(l.code)"
            :hreflang="l.code"
            :lang="l.code"
            :aria-current="l.code === locale ? 'true' : undefined"
            :aria-label="l.name"
            class="rounded-full px-2.5 py-1.5 uppercase transition-colors duration-300"
            :class="l.code === locale ? 'bg-navy-900 text-paper' : 'text-navy-700 hover:text-navy-900'"
          >{{ l.code }}</NuxtLink>
        </div>
        <!-- below 360px there is no room: the hero CTA sits right under the header anyway -->
        <NuxtLink
          :to="localePath('/ai-check')"
          class="btn-primary group !py-2.5 !text-[14px] max-[359px]:!hidden"
          :class="onChecker ? 'ring-2 ring-gold-500/70 ring-offset-2 ring-offset-paper' : ''"
          :aria-current="onChecker ? 'page' : undefined"
          @click="open = false"
        >
          <span class="max-sm:hidden">{{ t.cta }}</span>
          <span class="sm:hidden">{{ t.ctaShort }}</span>
          <HIcon :name="onChecker ? 'sparks' : 'arrow-right'" :size="18" :class="onChecker ? 'icon-twinkle text-gold-300' : 'icon-nudge'" />
        </NuxtLink>
        <button
          type="button"
          class="grid size-10 place-items-center rounded-full text-navy-900 hover:bg-white/80 xl:hidden"
          :aria-expanded="open"
          aria-controls="mobile-nav"
          :aria-label="open ? t.close : t.open"
          @click="open = !open"
        >
          <HIcon :name="open ? 'times' : 'bars'" />
        </button>
      </div>

      <!-- scroll progress -->
      <span
        class="hdr-progress pointer-events-none absolute inset-x-6 bottom-0 h-[2px] origin-left rounded-full bg-gradient-to-r from-gold-500 via-coral-500 to-peach-400"
        aria-hidden="true"
      />
    </div>

    <Transition
      enter-active-class="transition duration-500 ease-luxe"
      enter-from-class="opacity-0 -translate-y-3"
      leave-active-class="transition duration-300"
      leave-to-class="opacity-0 -translate-y-3"
    >
      <nav v-if="open" id="mobile-nav" :aria-label="t.navMobile" class="glass mx-auto mt-2 max-w-7xl rounded-3xl border border-white/70 p-3 xl:hidden">
        <NuxtLink
          :to="localePath('/ai-check')"
          class="flex items-center justify-between rounded-2xl px-4 py-3"
          :class="onChecker ? 'bg-navy-900 text-paper' : 'text-navy-900 hover:bg-white/80'"
          :aria-current="onChecker ? 'page' : undefined"
          @click="open = false"
        >
          {{ t.checker }}<HIcon name="sparks" :size="18" :class="onChecker ? 'text-gold-300' : 'text-gold-600'" />
        </NuxtLink>
        <a
          v-for="l in links"
          :key="l.href"
          :href="hrefFor(l.href)"
          class="flex items-center justify-between rounded-2xl px-4 py-3 transition-colors"
          :class="active === l.href ? 'bg-white text-navy-900' : 'text-navy-900 hover:bg-white/80'"
          :aria-current="active === l.href ? 'location' : undefined"
          @click.prevent="go(l.href)"
        >
          {{ l.label }}
          <span v-if="active === l.href" class="size-1.5 rounded-full bg-gold-500" aria-hidden="true" />
        </a>
      </nav>
    </Transition>
  </header>
</template>
