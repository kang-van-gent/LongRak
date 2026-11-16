<script setup lang="ts">
/**
 * MANIFESTO — pinned dark scene
 * Techniques: clip-path "window pane" opening, word-by-word scroll lighting
 * (Thai segmented with Intl.Segmenter), DrawSVG heart, theatrical exit.
 */
import { gsap } from 'gsap'

const root = ref<HTMLElement | null>(null)
const words = ref<HTMLElement | null>(null)
const { locale } = useI18n()
const inner = ref<HTMLElement | null>(null)
const fit = ref<HTMLElement | null>(null)
useFitHeight(inner, fit)

// Scroll-lit paragraph: alternating plain text and highlighted (gold) fragments
type Part = string | { hl: string }
const t = useCopy<{ title: string; words: Part[]; lineA: string; lineB: string; aside: string }>({
  th: {
    title: 'พื้นที่กลางที่ทั้งสองฝ่ายไว้ใจได้',
    words: [
      { hl: 'LongRak' }, ' ไม่ใช่แพลตฟอร์มหาช่าง และไม่ได้รับเหมาแทนใคร แต่คือ', { hl: 'พื้นที่กลาง' }, 'ที่', { hl: 'เจ้าของบ้าน' },
      'และ', { hl: 'ผู้รับเหมา' }, 'เห็นเอกสารฉบับเดียวกัน ยืนยันข้อตกลงร่วมกัน และเก็บ', { hl: 'หลักฐาน' }, 'ที่ตรวจสอบย้อนหลังได้ตลอดโครงการ',
    ],
    lineA: 'ทุกข้อตกลงชัดเจน',
    lineB: 'ทุกหลักฐานตรวจสอบได้',
    aside: 'เป็นกลางต่อทั้งสองฝ่าย — ใครจ่ายค่าระบบก็ไม่มีสิทธิแก้หรือลบข้อเท็จจริงแทนอีกฝ่าย',
  },
  en: {
    title: 'A neutral space both sides can trust',
    words: [
      { hl: 'LongRak' }, ' is not a marketplace for finding builders, and it does not contract work on anyone\'s behalf. It is a ', { hl: 'neutral space' }, ' where ',
      { hl: 'homeowners' }, ' and ', { hl: 'contractors' }, ' see the same documents, confirm agreements together, and keep ', { hl: 'evidence' }, ' that can be checked for the life of the project.',
    ],
    lineA: 'Every agreement clear.',
    lineB: 'Every piece of evidence verifiable.',
    aside: 'Neutral to both sides — paying for the service never gives anyone the right to edit or delete facts on the other side\'s behalf.',
  },
})

useScene(root, () => {
  const { words: spans, restore } = splitWords(words.value!)

  const tl = gsap.timeline({
    scrollTrigger: { trigger: root.value, start: 'top top', end: '+=170%', scrub: true, pin: true },
  })

  // IN — the navy pane opens out of the paper
  tl.fromTo(
    '.mf-pane',
    { clipPath: 'inset(16% 9% 16% 9% round 48px)' },
    { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'power2.inOut', duration: 0.18 },
    0,
  )
    .from('.mf-inner', { scale: 0.88, ease: 'power2.out', duration: 0.2 }, 0)
    .fromTo('.mf-heart path', { drawSVG: '0%' }, { drawSVG: '100%', ease: 'none', duration: 0.55 }, 0.05)
    .from('.mf-eyebrow', { y: 30, opacity: 0, duration: 0.08 }, 0.12)
    // words light up one by one
    .fromTo(spans, { opacity: 0.12 }, { opacity: 1, ease: 'none', stagger: 0.5 / spans.length, duration: 0.04 }, 0.16)
    .from('.mf-promise .line-mask > span', { yPercent: 110, stagger: 0.04, duration: 0.1, ease: 'power3.out' }, 0.68)
    .from('.mf-rule', { scaleX: 0, duration: 0.1, ease: 'power2.out' }, 0.7)
    // OUT — content recedes into the dark
    .to('.mf-inner', { y: -90, opacity: 0, filter: 'blur(8px)', ease: 'power2.in', duration: 0.13 }, 0.87)
    .to('.mf-heart', { scale: 1.4, opacity: 0, ease: 'power2.in', duration: 0.13 }, 0.87)
    .to('.mf-pane', { clipPath: 'inset(50% 8% 50% 8% round 48px)', ease: 'power3.in', duration: 0.13 }, 0.87)

  return restore
})
</script>

<template>
  <section id="promise" ref="root" class="relative h-svh overflow-hidden bg-paper" aria-labelledby="promise-title">
    <div class="mf-pane absolute inset-0 overflow-hidden bg-navy-950 text-paper">
      <!-- DEPTH 0 -->
      <div class="absolute inset-0 bg-[radial-gradient(90%_70%_at_50%_110%,#1b3a60_0%,#0a1a30_60%)]" data-depth="0" aria-hidden="true" />
      <!-- DEPTH 1 -->
      <div class="absolute inset-0" data-depth="1" aria-hidden="true">
        <div class="absolute -left-[10%] bottom-[-20%] size-[50vw] rounded-full bg-coral-500/15 blur-[120px]" />
        <div class="absolute right-[-8%] top-[-10%] size-[40vw] rounded-full bg-gold-500/10 blur-[120px]" />
      </div>
      <!-- DEPTH 2 — drawn heart -->
      <div class="pointer-events-none absolute inset-0 grid place-items-center" data-depth="2" aria-hidden="true">
        <HIcon name="heart" size="min(78vw, 760px)" :stroke="0.18" class="mf-heart text-coral-500/40" />
      </div>

      <!-- DEPTH 4 -->
      <div ref="inner" class="mf-inner relative z-10 mx-auto flex h-full max-w-5xl flex-col justify-center px-6 pb-6 pt-20 short:pt-14" data-depth="4">
        <div ref="fit">
        <p class="mf-eyebrow eyebrow text-gold-300">Core Promise</p>
        <h2 id="promise-title" class="sr-only">{{ t.title }}</h2>
        <p ref="words" class="mt-8 compact:mt-5 short:mt-3 font-display font-light leading-[1.45] [&_.hl]:text-gold-300 [&_.hl]:font-medium" :class="locale === 'en' ? 'text-[clamp(1.15rem,3vw,2.7rem)]' : 'text-[clamp(1.5rem,3.6vw,3.2rem)]'">
          <template v-for="(w, i) in t.words" :key="i"><em v-if="typeof w !== 'string'" data-hl>{{ w.hl }}</em><template v-else>{{ w }}</template></template>
        </p>

        <div class="mf-promise mt-14 flex flex-col gap-6 md:flex-row md:items-end md:justify-between compact:mt-8 compact:gap-4 short:mt-6">
          <p class="font-display text-[clamp(1.4rem,2.6vw,2.2rem)] font-normal leading-snug">
            <span class="line-mask"><span class="text-heart">{{ t.lineA }}</span></span>
            <span class="line-mask"><span class="text-gold">{{ t.lineB }}</span></span>
          </p>
          <span class="mf-rule hidden h-px flex-1 origin-left bg-gradient-to-r from-gold-500/70 to-transparent md:mx-10 md:mb-4 md:block" aria-hidden="true" />
          <p class="max-w-xs text-sm leading-relaxed text-paper/60">
            {{ t.aside }}
          </p>
        </div>
        </div>
      </div>
    </div>
  </section>
</template>
