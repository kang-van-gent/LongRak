<script setup lang="ts">
/**
 * PRICING HYPOTHESES — scrubbed cascading card fan
 * Techniques: cards rise from a fanned stack into a row, then fan out on exit.
 * All prices are explicitly labelled as Early Access hypotheses (context.md §17).
 */
import { gsap } from 'gsap'
import type { HumbleIconName } from '~/utils/humbleicons'

const root = ref<HTMLElement | null>(null)
const scrollTo = useSmoothScroll()

const t = useCopy({
  th: {
    eyebrow: 'Early Access Pricing',
    h1: 'จ่ายต่อโครงการ',
    h2: 'ไม่เก็บ',
    h2Em: 'ค่าธรรมเนียมต่องวด',
    note: 'ราคาที่แสดงเป็นแผนทดลองสำหรับ Early Access และอาจเปลี่ยนก่อนเปิดบริการเต็มรูปแบบ',
    free: 'ฟรี',
    unit: 'บาท / โครงการ',
    plans: [
      { desc: 'ลองสร้างร่างโครงการและดูตัวอย่างเช็กลิสต์', items: ['ร่างโครงการแบบจำกัด', 'ดูตัวอย่างรายงานวิเคราะห์', 'ทดลอง AI แบบจำกัดจำนวนครั้ง'] },
      { desc: 'พื้นที่กลางสำหรับหนึ่งโครงการ', items: ['ข้อตกลงร่วมกันพร้อมเวอร์ชัน', 'หลักฐานและงวดงาน', 'ตรวจรับ ประวัติ และส่งออกตามข้อจำกัด'] },
      { desc: 'Trust Project + AI ช่วยตรวจเอกสาร', items: ['ทุกอย่างใน Trust Project', 'AI ตรวจความครบถ้วนของเอกสาร', 'วิเคราะห์ความเสี่ยงงวดเงิน'] },
    ],
    addon: 'บริการประสานผู้ตรวจอิสระ (ระยะถัดไป): ค่าประสานงานประมาณ 300–700 บาท/ครั้ง แยกจากค่าผู้ตรวจ',
    cta: 'ลงทะเบียนสนใจ',
  },
  en: {
    eyebrow: 'Early Access Pricing',
    h1: 'Pay per project.',
    h2: 'No ',
    h2Em: 'milestone fees',
    note: 'Prices shown are trial plans for Early Access and may change before full launch.',
    free: 'Free',
    unit: 'THB / project',
    plans: [
      { desc: 'Draft a project and preview the checklist', items: ['Limited project draft', 'Sample analysis report', 'Limited AI trial runs'] },
      { desc: 'A neutral space for one project', items: ['Shared, versioned agreement', 'Evidence and milestones', 'Sign-off, history and export (within limits)'] },
      { desc: 'Trust Project + AI document review', items: ['Everything in Trust Project', 'AI completeness check of documents', 'Payment-schedule risk analysis'] },
    ],
    addon: 'Independent inspector coordination (later phase): a coordination fee of roughly 300–700 THB per visit, separate from the inspector\'s own fee',
    cta: 'Register interest',
  },
})

const planMeta: { name: string; price: string | null; icon: HumbleIconName; featured?: boolean }[] = [
  { name: 'Free Draft', price: null, icon: 'note' },
  { name: 'Trust Project', price: '790', icon: 'shield' },
  { name: 'Trust Project Plus', price: '1,490', icon: 'sparks', featured: true },
]
const plans = computed(() =>
  planMeta.map((m, i) => ({
    ...m,
    ...t.value.plans[i]!,
    price: m.price ?? t.value.free,
    unit: m.price ? t.value.unit : '',
  })),
)

useScene(root, (_el, { isMobile }) => {
  inOutTimeline('.pr-head', 'top 95%', 'bottom 5%')
    .from('.pr-head .line-mask > span', { yPercent: 110, stagger: 0.15, ease: 'power3.out', duration: 1 })
    .from('.pr-head .pr-note', { opacity: 0, y: 20, duration: 0.8 }, 0.3)
    .to('.pr-head', { opacity: 0, y: -50, ease: 'power2.in', duration: 1 }, '+=2')

  const cards = gsap.utils.toArray<HTMLElement>('.pr-card')
  if (isMobile) {
    cards.forEach((card) => {
      inOutTimeline(card, 'top 95%', 'bottom 5%')
        .from(card, { y: 100, rotate: 3, opacity: 0, ease: 'power3.out', duration: 1 })
        .to(card, { y: -60, opacity: 0, scale: 0.94, ease: 'power2.in', duration: 1 }, '+=2')
    })
  }
  else {
    inOutTimeline('.pr-grid', 'top 95%', 'bottom 5%')
      .from(cards, {
        y: 220,
        x: (i: number) => (1 - i) * 120,
        rotate: (i: number) => (i - 1) * 10,
        opacity: 0,
        ease: 'power3.out',
        stagger: 0.12,
        duration: 1,
      })
      .from('.pr-addon', { y: 40, opacity: 0, duration: 0.7 }, 0.6)
      .to(cards, {
        y: -90,
        rotate: (i: number) => (i - 1) * -6,
        opacity: 0,
        ease: 'power2.in',
        stagger: 0.08,
        duration: 1,
      }, '+=2')
      .to('.pr-addon', { opacity: 0, y: -30, duration: 0.6 }, '<')
  }
})
</script>

<template>
  <section id="pricing" ref="root" class="relative overflow-hidden bg-paper-2 py-28 md:py-40" aria-labelledby="pricing-title">
    <div class="pointer-events-none absolute inset-0" data-depth="0" aria-hidden="true">
      <div class="absolute left-1/2 top-1/2 size-[70vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/60 blur-[120px]" />
    </div>

    <div class="relative mx-auto max-w-7xl px-6" data-depth="4">
      <header class="pr-head mx-auto max-w-2xl text-center">
        <p class="eyebrow justify-center text-navy-700">{{ t.eyebrow }}</p>
        <h2 id="pricing-title" class="mt-6 font-display text-[clamp(2.2rem,5vw,4.4rem)] font-light leading-[1.15]">
          <span class="line-mask"><span>{{ t.h1 }}</span></span>
          <span class="line-mask"><span>{{ t.h2 }}<em class="text-heart font-medium">{{ t.h2Em }}</em></span></span>
        </h2>
        <p class="pr-note mt-6 inline-flex items-start gap-2 rounded-2xl border border-warning/25 bg-warning/5 px-4 py-3 text-left text-[13.5px] text-navy-700">
          <HIcon name="info-circle" :size="18" class="mt-0.5 shrink-0 text-warning" />
          {{ t.note }}
        </p>
      </header>

      <div class="pr-grid mt-20 grid gap-6 md:grid-cols-3">
        <article
          v-for="p in plans"
          :key="p.name"
          class="pr-card group relative flex flex-col rounded-[2rem] p-8 md:p-10"
          :class="p.featured
            ? 'foil-border bg-navy-950 text-paper shadow-[0_40px_100px_-40px_rgba(10,26,48,.8)] md:-translate-y-4'
            : 'border border-navy-900/8 bg-paper/90 text-navy-900 shadow-[0_30px_80px_-50px_rgba(19,45,80,.5)]'"
        >
          <div class="flex items-center justify-between">
            <span class="grid size-12 place-items-center rounded-2xl" :class="p.featured ? 'bg-white/5 text-gold-300' : 'bg-white text-navy-900'">
              <HIcon :name="p.icon" :size="24" :stroke="1.6" :class="p.featured ? 'icon-twinkle' : 'transition-transform duration-500 group-hover:scale-110'" />
            </span>
            <span class="rounded-full px-2.5 py-1 font-mono text-[10px] tracking-wider" :class="p.featured ? 'bg-gold-500/15 text-gold-300' : 'bg-navy-900/5 text-navy-500'">PROPOSED</span>
          </div>
          <h3 class="mt-8 font-mono text-[12px] tracking-[0.2em] uppercase" :class="p.featured ? 'text-gold-300' : 'text-gold-600'">{{ p.name }}</h3>
          <p class="mt-3 flex items-baseline gap-2">
            <span class="font-display text-5xl font-light">{{ p.price }}</span>
            <span v-if="p.unit" class="text-[14px]" :class="p.featured ? 'text-paper/60' : 'text-navy-500'">{{ p.unit }}</span>
          </p>
          <p class="mt-3 text-[14.5px]" :class="p.featured ? 'text-paper/75' : 'text-navy-700'">{{ p.desc }}</p>
          <ul class="mt-8 space-y-3 border-t pt-6" :class="p.featured ? 'border-white/10' : 'border-navy-900/10'">
            <li v-for="it in p.items" :key="it" class="flex items-start gap-3 text-[14.5px]">
              <HIcon name="check" :size="18" class="mt-0.5" :class="p.featured ? 'text-gold-300' : 'text-success'" />{{ it }}
            </li>
          </ul>
        </article>
      </div>

      <div class="pr-addon mx-auto mt-10 flex max-w-3xl flex-col items-center gap-6 text-center">
        <p class="flex flex-wrap items-center justify-center gap-2 text-[14px] text-navy-700">
          <HIcon name="search" :size="18" class="text-gold-600" />
          {{ t.addon }}
        </p>
        <a href="#contact" class="btn-primary group" @click.prevent="scrollTo('#contact')">
          {{ t.cta }}
          <HIcon name="heart" :size="18" class="icon-heartbeat text-coral-400" />
        </a>
      </div>
    </div>
  </section>
</template>
