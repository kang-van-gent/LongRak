<script setup lang="ts">
/**
 * HERO — pinned scrub scene
 * Techniques: masked line reveal (intro), 6-layer depth parallax, split-diverge
 * text exit, hero mark grows + blurs out, companion chips scatter, bleed typography.
 */
import { gsap } from 'gsap'

const root = ref<HTMLElement | null>(null)
const scrollTo = useSmoothScroll()
const localePath = useLocalePath()
const { locale } = useI18n()

const t = useCopy({
  th: {
    eyebrow: 'LongRak · หลงรัก — Early Access',
    lineA: 'ก่อนตกลงจ้าง',
    lineB: 'ลองตรวจให้',
    lineBEm: 'ชัด',
    subA: 'ก่อนเริ่มงาน เก็บหลักฐานให้',
    subEm: 'ครบ',
    body: 'LongRak ช่วยให้เจ้าของบ้านและผู้รับเหมามีพื้นที่กลางสำหรับเอกสาร ข้อตกลง งวดงาน และหลักฐานที่ตรวจสอบย้อนหลังได้ เริ่มจากทดลองให้ AI ช่วยหารายการที่ควรทบทวนในใบเสนอราคาหรือสัญญาของคุณ',
    cta: 'ทดลองวิเคราะห์เอกสาร',
    how: 'ดูวิธีการทำงาน',
    note: 'ผลประเมิน AI เป็นข้อมูลช่วยตรวจความครบถ้วนเบื้องต้น ไม่ใช่คำปรึกษาทางกฎหมายหรือวิศวกรรม',
    chips: ['ใบเสนอราคา.pdf', 'งวดงาน 3 งวด', 'sha256 · 9f2c…e41a', 'หน้า 2 · บรรทัด 14'],
  },
  en: {
    eyebrow: 'LongRak · หลงรัก — Early Access',
    lineA: 'Before you hire,',
    lineB: 'check it ',
    lineBEm: 'clearly',
    subA: 'Before work begins, keep the evidence ',
    subEm: 'complete',
    body: 'LongRak gives homeowners and contractors a neutral space for documents, agreements, milestones and evidence that can be verified later. Start by letting AI point out what to review in your quotation or contract.',
    cta: 'Try a document check',
    how: 'See how it works',
    note: 'AI results are a first-pass completeness check, not legal or engineering advice.',
    chips: ['quotation.pdf', '3 milestones', 'sha256 · 9f2c…e41a', 'page 2 · line 14'],
  },
})

// Decorative companions orbiting the mark (no status claims — just document artefacts)
const chipLayout = [
  { icon: 'document', pos: 'left-[-6%] top-[14%]', float: 'float-a', scatter: [-260, -140, -18] },
  { icon: 'coins', pos: 'right-[-4%] top-[6%]', float: 'float-b', scatter: [240, -180, 14] },
  { icon: 'fingerprint', pos: 'left-[2%] bottom-[8%]', float: 'float-c', scatter: [-220, 200, 10], mono: true },
  { icon: 'bookmark', pos: 'right-[0%] bottom-[18%]', float: 'float-a', scatter: [260, 160, -12] },
] as const
const chips = computed(() => chipLayout.map((c, i) => ({ ...c, text: t.value.chips[i]! })))

useScene(root, (_el, { isMobile }) => {
  // ---- Intro (on load, plays once; inner elements only so scroll can own the wrappers)
  const intro = gsap.timeline({ defaults: { ease: 'expo.out' }, delay: 0.15 })
  intro
    .from('.hero-line > span', { yPercent: 115, duration: 1.4, stagger: 0.12 })
    .from('.hero-intro', { y: 24, opacity: 0, duration: 1.1, stagger: 0.08 }, 0.35)
    .from('.hero-mark-img', { scale: 0.82, opacity: 0, filter: 'blur(14px)', duration: 1.8 }, 0.1)
    .from('.hero-chip-in', { scale: 0.6, opacity: 0, duration: 1.2, stagger: 0.1, ease: 'back.out(1.8)' }, 0.6)

  // ---- Scroll: pinned, scrub: true (scrolling back replays it in reverse)
  const tl = gsap.timeline({
    scrollTrigger: { trigger: root.value, start: 'top top', end: '+=120%', scrub: true, pin: true },
  })

  tl.to('.hero-line-a', { xPercent: -14, opacity: 0, ease: 'power2.in' }, 0)
    .to('.hero-line-b', { xPercent: 12, opacity: 0, ease: 'power2.in' }, 0.04)
    .to('.hero-sub', { y: -80, opacity: 0, filter: 'blur(6px)', ease: 'power2.in' }, 0)
    .to('.hero-mark', { scale: isMobile ? 1.25 : 1.45, xPercent: isMobile ? 0 : -42, rotate: -3, ease: 'power1.inOut' }, 0)
    .to('.hero-mark', { opacity: 0, filter: 'blur(16px)', scale: isMobile ? 1.6 : 1.9, ease: 'power2.in' }, 0.55)
    .to('.hero-bleed', { xPercent: -22, ease: 'none' }, 0)
    .to('.hero-glow', { scale: 1.5, opacity: 0.25, ease: 'none', stagger: 0.05 }, 0)
    .to('.hero-cue', { opacity: 0, y: 30, ease: 'none' }, 0)
  // the eyebrow line can be switched off in the template
  if (root.value?.querySelector('.hero-eyebrow')) tl.to('.hero-eyebrow', { y: -40, opacity: 0, ease: 'power2.in' }, 0)
  tl
    .to('.hero-bleed', { opacity: 0.3, ease: 'power1.in' }, 0.5)

  gsap.utils.toArray<HTMLElement>('.hero-chip').forEach((chip, i) => {
    const [x, y, r] = chipLayout[i]!.scatter
    tl.to(chip, { x, y, rotate: r, opacity: 0, ease: 'power2.in' }, 0.1 + i * 0.04)
  })
})
</script>

<template>
  <section id="top" ref="root" class="relative h-svh min-h-[600px] overflow-hidden bg-paper short:min-h-0"
    aria-labelledby="hero-title">
    <!-- DEPTH 0 — paper gradient + bleed typography -->
    <div class="absolute inset-0" data-depth="0" aria-hidden="true">
      <div class="absolute inset-0 bg-[radial-gradient(120%_80%_at_80%_20%,#fff3ec_0%,#fffcfa_45%,#f8f1ea_100%)]" />
      <div
        class="hero-bleed absolute -bottom-[5vw] left-[-2vw] whitespace-nowrap font-display text-[32vw] font-extralight leading-none text-transparent [-webkit-text-stroke:1.2px_rgba(19,45,80,.07)]">
        หลงรัก LongRak
      </div>
    </div>

    <!-- DEPTH 1 — atmosphere glows -->
    <div class="absolute inset-0" data-depth="1" aria-hidden="true">
      <div
        class="hero-glow absolute right-[6%] top-[12%] size-[46vw] max-w-[720px] max-h-[720px] rounded-full bg-coral-500/20 blur-[100px]" />
      <div
        class="hero-glow absolute right-[22%] top-[38%] size-[30vw] max-w-[460px] max-h-[460px] rounded-full bg-peach-400/25 blur-[90px]" />
      <div class="hero-glow absolute left-[8%] bottom-[6%] size-[26vw] rounded-full bg-gold-300/30 blur-[90px]" />
    </div>

    <!--
      Layout
      · phones/tablets (< lg): logo + copy form ONE centred group (logo in flow, above the copy),
        so there is never a dead gap between them, whatever the screen height
      · lg+ and landscape phones: copy on the left, logo lifted out to the right of the section
    -->
    <div
      class="relative z-10 mx-auto flex h-full max-w-7xl flex-col items-center justify-center px-6 pb-8 pt-20 text-center md:pb-12 tiny:pt-16 lg:static lg:items-start lg:pb-0 lg:pt-0 lg:text-left short:static short:items-start short:pb-0 short:pt-14 short:text-left"
      data-depth="4">
      <!-- DEPTH 2 + 3 — the master mark with companion chips -->
      <div
        class="pointer-events-none mb-7 flex justify-center md:mb-10 compact:mb-5 tiny:mb-4 lg:absolute lg:inset-y-0 lg:right-[max(3.5vw,calc((100vw-80rem)/2+1.5rem))] lg:mb-0 lg:items-center short:absolute short:bottom-0 short:right-[3vw] short:top-16 short:mb-0 short:items-center"
        aria-hidden="true">
        <div
          class="hero-mark relative w-[min(64vw,32svh)] max-w-[560px] md:w-[min(46vw,30svh)] compact:w-[min(54vw,24svh)] tiny:w-[min(50vw,20svh)] lg:w-[min(36vw,480px)] short:w-[min(34vw,58svh)]"
          data-depth="3">
          <div class="float-a">
            <img src="/brand/longrak-mark.webp" alt="" width="720" height="600" class="hero-mark-img w-full"
              fetchpriority="high">
          </div>
          <div v-for="c in chips" :key="c.icon" class="hero-chip absolute hidden sm:block short:hidden" :class="c.pos"
            data-depth="2">
            <div class="hero-chip-in">
              <div
                class="flex items-center gap-2 whitespace-nowrap rounded-full border border-white bg-white/80 px-4 py-2 text-[13px] text-navy-800 shadow-[0_12px_40px_-12px_rgba(19,45,80,.35)] backdrop-blur"
                :class="[c.float, 'mono' in c ? 'font-mono text-[11.5px]' : '']">
                <HIcon :name="c.icon" :size="16" class="text-gold-600" />
                {{ c.text }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- DEPTH 4 — copy -->
      <div class="w-full max-w-2xl lg:max-w-[min(42rem,54vw)] short:max-w-[56vw]">
        <!-- <div class="hero-eyebrow"><p class="hero-intro eyebrow text-navy-700 max-lg:after:h-px max-lg:after:w-8 max-lg:after:bg-gold-500 max-lg:after:content-[''] short:after:hidden">{{ t.eyebrow }}</p></div> -->

        <h1 id="hero-title"
          class="mt-4 text-balance font-display font-light leading-[1.12] tracking-[-0.01em] text-navy-900 md:mt-6 compact:mt-3 short:mt-2 short:text-[10.5svh]"
          :class="locale === 'en' ? 'text-[clamp(2.4rem,5.4vw,4.8rem)]' : 'text-[clamp(2.6rem,7.4vw,6.4rem)]'">
          <span class="hero-line hero-line-a line-mask"><span>{{ t.lineA }}</span></span>
          <span class="hero-line hero-line-b line-mask"><span>{{ t.lineB }}<em class="text-heart font-medium">{{
                t.lineBEm }}</em></span></span>
        </h1>

        <div class="hero-sub">
          <p
            class="hero-intro mt-5 text-balance font-display text-lg font-light text-navy-700 sm:text-xl md:mt-6 md:text-2xl compact:mt-3 short:mt-3 short:text-lg">
            {{ t.subA }}<span class="text-gold font-normal">{{ t.subEm }}</span>
          </p>
          <p
            class="hero-intro mx-auto mt-5 hidden max-w-xl text-[15.5px] leading-relaxed text-navy-700/90 sm:block lg:mx-0 short:hidden">
            {{ t.body }}
          </p>
          <!-- phones: two equal full-width buttons; from sm: side by side -->
          <div
            class="hero-intro mx-auto mt-7 flex w-full max-w-sm flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:flex-wrap sm:justify-center md:mt-8 compact:mt-5 lg:mx-0 lg:justify-start short:mt-4 short:justify-start">
            <NuxtLink :to="localePath('/ai-check')" class="btn-primary group justify-center">
              {{ t.cta }}
              <HIcon name="sparks" :size="18" class="icon-twinkle text-gold-300" />
            </NuxtLink>
            <a href="#how" class="btn-ghost group justify-center bg-white/40 tiny:hidden"
              @click.prevent="scrollTo('#how')">
              {{ t.how }}
              <HIcon name="arrow-down" :size="18" class="icon-nudge" />
            </a>
          </div>
          <p
            class="hero-intro mx-auto mt-6 flex max-w-sm items-start justify-center gap-2 text-balance text-left text-[12.5px] text-navy-500 sm:max-w-md compact:mt-4 lg:mx-0 lg:max-w-none lg:justify-start short:mt-3 short:justify-start">
            <HIcon name="info-circle" :size="16" class="mt-0.5 shrink-0" />
            {{ t.note }}
          </p>
        </div>
      </div>
    </div>

    <!-- DEPTH 5 — scroll cue -->
    <div
      class="hero-cue absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-navy-500 lg:flex short:hidden"
      aria-hidden="true">
      <span class="font-mono text-[10px] tracking-[0.3em]">SCROLL</span>
      <span class="h-10 w-px bg-gradient-to-b from-navy-500/60 to-transparent" />
    </div>
  </section>
</template>
