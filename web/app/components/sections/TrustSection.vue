<script setup lang="ts">
/**
 * TRUST & LIMITS — top-down curtain birth
 * Techniques: clip-path curtain drop, two columns converge, items stagger,
 * scrubbed exit. Copy mirrors the required statements in context.md §16.
 */
import { gsap } from 'gsap'

const root = ref<HTMLElement | null>(null)

const t = useCopy({
  th: {
    h1: 'ความไว้ใจเริ่มจาก',
    h2: 'การบอก',
    h2Em: 'ขอบเขต',
    h2Post: 'ให้ชัด',
    doesTitle: 'สิ่งที่ LongRak ทำ',
    doesNotTitle: 'สิ่งที่ LongRak ไม่ทำ',
    does: [
      'จัดเก็บเอกสาร ข้อตกลง และหลักฐานของโครงการไว้ในที่เดียว',
      'ช่วยตรวจความครบถ้วนของเอกสารเบื้องต้นด้วย AI พร้อมอ้างอิงหน้าและข้อความ',
      'บันทึกผู้กระทำ เวลา เวอร์ชัน และค่า hash ของไฟล์ต้นฉบับ',
      'แสดงข้อตกลงการประมวลผลข้อมูล ก่อนส่งเอกสารให้ AI ทุกครั้ง',
    ],
    doesNot: [
      'ไม่รับประกันว่าผู้รับเหมาจะไม่ทิ้งงาน',
      'ไม่ใช่คำปรึกษากฎหมาย หรือผลตรวจของวิศวกร',
      'ไม่รับฝากเงินค่าก่อสร้าง และไม่ปล่อยเงินแทนคู่สัญญา',
      'ไม่รับรองว่าหลักฐานจะชนะคดี — ศาลเป็นผู้ชั่งน้ำหนักความน่าเชื่อถือ',
    ],
  },
  en: {
    h1: 'Trust starts with',
    h2: 'being clear about ',
    h2Em: 'limits',
    h2Post: '',
    doesTitle: 'What LongRak does',
    doesNotTitle: 'What LongRak does not do',
    does: [
      'Keeps a project\'s documents, agreements and evidence in one place',
      'Gives a first-pass AI completeness check, citing pages and text',
      'Records who acted, when, the version, and the hash of the original file',
      'Shows the data-processing terms every time before a document is sent to AI',
    ],
    doesNot: [
      'Does not guarantee a contractor won\'t abandon the job',
      'Is not legal advice or an engineer\'s inspection',
      'Does not hold construction money or release payments for either party',
      'Does not guarantee evidence will win a case — courts weigh its credibility',
    ],
  },
})

useScene(root, (_el, { isMobile }) => {
  gsap.fromTo('.tr-curtain', { clipPath: 'inset(0% 0% 100% 0% round 0 0 48px 48px)' }, {
    clipPath: 'inset(0% 0% 0% 0% round 0 0 0px 0px)', ease: 'power2.out',
    scrollTrigger: { trigger: root.value, start: 'top 85%', end: 'top 15%', scrub: true },
  })

  inOutTimeline('.tr-inner', 'top 75%', 'bottom 10%')
    .from('.tr-head .line-mask > span', { yPercent: 110, stagger: 0.15, ease: 'power3.out', duration: 1 })
    .from('.tr-col-a', { x: isMobile ? 0 : -80, y: isMobile ? 60 : 0, opacity: 0, duration: 1 }, 0.2)
    .from('.tr-col-b', { x: isMobile ? 0 : 80, y: isMobile ? 60 : 0, opacity: 0, duration: 1 }, 0.3)
    .fromTo('.tr-draw path', { drawSVG: '0%' }, { drawSVG: '100%', stagger: 0.05, duration: 0.6 }, 0.5)
    .from('.tr-item', { y: 16, opacity: 0, stagger: 0.06, duration: 0.5 }, 0.5)
    .to('.tr-inner', { y: -70, opacity: 0, ease: 'power2.in', duration: 1 }, '+=2')
})
</script>

<template>
  <section id="trust" ref="root" class="relative bg-paper" aria-labelledby="trust-title">
    <div class="tr-curtain relative overflow-hidden bg-[linear-gradient(180deg,#f2f5f9,#fffcfa)]">
      <div class="pointer-events-none absolute inset-0" data-depth="0" aria-hidden="true">
        <div class="absolute left-[-10%] top-0 size-[40vw] rounded-full bg-navy-500/10 blur-[120px]" />
      </div>
      <div class="pointer-events-none absolute right-[4%] top-[8%] hidden text-navy-900/[0.04] md:block" data-depth="2" aria-hidden="true">
        <HIcon name="shield" :size="420" :stroke="0.4" />
      </div>

      <div class="tr-inner relative mx-auto max-w-7xl px-6 py-28 md:py-40" data-depth="4">
        <header class="tr-head max-w-3xl">
          <p class="eyebrow text-navy-700">Trust &amp; Limits</p>
          <h2 id="trust-title" class="mt-6 font-display text-[clamp(2.2rem,5vw,4.4rem)] font-light leading-[1.15]">
            <span class="line-mask"><span>{{ t.h1 }}</span></span>
            <span class="line-mask"><span>{{ t.h2 }}<em class="text-gold font-medium">{{ t.h2Em }}</em>{{ t.h2Post }}</span></span>
          </h2>
        </header>

        <div class="mt-16 grid gap-6 md:grid-cols-2">
          <div class="tr-col-a rounded-[2rem] border border-navy-900/8 bg-white/80 p-8 md:p-10">
            <h3 class="flex items-center gap-3 font-display text-2xl">
              <span class="grid size-11 place-items-center rounded-xl bg-success/10 text-success"><HIcon name="check-circle" :size="22" class="tr-draw" /></span>
              {{ t.doesTitle }}
            </h3>
            <ul class="mt-8 space-y-4">
              <li v-for="d in t.does" :key="d" class="tr-item flex gap-3 text-[15px] text-navy-700">
                <HIcon name="check" :size="20" class="tr-draw mt-0.5 text-success" />{{ d }}
              </li>
            </ul>
          </div>
          <div class="tr-col-b rounded-[2rem] border border-navy-900/8 bg-navy-950 p-8 text-paper md:p-10">
            <h3 class="flex items-center gap-3 font-display text-2xl">
              <span class="grid size-11 place-items-center rounded-xl bg-white/5 text-coral-400"><HIcon name="ban" :size="22" class="tr-draw" /></span>
              {{ t.doesNotTitle }}
            </h3>
            <ul class="mt-8 space-y-4">
              <li v-for="d in t.doesNot" :key="d" class="tr-item flex gap-3 text-[15px] text-paper/80">
                <HIcon name="times" :size="20" class="tr-draw mt-0.5 text-coral-400" />{{ d }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
