<script setup lang="ts">
/**
 * HERO — pinned scrub scene
 * Techniques: masked line reveal (intro), 6-layer depth parallax, split-diverge
 * text exit, hero mark grows + blurs out, companion chips scatter, bleed typography.
 */
import { gsap } from 'gsap'

const root = ref<HTMLElement | null>(null)
const scrollTo = useSmoothScroll()
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
    .to('.hero-eyebrow', { y: -40, opacity: 0, ease: 'power2.in' }, 0)
    .to('.hero-bleed', { opacity: 0.3, ease: 'power1.in' }, 0.5)

  gsap.utils.toArray<HTMLElement>('.hero-chip').forEach((chip, i) => {
    const [x, y, r] = chipLayout[i]!.scatter
    tl.to(chip, { x, y, rotate: r, opacity: 0, ease: 'power2.in' }, 0.1 + i * 0.04)
  })
})
</script>

<template>
  <section id="top" ref="root" class="relative h-svh min-h-[600px] overflow-hidden bg-paper short:min-h-0" aria-labelledby="hero-title">
    <!-- DEPTH 0 — paper gradient + bleed typography -->
    <div class="absolute inset-0" data-depth="0" aria-hidden="true">
      <div class="absolute inset-0 bg-[radial-gradient(120%_80%_at_80%_20%,#fff3ec_0%,#fffcfa_45%,#f8f1ea_100%)]" />
      <div class="hero-bleed absolute -bottom-[5vw] left-[-2vw] whitespace-nowrap font-display text-[32vw] font-extralight leading-none text-transparent [-webkit-text-stroke:1.2px_rgba(19,45,80,.07)]">
        หลงรัก LongRak
      </div>
    </div>

    <!-- DEPTH 1 — atmosphere glows -->
    <div class="absolute inset-0" data-depth="1" aria-hidden="true">
      <div class="hero-glow absolute right-[6%] top-[12%] size-[46vw] max-w-[720px] max-h-[720px] rounded-full bg-coral-500/20 blur-[100px]" />
      <div class="hero-glow absolute right-[22%] top-[38%] size-[30vw] max-w-[460px] max-h-[460px] rounded-full bg-peach-400/25 blur-[90px]" />
      <div class="hero-glow absolute left-[8%] bottom-[6%] size-[26vw] rounded-full bg-gold-300/30 blur-[90px]" />
    </div>

    <!-- DEPTH 2 + 3 — the master mark with companion chips -->
    <!-- Stacked (logo above copy) on phones/tablets; side by side from lg, and on landscape phones -->
    <div
      class="pointer-events-none absolute inset-x-0 top-[10%] flex justify-center lg:inset-y-0 lg:top-0 lg:right-[3vw] lg:items-center lg:justify-end short:inset-y-0 short:top-0 short:right-[3vw] short:items-center short:justify-end"
      aria-hidden="true"
    >
      <div class="hero-mark relative w-[min(56vw,26svh)] max-w-[560px] md:w-[min(48vw,32svh)] lg:w-[40vw] short:w-[min(36vw,64svh)] tiny:hidden" data-depth="3">
        <div class="float-a">
          <img src="/brand/longrak-mark.webp" alt="" width="720" height="600" class="hero-mark-img w-full" fetchpriority="high">
        </div>
        <div
          v-for="c in chips"
          :key="c.icon"
          class="hero-chip absolute hidden sm:block"
          :class="c.pos"
          data-depth="2"
        >
          <div class="hero-chip-in">
            <div class="flex items-center gap-2 rounded-full border border-white bg-white/80 px-4 py-2 text-[13px] text-navy-800 shadow-[0_12px_40px_-12px_rgba(19,45,80,.35)] backdrop-blur" :class="[c.float, 'mono' in c ? 'font-mono text-[11.5px]' : '']">
              <HIcon :name="c.icon" :size="16" class="text-gold-600" />
              {{ c.text }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- DEPTH 4 — copy -->
    <div class="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-end px-6 pb-10 md:pb-16 lg:justify-center lg:pb-0 short:justify-center short:pb-0 short:pt-14" data-depth="4">
      <div class="max-w-2xl lg:max-w-[min(42rem,54vw)] short:max-w-[56vw]">
        <div class="hero-eyebrow"><p class="hero-intro eyebrow text-navy-700">{{ t.eyebrow }}</p></div>

        <h1
          id="hero-title"
          class="mt-4 font-display font-light leading-[1.12] tracking-[-0.01em] text-navy-900 md:mt-6 short:mt-2 short:text-[10.5svh]"
          :class="locale === 'en' ? 'text-[clamp(2.4rem,5.4vw,4.8rem)]' : 'text-[clamp(2.6rem,7.4vw,6.4rem)]'"
        >
          <span class="hero-line hero-line-a line-mask"><span>{{ t.lineA }}</span></span>
          <span class="hero-line hero-line-b line-mask"><span>{{ t.lineB }}<em class="text-heart font-medium">{{ t.lineBEm }}</em></span></span>
        </h1>

        <div class="hero-sub">
          <p class="hero-intro mt-6 font-display text-xl font-light text-navy-700 md:text-2xl short:mt-3 short:text-lg">
            {{ t.subA }}<span class="text-gold font-normal">{{ t.subEm }}</span>
          </p>
          <p class="hero-intro mt-5 hidden max-w-xl text-[15.5px] leading-relaxed text-navy-700/90 sm:block short:hidden">
            {{ t.body }}
          </p>
          <div class="hero-intro mt-6 flex flex-wrap items-center gap-3 md:mt-8 short:mt-4">
            <a href="#report" class="btn-primary group" @click.prevent="scrollTo('#report')">
              {{ t.cta }}
              <HIcon name="sparks" :size="18" class="icon-twinkle text-gold-300" />
            </a>
            <a href="#how" class="btn-ghost group" @click.prevent="scrollTo('#how')">
              {{ t.how }}
              <HIcon name="arrow-down" :size="18" class="icon-nudge" />
            </a>
          </div>
          <p class="hero-intro mt-6 flex items-start gap-2 text-[12.5px] text-navy-500 short:mt-3">
            <HIcon name="info-circle" :size="16" class="mt-0.5" />
            {{ t.note }}
          </p>
        </div>
      </div>
    </div>

    <!-- DEPTH 5 — scroll cue -->
    <div class="hero-cue absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-navy-500 lg:flex short:hidden" aria-hidden="true">
      <span class="font-mono text-[10px] tracking-[0.3em]">SCROLL</span>
      <span class="h-10 w-px bg-gradient-to-b from-navy-500/60 to-transparent" />
    </div>
  </section>
</template>
