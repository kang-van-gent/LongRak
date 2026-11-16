<script setup lang="ts">
/**
 * HOW IT WORKS — scrubbed timeline rail
 * Techniques: progress rail fills with scroll, nodes ignite, alternating
 * side-entry steps with DrawSVG icons, each step fades out as it leaves.
 */
import { gsap } from 'gsap'
import type { HumbleIconName } from '~/utils/humbleicons'

const root = ref<HTMLElement | null>(null)

const t = useCopy({
  th: {
    eyebrow: 'How it works',
    h1: 'ห้าขั้นตอน',
    h2: 'จากเอกสารสู่',
    h2Em: 'คำถามที่ใช่',
    lede: 'AI เป็นผู้ช่วยตรวจความครบถ้วน ไม่ใช่ทนาย วิศวกร หรือผู้ตรวจรับงาน',
    steps: [
      { title: 'อัปโหลด หรือเลือกเอกสารตัวอย่าง', body: 'ใบเสนอราคา สัญญา BOQ หรือตารางงวดจ่าย — หรือเริ่มจากเอกสารสมมติได้ทันที ไม่ต้องสมัคร ระบบจะแจ้งชนิดไฟล์ ขนาด และระยะเวลาเก็บก่อนทุกครั้ง' },
      { title: 'อ่านและแยกข้อมูลสำคัญ', body: 'คู่สัญญา ขอบเขตงาน วัสดุ ยอดเงิน งวด วันส่งมอบ เงื่อนไขตรวจรับ — ถ้าอ่านไม่ครบ ระบบจะบอกว่า “อ่านไม่ครบ” ไม่เดา' },
      { title: 'เทียบกับเช็กลิสต์และแหล่งอ้างอิง', body: 'กฎตรวจความครบถ้วน + คำนวณงวดเงินด้วยโค้ด + แนวทางจากแหล่งที่คัดกรองและมีวันที่กำกับ' },
      { title: 'อธิบายพร้อมหลักฐาน', body: 'ทุกข้อสังเกตอ้างอิงหน้าและข้อความในเอกสารของคุณ แบ่งเป็น ต้องทบทวน / ข้อมูลไม่พอ / พบข้อมูลตามเกณฑ์' },
      { title: 'รู้ว่าควรถามอะไรต่อ', body: 'ได้คำถามที่ควรคุยกับอีกฝ่ายก่อนเซ็นหรือโอนมัดจำ แล้วต่อยอดเป็นโครงการร่วมกันเมื่อพร้อม' },
    ],
  },
  en: {
    eyebrow: 'How it works',
    h1: 'Five steps',
    h2: 'from documents to ',
    h2Em: 'the right questions',
    lede: 'AI is an assistant that checks completeness — not a lawyer, an engineer or an inspector.',
    steps: [
      { title: 'Upload, or pick a sample document', body: 'A quotation, contract, BOQ or payment schedule — or start right away with a fictional document, no sign-up needed. You are always told the accepted file types, size limit and retention period first.' },
      { title: 'Read and extract the key details', body: 'Parties, scope, materials, amounts, milestones, handover dates, sign-off terms — if something can\'t be read, the system says “not fully readable” instead of guessing.' },
      { title: 'Compare against checklists and references', body: 'Completeness rules + milestone maths done in code + guidance from vetted, dated sources.' },
      { title: 'Explain with evidence', body: 'Every observation cites the page and text in your document, grouped as Needs review / Missing information / Found in document.' },
      { title: 'Know what to ask next', body: 'Get the questions to raise with the other side before signing or paying a deposit, then grow it into a shared project when you are ready.' },
    ],
  },
})

const stepMeta: { icon: HumbleIconName; tag: string }[] = [
  { icon: 'upload', tag: 'Upload' },
  { icon: 'search', tag: 'Identify' },
  { icon: 'clipboard', tag: 'Compare' },
  { icon: 'chat', tag: 'Explain' },
  { icon: 'sign-direction', tag: 'Next step' },
]
const steps = computed(() => stepMeta.map((m, i) => ({ ...m, ...t.value.steps[i]! })))

useScene(root, (_el, { isMobile }) => {
  inOutTimeline('.hw-head', 'top 95%', 'bottom 5%')
    .from('.hw-head .line-mask > span', { yPercent: 110, stagger: 0.15, ease: 'power3.out', duration: 1 })
    .from('.hw-head .hw-lede', { opacity: 0, y: 24, duration: 0.8 }, 0.3)
    .to('.hw-head', { opacity: 0, y: -50, ease: 'power2.in', duration: 1 }, '+=2')

  // Rail fills top→bottom (and empties when scrolling back)
  gsap.fromTo('.hw-progress', { scaleY: 0 }, {
    scaleY: 1, ease: 'none',
    scrollTrigger: { trigger: '.hw-list', start: 'top 60%', end: 'bottom 60%', scrub: true },
  })

  gsap.utils.toArray<HTMLElement>('.hw-step').forEach((step, i) => {
    const fromX = isMobile ? 40 : i % 2 === 0 ? -90 : 90
    inOutTimeline(step, 'top 88%', 'bottom 12%')
      .from(step.querySelector('.hw-node'), { scale: 0, ease: 'back.out(2)', duration: 0.6 }, 0)
      .to(step.querySelector('.hw-node'), { backgroundColor: '#daa442', borderColor: '#daa442', color: '#fffcfa', duration: 0.4 }, 0.5)
      .from(step.querySelector('.hw-body'), { x: fromX, opacity: 0, filter: 'blur(6px)', ease: 'power3.out', duration: 1 }, 0)
      .fromTo(step.querySelectorAll('.hw-icon path'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 1 }, 0.2)
      .from(step.querySelector('.hw-num'), { y: 60, opacity: 0, duration: 1 }, 0.1)
      .to(step.querySelector('.hw-body'), { y: -50, opacity: 0, ease: 'power2.in', duration: 1 }, '+=1.6')
      .to(step.querySelector('.hw-num'), { y: -80, opacity: 0, duration: 1 }, '<')
  })
})
</script>

<template>
  <section id="how" ref="root" class="relative overflow-hidden bg-paper py-28 md:py-40" aria-labelledby="how-title">
    <div class="pointer-events-none absolute inset-0" data-depth="0" aria-hidden="true">
      <div class="absolute -right-[10%] top-[20%] size-[40vw] rounded-full bg-coral-500/8 blur-[120px]" />
      <div class="absolute -left-[10%] bottom-[10%] size-[36vw] rounded-full bg-gold-300/20 blur-[120px]" />
    </div>

    <div class="relative mx-auto max-w-6xl px-6" data-depth="4">
      <header class="hw-head mx-auto max-w-2xl text-center">
        <p class="eyebrow justify-center text-navy-700">{{ t.eyebrow }}</p>
        <h2 id="how-title" class="mt-6 font-display text-[clamp(2.2rem,5vw,4.4rem)] font-light leading-[1.15]">
          <span class="line-mask"><span>{{ t.h1 }}</span></span>
          <span class="line-mask"><span>{{ t.h2 }}<em class="text-gold font-medium">{{ t.h2Em }}</em></span></span>
        </h2>
        <p class="hw-lede mt-6 text-[15.5px] leading-relaxed text-navy-700">
          {{ t.lede }}
        </p>
      </header>

      <ol class="hw-list relative mt-24">
        <!-- rail -->
        <div class="absolute bottom-0 left-6 top-0 w-px bg-navy-900/10 md:left-1/2" aria-hidden="true">
          <div class="hw-progress h-full w-full origin-top bg-gradient-to-b from-gold-500 via-coral-500 to-peach-400" />
        </div>

        <li
          v-for="(s, i) in steps"
          :key="s.tag"
          class="hw-step relative grid gap-8 py-12 pl-16 md:grid-cols-2 md:gap-24 md:py-16 md:pl-0"
        >
          <span
            class="hw-node absolute left-6 top-14 z-10 grid size-9 -translate-x-1/2 place-items-center rounded-full border border-navy-900/15 bg-paper font-mono text-[12px] text-navy-700 md:left-1/2 md:top-[4.5rem]"
            aria-hidden="true"
          >{{ i + 1 }}</span>

          <div class="hw-body" :class="i % 2 === 1 ? 'md:col-start-2' : 'md:text-right'">
            <div class="flex items-center gap-4" :class="i % 2 === 1 ? '' : 'md:flex-row-reverse'">
              <span class="hw-icon grid size-14 shrink-0 place-items-center rounded-2xl border border-navy-900/8 bg-white text-navy-900 shadow-[0_16px_40px_-24px_rgba(19,45,80,.5)]">
                <HIcon :name="s.icon" :size="26" :stroke="1.5" />
              </span>
              <span class="font-mono text-[11px] tracking-[0.25em] text-gold-600 uppercase">{{ s.tag }}</span>
            </div>
            <h3 class="mt-5 font-display text-2xl font-normal md:text-3xl">{{ s.title }}</h3>
            <p class="mt-3 text-[15px] leading-relaxed text-navy-700">{{ s.body }}</p>
          </div>

          <div
            class="hw-num pointer-events-none hidden select-none self-center font-display text-[9rem] font-extralight leading-none text-navy-900/[0.06] md:block"
            :class="i % 2 === 1 ? 'md:col-start-1 md:row-start-1 md:text-right' : ''"
            aria-hidden="true"
          >0{{ i + 1 }}</div>
        </li>
      </ol>
    </div>
  </section>
</template>
