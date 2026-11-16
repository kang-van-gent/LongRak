<script setup lang="ts">
/**
 * TWO-SIDED VALUE — scrubbed in/out
 * Techniques: split-converge cards meeting at a gold seam, DrawSVG icons,
 * masked heading lines, velocity-style dual marquee driven by scroll.
 */
import { gsap } from 'gsap'
import type { HumbleIconName } from '~/utils/humbleicons'

const root = ref<HTMLElement | null>(null)

const t = useCopy({
  th: {
    eyebrow: 'ปัญหาที่ตั้งใจแก้',
    h1: 'ความกังวลเกิดขึ้นได้',
    h2: 'ทั้ง',
    h2Em: 'สองฝ่าย',
    lede: 'ปัญหาส่วนใหญ่ไม่ได้เริ่มจากคนไม่ดี แต่เริ่มจากข้อตกลงที่ไม่ชัด และหลักฐานที่กระจัดกระจาย',
    owner: {
      who: 'เจ้าของบ้าน / ผู้ว่าจ้าง',
      worries: [
        'กังวลว่าโอนมัดจำแล้วงานจะไม่เดินตามที่ตกลง',
        'ไม่แน่ใจว่างานคืบหน้าจริงแค่ไหน',
        'งวดเงินไม่สัมพันธ์กับงานที่ส่งมอบ',
        'เปลี่ยนแบบกลางทางโดยไม่มีบันทึก',
      ],
      value: 'เห็นข้อตกลงและงวดจ่ายชัดเจน ก่อนโอนมัดจำ',
    },
    contractor: {
      who: 'ผู้รับเหมา / ร้านบิ้วอิน',
      worries: [
        'กังวลเรื่องค้างจ่ายหรือเลื่อนจ่าย',
        'การแก้แบบที่ไม่มีจุดสิ้นสุด',
        'ไม่มีขั้นตอนตรวจรับที่ชัดเจน',
        'ไม่มีช่องทางพิสูจน์งานเพื่อขอรับเงินตามงวด',
      ],
      value: 'มีพื้นที่ส่งผลงาน ขอเบิกเงิน และบันทึกการตรวจรับที่เป็นธรรม',
    },
    both: 'ทั้งสองฝ่าย:',
    bothValue: 'มีประวัติเอกสารและการเปลี่ยนแปลง ตรวจสอบร่วมกันได้',
    scattered: ['แชต LINE', 'สลิปโอนเงิน', 'รูปในมือถือ', 'ใบเสนอราคา', 'ข้อความเสียง', 'แบบที่แก้แล้ว', 'ตกลงทางโทรศัพท์'],
    captionA: 'ข้อมูลที่กระจายอยู่ใน LINE โทรศัพท์ สลิป และรูปในมือถือ ทำให้ยากจะย้อนดูว่า ',
    captionStrong: 'ใครตกลงอะไร เมื่อไร',
  },
  en: {
    eyebrow: 'The problem we set out to solve',
    h1: 'Worry runs',
    h2: 'on ',
    h2Em: 'both sides',
    lede: 'Most disputes do not start with bad people. They start with unclear agreements and scattered evidence.',
    owner: {
      who: 'Homeowner / client',
      worries: [
        'Worried the work won\'t follow the agreement once the deposit is paid',
        'Unsure how far the work has really progressed',
        'Payment milestones don\'t match the work delivered',
        'Design changes mid-way with nothing written down',
      ],
      value: 'See the agreement and payment schedule clearly before paying a deposit',
    },
    contractor: {
      who: 'Contractor / built-in workshop',
      worries: [
        'Worried about late or withheld payments',
        'Revisions that never end',
        'No clear sign-off process',
        'No way to prove the work to claim each milestone payment',
      ],
      value: 'A place to submit work, request payment and record a fair sign-off',
    },
    both: 'Both sides:',
    bothValue: 'a shared history of documents and changes that both can check',
    scattered: ['LINE chats', 'Transfer slips', 'Phone photos', 'Quotations', 'Voice messages', 'Revised drawings', 'Agreed by phone'],
    captionA: 'With information spread across LINE, phone calls, slips and photos, it is hard to look back and see ',
    captionStrong: 'who agreed to what, and when',
  },
})

const sideMeta: { key: 'owner' | 'contractor'; icon: HumbleIconName }[] = [
  { key: 'owner', icon: 'home' },
  { key: 'contractor', icon: 'briefcase' },
]
const sides = computed(() => sideMeta.map((m) => ({ ...m, ...t.value[m.key] })))

const scatterIcons: HumbleIconName[] = ['chat', 'credit-card', 'camera', 'document', 'microphone', 'pencil', 'phone']
const scattered = computed(() => scatterIcons.map((icon, i) => ({ icon, text: t.value.scattered[i]! })))

useScene(root, (_el, { isMobile }) => {
  // Heading
  inOutTimeline('.ts-head', 'top 95%', 'bottom 5%')
    .from('.ts-head .line-mask > span', { yPercent: 110, stagger: 0.15, ease: 'power3.out', duration: 1 })
    .from('.ts-head .ts-lede', { y: 30, opacity: 0, duration: 0.8 }, 0.3)
    .to('.ts-head', { y: -60, opacity: 0, ease: 'power2.in', duration: 1 }, '+=2.2')

  // Cards converge on the seam, then lift away
  const dx = isMobile ? 60 : 180
  inOutTimeline('.ts-grid', 'top 95%', 'bottom 5%')
    .from('.ts-card-owner', { x: -dx, rotate: -5, opacity: 0, ease: 'power3.out', duration: 1 }, 0)
    .from('.ts-card-contractor', { x: dx, rotate: 5, opacity: 0, ease: 'power3.out', duration: 1 }, 0)
    .from('.ts-seam-line', { scaleY: 0, ease: 'none', duration: 1 }, 0.1)
    .fromTo('.ts-draw path', { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.9, stagger: 0.1 }, 0.2)
    .from('.ts-worry', { y: 18, opacity: 0, stagger: 0.06, duration: 0.5 }, 0.4)
    .from('.ts-value', { y: 20, opacity: 0, stagger: 0.1, duration: 0.5 }, 0.8)
    .to('.ts-card-owner', { x: -dx * 0.4, y: -60, opacity: 0, ease: 'power2.in', duration: 1 }, '+=2.2')
    .to('.ts-card-contractor', { x: dx * 0.4, y: -60, opacity: 0, ease: 'power2.in', duration: 1 }, '<')
    .to('.ts-seam', { opacity: 0, scale: 0.8, duration: 1 }, '<')

  // Scattered evidence marquee — rows drift in opposite directions with scroll
  gsap.fromTo('.ts-row-a', { xPercent: 0 }, {
    xPercent: -35, ease: 'none',
    scrollTrigger: { trigger: '.ts-marquee', start: 'top bottom', end: 'bottom top', scrub: true },
  })
  gsap.fromTo('.ts-row-b', { xPercent: -35 }, {
    xPercent: 0, ease: 'none',
    scrollTrigger: { trigger: '.ts-marquee', start: 'top bottom', end: 'bottom top', scrub: true },
  })
  inOutTimeline('.ts-marquee-caption', 'top 95%', 'bottom 5%')
    .from('.ts-marquee-caption', { y: 30, opacity: 0, duration: 1 })
    .to('.ts-marquee-caption', { y: -30, opacity: 0, duration: 1 }, '+=2')
})
</script>

<template>
  <section id="why" ref="root" class="relative overflow-hidden bg-paper py-28 md:py-40" aria-labelledby="why-title">
    <!-- DEPTH 0/1 -->
    <div class="pointer-events-none absolute inset-0" data-depth="0" aria-hidden="true">
      <div class="absolute left-1/2 top-[30%] size-[60vw] -translate-x-1/2 rounded-full bg-peach-400/10 blur-[120px]" />
    </div>

    <div class="relative mx-auto max-w-7xl px-6" data-depth="4">
      <header class="ts-head mx-auto max-w-3xl text-center">
        <p class="eyebrow justify-center text-navy-700">{{ t.eyebrow }}</p>
        <h2 id="why-title" class="mt-6 font-display text-[clamp(2.2rem,5vw,4.4rem)] font-light leading-[1.15]">
          <span class="line-mask"><span>{{ t.h1 }}</span></span>
          <span class="line-mask"><span>{{ t.h2 }}<em class="text-gold font-medium">{{ t.h2Em }}</em></span></span>
        </h2>
        <p class="ts-lede mx-auto mt-6 max-w-xl text-[15.5px] leading-relaxed text-navy-700">
          {{ t.lede }}
        </p>
      </header>

      <div class="ts-grid mt-20 grid items-stretch gap-6 md:grid-cols-[1fr_auto_1fr] md:gap-10">
        <article
          v-for="(s, i) in sides"
          :key="s.key"
          :class="[`ts-card-${s.key}`, i === 1 ? 'md:order-3' : 'md:order-1']"
          class="relative overflow-hidden rounded-[2rem] border border-navy-900/8 bg-white/70 p-8 shadow-[0_30px_80px_-40px_rgba(19,45,80,.35)] backdrop-blur md:p-10"
        >
          <div class="flex items-center gap-4">
            <span class="grid size-14 place-items-center rounded-2xl bg-paper-2 text-navy-900">
              <HIcon :name="s.icon" :size="28" :stroke="1.6" class="ts-draw" />
            </span>
            <h3 class="font-display text-2xl font-normal">{{ s.who }}</h3>
          </div>
          <ul class="mt-8 space-y-4">
            <li v-for="w in s.worries" :key="w" class="ts-worry flex gap-3 text-[15px] text-navy-700">
              <HIcon name="minus" :size="20" class="mt-0.5 text-coral-500" />
              {{ w }}
            </li>
          </ul>
          <p class="ts-value mt-10 flex gap-3 border-t border-navy-900/10 pt-6 text-[15px] font-medium text-navy-900">
            <HIcon name="heart" :size="20" class="mt-0.5 text-coral-500 icon-heartbeat" />
            <span><span class="text-gold-600">LongRak:</span> {{ s.value }}</span>
          </p>
        </article>

        <!-- the seam: neutral middle ground -->
        <div class="ts-seam relative flex items-center justify-center md:order-2 md:flex-col" aria-hidden="true">
          <span class="ts-seam-line absolute inset-y-0 left-1/2 hidden w-px origin-top bg-gradient-to-b from-transparent via-gold-500 to-transparent md:block" />
          <span class="relative grid size-16 place-items-center rounded-full border border-gold-500/40 bg-paper text-coral-500 shadow-[0_0_0_10px_rgba(255,252,250,1)]">
            <HIcon name="heart" :size="28" :stroke="1.6" class="ts-draw icon-heartbeat" />
          </span>
        </div>
      </div>
      <p class="mt-8 text-center text-[15px] font-medium text-navy-900">
        <span class="text-gold-600">{{ t.both }}</span> {{ t.bothValue }}
      </p>
    </div>

    <!-- Scattered evidence marquee -->
    <div class="ts-marquee relative mt-28 space-y-4 [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]" aria-hidden="true">
      <div v-for="row in ['ts-row-a', 'ts-row-b']" :key="row" :class="row" class="flex w-max gap-4">
        <span
          v-for="n in 3"
          :key="n"
          class="flex gap-4"
        >
          <span
            v-for="s in scattered"
            :key="s.icon"
            class="flex items-center gap-3 whitespace-nowrap rounded-full border border-navy-900/10 bg-white/60 px-6 py-3 font-display text-xl font-light text-navy-700"
          >
            <HIcon :name="s.icon" :size="20" class="text-gold-600" />{{ s.text }}
          </span>
        </span>
      </div>
    </div>
    <p class="ts-marquee-caption mx-auto mt-10 max-w-xl px-6 text-center text-[15px] leading-relaxed text-navy-700">
      {{ t.captionA }}<strong class="font-medium text-navy-900">{{ t.captionStrong }}</strong>
    </p>
  </section>
</template>
