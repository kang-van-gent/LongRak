<script setup lang="ts">
import { gsap } from 'gsap'

const root = ref<HTMLElement | null>(null)
const open = ref(false)
const scrollTo = useSmoothScroll()

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
    open: 'Open menu',
    close: 'Close menu',
    lang: 'Choose language',
  },
})
const links = computed(() => t.value.links)
const otherLocales = computed(() => locales.value.map((l) => ({ code: l.code, name: l.name ?? l.code })))

function go(href: string) {
  open.value = false
  scrollTo(href)
}

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
      <a href="#top" class="flex shrink-0 items-center gap-2" :aria-label="t.home" @click.prevent="go('#top')">
        <img src="/brand/longrak-mark.webp" alt="" width="46" height="38" class="h-9 w-auto">
        <img src="/brand/longrak-wordmark.webp" alt="LongRak" width="120" height="32" class="hidden h-6 w-auto sm:block">
      </a>

      <nav :aria-label="t.nav" class="hidden lg:block">
        <ul class="flex items-center gap-1">
          <li v-for="l in links" :key="l.href">
            <a
              :href="l.href"
              class="rounded-full px-4 py-2 text-[14px] text-navy-700 transition-colors hover:bg-white/80 hover:text-navy-900"
              @click.prevent="go(l.href)"
            >{{ l.label }}</a>
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
        <a href="#report" class="btn-primary group !py-2.5 !text-[14px] max-[359px]:!hidden" @click.prevent="go('#report')">
          <span class="max-sm:hidden">{{ t.cta }}</span>
          <span class="sm:hidden">{{ t.ctaShort }}</span>
          <HIcon name="arrow-right" :size="18" class="icon-nudge" />
        </a>
        <button
          type="button"
          class="grid size-10 place-items-center rounded-full text-navy-900 hover:bg-white/80 lg:hidden"
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
      <nav v-if="open" id="mobile-nav" :aria-label="t.navMobile" class="glass mx-auto mt-2 max-w-7xl rounded-3xl border border-white/70 p-3 lg:hidden">
        <a
          v-for="l in links"
          :key="l.href"
          :href="l.href"
          class="block rounded-2xl px-4 py-3 text-navy-900 hover:bg-white/80"
          @click.prevent="go(l.href)"
        >{{ l.label }}</a>
      </nav>
    </Transition>
  </header>
</template>
