<script setup lang="ts">
/**
 * PILLARS — pinned horizontal gallery
 * Techniques: vertical→horizontal scroll (containerAnimation), per-card
 * in/out scrub, DrawSVG icons drawn as each card crosses the viewport,
 * parallax ghost numerals.
 */
import { gsap } from 'gsap'
import type { HumbleIconName } from '~/utils/humbleicons'

const root = ref<HTMLElement | null>(null)
const track = ref<HTMLElement | null>(null)

const t = useCopy({
  th: {
    eyebrow: 'Core Pillars',
    title: 'ห้าเสาหลักของ',
    titleEm: 'ความไว้ใจ',
    sub: 'เริ่มจาก AI ช่วยตรวจเอกสาร แล้วค่อยต่อยอดเป็นพื้นที่โครงการร่วมกันของสองฝ่าย',
    items: [
      { title: 'ข้อตกลง', body: 'เอกสาร ข้อกำหนด งวดงาน และการยืนยันร่วมกัน — ทั้งสองฝ่ายเห็นฉบับเดียวกัน พร้อมเวอร์ชันและเวลาที่รับทราบ', phase: 'Phase W1 · Pilot' },
      { title: 'หลักฐาน', body: 'เก็บไฟล์ต้นฉบับ ประวัติการเปลี่ยนแปลง ผู้ส่ง เวลา และค่า SHA-256 เพื่อให้ตรวจสอบย้อนกลับได้ ไม่ใช่แค่ตารางรูปถ่าย', phase: 'Phase W1 · Pilot' },
      { title: 'งวดงานและการจ่าย', body: 'ส่งงาน ขอเบิก ตรวจรับ และบันทึกการจ่ายตรงระหว่างคู่สัญญา — LongRak ไม่รับพักเงินค่าก่อสร้าง', phase: 'Phase W1 · Pilot' },
      { title: 'AI ช่วยตรวจเอกสาร', body: 'วิเคราะห์ความครบถ้วน ความคลุมเครือ และงวดการชำระ ด้วย AI + กฎ + แหล่งอ้างอิงที่ตรวจสอบได้', phase: 'เริ่มได้ก่อน · W0' },
      { title: 'ผู้ตรวจอิสระ', body: 'ประสานผู้ตรวจที่มีคุณสมบัติเหมาะกับประเภทงาน เมื่อทั้งสองฝ่ายต้องการความเห็นจากมืออาชีพ', phase: 'ระยะถัดไป' },
    ],
  },
  en: {
    eyebrow: 'Core Pillars',
    title: 'Five pillars of ',
    titleEm: 'trust',
    sub: 'It starts with AI document review, then grows into a shared project space for both sides.',
    items: [
      { title: 'Agreement', body: 'Documents, terms, milestones and joint confirmation — both sides see the same version, with version history and acknowledgement times.', phase: 'Phase W1 · Pilot' },
      { title: 'Evidence', body: 'Original files, change history, sender, time and a SHA-256 hash so everything can be traced back — not just a gallery of photos.', phase: 'Phase W1 · Pilot' },
      { title: 'Milestones & payments', body: 'Submit work, request payment, sign off and record payments made directly between the parties — LongRak never holds construction money.', phase: 'Phase W1 · Pilot' },
      { title: 'AI document review', body: 'Checks completeness, ambiguity and payment schedules using AI, rules and verifiable references.', phase: 'Available first · W0' },
      { title: 'Independent inspector', body: 'Connects you with an inspector qualified for the type of work, when both sides want a professional opinion.', phase: 'Later phase' },
    ],
  },
})

const pillarMeta: { n: string; icon: HumbleIconName; en: string; now?: boolean }[] = [
  { n: '01', icon: 'document', en: 'Agreement' },
  { n: '02', icon: 'fingerprint', en: 'Evidence' },
  { n: '03', icon: 'coins', en: 'Milestones & Payments' },
  { n: '04', icon: 'sparks', en: 'AI Risk Review', now: true },
  { n: '05', icon: 'search', en: 'Optional Inspection' },
]
const pillars = computed(() => pillarMeta.map((m, i) => ({ ...m, ...t.value.items[i]! })))

useScene(root, () => {
  const t = track.value!
  const distance = () => Math.max(0, t.scrollWidth - window.innerWidth)

  // Pinned horizontal travel — ease must be "none" for containerAnimation
  const travel = gsap.timeline({
    scrollTrigger: {
      trigger: root.value,
      start: 'top top',
      end: () => `+=${distance()}`,
      pin: true,
      scrub: true,
      invalidateOnRefresh: true,
    },
  })
  travel
    .to(t, { x: () => -distance(), ease: 'none', duration: 1 }, 0)
    .to('.pl-ghost', { xPercent: -30, ease: 'none', duration: 1 }, 0)
    .to('.pl-head', { opacity: 0.12, y: -20, ease: 'none', duration: 0.25 }, 0.75)

  // Heading arrives before the pin starts
  inOutTimeline(root.value!, 'top 85%', 'top top')
    .from('.pl-head .line-mask > span', { yPercent: 110, stagger: 0.15, ease: 'power3.out', duration: 1 })
    .from('.pl-head .pl-sub', { opacity: 0, y: 20, duration: 1 }, 0.3)

  // Each card: in as it enters from the right, out as it leaves left
  gsap.utils.toArray<HTMLElement>('.pl-card').forEach((card) => {
    const tl = gsap.timeline({
      scrollTrigger: { trigger: card, containerAnimation: travel, start: 'left 100%', end: 'right 0%', scrub: true },
    })
    tl.from(card, { scale: 0.86, opacity: 0.25, rotateY: -14, ease: 'power2.out', duration: 1 })
      .fromTo(card.querySelectorAll('.pl-icon path'), { drawSVG: '0%' }, { drawSVG: '100%', ease: 'power1.inOut', duration: 0.9 }, 0.1)
      .from(card.querySelectorAll('.pl-reveal'), { y: 30, opacity: 0, stagger: 0.08, duration: 0.6 }, 0.3)
      .to(card, { scale: 0.9, opacity: 0.3, rotateY: 10, ease: 'power2.in', duration: 1 }, '+=1.2')
  })
})
</script>

<template>
  <section id="pillars" ref="root" class="relative h-svh min-h-[560px] overflow-hidden bg-paper-2 short:min-h-0" aria-labelledby="pillars-title">
    <!-- DEPTH 0 — ghost numerals -->
    <div class="pl-ghost pointer-events-none absolute inset-y-0 left-0 flex items-center whitespace-nowrap font-display text-[42vh] font-extralight leading-none text-navy-900/[0.035]" data-depth="0" aria-hidden="true">
      01 02 03 04 05
    </div>
    <!-- DEPTH 1 -->
    <div class="pointer-events-none absolute inset-0" data-depth="1" aria-hidden="true">
      <div class="absolute right-[10%] top-[10%] size-[30vw] rounded-full bg-gold-300/25 blur-[100px]" />
    </div>

    <div class="relative flex h-full flex-col justify-center gap-10 pt-16 compact:gap-5 compact:pt-14 short:gap-3 short:pt-16" data-depth="4">
      <header class="pl-head mx-auto w-full max-w-7xl shrink-0 px-6">
        <p class="eyebrow text-navy-700 short:hidden">{{ t.eyebrow }}</p>
        <h2 id="pillars-title" class="mt-4 font-display compact:mt-2 short:mt-0 text-[clamp(2rem,4.4vw,3.8rem)] font-light leading-[1.15]">
          <span class="line-mask"><span>{{ t.title }}<em class="text-heart font-medium">{{ t.titleEm }}</em></span></span>
        </h2>
        <p class="pl-sub mt-3 max-w-lg text-[15px] text-navy-700 compact:hidden">{{ t.sub }}</p>
      </header>

      <!-- with reduced motion there is no pinned travel, so the row scrolls sideways instead -->
      <div class="motion-reduce:snap-x motion-reduce:snap-mandatory motion-reduce:overflow-x-auto motion-reduce:pb-4">
      <div ref="track" class="flex w-max gap-6 px-6 [perspective:1400px] md:gap-8 md:pl-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))] md:pr-[12vw]">
        <article
          v-for="p in pillars"
          :key="p.n"
          class="pl-card relative flex min-h-[min(56svh,480px)] w-[86vw] snap-start flex-col justify-between gap-6 rounded-[2rem] border p-6 sm:p-8 md:w-[min(40vw,520px)] md:p-10 compact:min-h-0 compact:gap-4 compact:p-5 short:w-[min(56vw,460px)] short:min-h-0 short:gap-2 short:p-4"
          :class="p.now ? 'foil-border border-transparent bg-navy-950 text-paper' : 'border-navy-900/8 bg-paper/80 text-navy-900'"
        >
          <div class="flex items-start justify-between">
            <span class="pl-icon grid size-16 place-items-center rounded-2xl compact:size-12 short:size-10" :class="p.now ? 'bg-white/5 text-gold-300' : 'bg-white text-navy-900'">
              <HIcon :name="p.icon" :size="32" :stroke="1.4" />
            </span>
            <span class="font-display text-6xl font-extralight compact:text-5xl short:text-3xl" :class="p.now ? 'text-gold-300/40' : 'text-navy-900/15'">{{ p.n }}</span>
          </div>
          <div>
            <p class="pl-reveal font-mono text-[11px] tracking-[0.25em] uppercase" :class="p.now ? 'text-gold-300' : 'text-gold-600'">{{ p.en }}</p>
            <h3 class="pl-reveal mt-3 font-display text-3xl font-normal md:text-4xl compact:text-2xl short:mt-1 short:text-xl">{{ p.title }}</h3>
            <p class="pl-reveal mt-4 text-[15px] leading-relaxed compact:mt-2 compact:text-[14px] short:mt-1 short:text-[13px] short:leading-normal" :class="p.now ? 'text-paper/75' : 'text-navy-700'">{{ p.body }}</p>
            <span
              class="pl-reveal mt-6 inline-flex items-center gap-2 compact:mt-4 short:hidden rounded-full px-3 py-1 text-[12px]"
              :class="p.now ? 'bg-gold-500/15 text-gold-300' : 'bg-navy-900/5 text-navy-700'"
            >
              <HIcon :name="p.now ? 'flash' : 'clock'" :size="14" />{{ p.phase }}
            </span>
          </div>
        </article>
      </div>
      </div>
    </div>
  </section>
</template>
