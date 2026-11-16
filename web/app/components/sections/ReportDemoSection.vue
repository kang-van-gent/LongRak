<script setup lang="ts">
/**
 * AI RISK REPORT DEMO — pinned scrub scene (precomputed sample, clearly labelled Demo)
 * Techniques: scanner beam sweep, highlighter reveal tied to findings,
 * scrubbed counter, cascading card stack, cinematic exit.
 * Copy follows context.md §7/§10: labels are "needs review / missing / present",
 * never "safe", "legal", or accusations.
 */
import { gsap } from 'gsap'
import type { HumbleIconName } from '~/utils/humbleicons'

const root = ref<HTMLElement | null>(null)
const scrollTo = useSmoothScroll()
const stage = ref<HTMLElement | null>(null)
const fit = ref<HTMLElement | null>(null)
useFitHeight(stage, fit)

type Hl = 'ok' | 'warn' | 'missing'
type Line = { k: string; v: string; hl?: Hl; desktopOnly?: boolean }
type Finding = { title: string; evidence: string; ask: string }

const t = useCopy<{
  title: string; titleEm: string; demo: string; docTitle: string; page: string
  lines: Line[]; ratio: string; sum: string; sumOk: string; byCode: string
  labels: [string, string, string]; findings: [Finding, Finding, Finding]
  limit: string; cta: string
}>({
  th: {
    title: 'หาจุดที่ควร',
    titleEm: 'ถามก่อนเซ็น',
    demo: 'DEMO · เอกสารสมมติ ไม่ใช่ข้อมูลลูกค้าจริง',
    docTitle: 'ใบเสนอราคา — รีโนเวทห้องครัว',
    page: 'หน้า 2/3',
    lines: [
      { k: 'ผู้ว่าจ้าง', v: 'คุณ ก. (สมมติ)' },
      { k: 'ผู้รับจ้าง', v: 'ร้าน ข. บิ้วอิน (สมมติ)', desktopOnly: true },
      { k: 'ขอบเขตงาน', v: 'รื้อถอนและติดตั้งชุดครัวใหม่ 3.2 ม.', desktopOnly: true },
      { k: 'ยอดรวม', v: '200,000 บาท', hl: 'ok' },
      { k: 'งวดที่ 1', v: 'มัดจำ 100,000 บาท', hl: 'warn' },
      { k: 'งวดที่ 2', v: '60,000 บาท เมื่อติดตั้งตู้', hl: 'ok' },
      { k: 'งวดที่ 3', v: '40,000 บาท เมื่อส่งมอบ', hl: 'ok' },
      { k: 'กำหนดแล้วเสร็จ', v: '— ไม่ระบุ —', hl: 'missing' },
    ],
    ratio: 'สัดส่วนจ่ายล่วงหน้า',
    sum: 'ผลรวมงวด vs ยอดสัญญา',
    sumOk: 'ตรงกัน',
    byCode: 'คำนวณด้วยโค้ด ไม่ใช่ AI',
    labels: ['ต้องทบทวน', 'ข้อมูลไม่พอ', 'พบข้อมูลตามเกณฑ์'],
    findings: [
      {
        title: 'ยังไม่พบรายละเอียดรองรับการจ่ายล่วงหน้า',
        evidence: 'หน้า 2 · “งวดที่ 1 มัดจำ 100,000 บาท”',
        ask: 'เงินก้อนนี้ใช้ซื้อวัสดุอะไร และมีหลักฐานการจัดซื้อ/ส่งมอบอย่างไร',
      },
      {
        title: 'ไม่พบกำหนดวันแล้วเสร็จ',
        evidence: 'ไม่พบข้อความในเอกสารที่อ่านได้',
        ask: 'ขอวันเริ่ม–วันส่งมอบ และเงื่อนไขที่ขยายเวลาได้',
      },
      {
        title: 'ผลรวมงวดเท่ากับยอดสัญญา',
        evidence: '100,000 + 60,000 + 40,000 = 200,000 (ตรวจด้วยโค้ด)',
        ask: 'พบข้อมูลเท่านั้น — ไม่ได้รับรองความถูกต้องของงานหรือราคา',
      },
    ],
    limit: 'ไม่ใช่คำปรึกษาทางกฎหมายหรือผลตรวจของวิศวกร',
    cta: 'ขอทดลองกับเอกสารจริง',
  },
  en: {
    title: 'Find what to ',
    titleEm: 'ask before you sign',
    demo: 'DEMO · fictional document, not real customer data',
    docTitle: 'Quotation — kitchen renovation',
    page: 'page 2/3',
    lines: [
      { k: 'Client', v: 'Khun A. (fictional)' },
      { k: 'Contractor', v: 'B. Built-in Shop (fictional)', desktopOnly: true },
      { k: 'Scope', v: 'Remove and install new 3.2 m kitchen', desktopOnly: true },
      { k: 'Total', v: '200,000 THB', hl: 'ok' },
      { k: 'Milestone 1', v: 'Deposit 100,000 THB', hl: 'warn' },
      { k: 'Milestone 2', v: '60,000 THB on cabinet install', hl: 'ok' },
      { k: 'Milestone 3', v: '40,000 THB on handover', hl: 'ok' },
      { k: 'Completion date', v: '— not stated —', hl: 'missing' },
    ],
    ratio: 'Paid in advance',
    sum: 'Milestones vs contract total',
    sumOk: 'Match',
    byCode: 'Calculated by code, not AI',
    labels: ['Needs review', 'Missing information', 'Found in document'],
    findings: [
      {
        title: 'No details found supporting the advance payment',
        evidence: 'page 2 · “Milestone 1: deposit 100,000 THB”',
        ask: 'What materials does this payment buy, and what proof of purchase or delivery will there be?',
      },
      {
        title: 'No completion date found',
        evidence: 'No matching text found in the readable document',
        ask: 'Ask for start and handover dates, and the conditions under which they can be extended.',
      },
      {
        title: 'Milestones add up to the contract total',
        evidence: '100,000 + 60,000 + 40,000 = 200,000 (checked by code)',
        ask: 'Information found only — this does not certify the work or the price.',
      },
    ],
    limit: 'Not legal advice or an engineer\'s inspection',
    cta: 'Try it with a real document',
  },
})

const docLines = computed(() => t.value.lines)

const findingMeta: { status: string; icon: HumbleIconName; tone: string }[] = [
  { status: 'needs_attention', icon: 'exclamation-triangle', tone: 'text-coral-500 bg-coral-500/10' },
  { status: 'missing_information', icon: 'clock', tone: 'text-warning bg-warning/10' },
  { status: 'present_in_document', icon: 'check-circle', tone: 'text-success bg-success/10' },
]
const findings = computed(() =>
  findingMeta.map((m, i) => ({ ...m, label: t.value.labels[i]!, ...t.value.findings[i]! })),
)

const hlClass: Record<string, string> = {
  warn: 'bg-coral-500/20',
  missing: 'bg-warning/20',
  ok: 'bg-success/12',
}

useScene(root, (_el, { isMobile }) => {
  const doc = root.value!.querySelector<HTMLElement>('.rp-doc')!
  const pct = root.value!.querySelector<HTMLElement>('.rp-pct')!
  const counter = { v: 0 }
  pct.textContent = '0%'

  const tl = gsap.timeline({
    scrollTrigger: { trigger: root.value, start: 'top top', end: isMobile ? '+=200%' : '+=260%', scrub: true, pin: true },
  })

  // IN
  tl.from('.rp-head .line-mask > span', { yPercent: 110, stagger: 0.02, duration: 0.06, ease: 'power3.out' }, 0)
    .from('.rp-doc-wrap', { y: 120, rotateX: 18, opacity: 0, duration: 0.1, ease: 'power3.out' }, 0.02)
    .from('.rp-panel', { y: 80, opacity: 0, duration: 0.1, ease: 'power3.out' }, 0.06)
    // Scanner sweeps the document
    .fromTo('.rp-scan', { y: 0, opacity: 0 }, { opacity: 1, duration: 0.02 }, 0.12)
    .to('.rp-scan', { y: () => doc.offsetHeight - 8, ease: 'none', duration: 0.48 }, 0.12)
    .to('.rp-scan', { opacity: 0, duration: 0.03 }, 0.6)

  // Highlights land as the beam passes each line
  gsap.utils.toArray<HTMLElement>('.rp-hl').forEach((hl, i, all) => {
    tl.from(hl, { scaleX: 0, duration: 0.04, ease: 'power2.out' }, 0.14 + (i / all.length) * 0.44)
  })

  // Deposit ratio counter 0 → 50%
  tl.to(counter, {
    v: 50, duration: 0.12, ease: 'power1.out',
    onUpdate: () => { pct.textContent = `${Math.round(counter.v)}%` },
  }, 0.3)
    .from('.rp-ratio-bar', { scaleX: 0, duration: 0.12, ease: 'power1.out' }, 0.3)

  // Findings stack like cards (each new one pushes the previous back)
  const cards = gsap.utils.toArray<HTMLElement>('.rp-card')
  const at = [0.34, 0.47, 0.58]
  cards.forEach((card, i) => {
    tl.from(card, { yPercent: 110, opacity: 0, rotate: 2, duration: 0.07, ease: 'power3.out' }, at[i])
    cards.slice(0, i).forEach((prev, j) => {
      const depth = i - j
      tl.to(prev, { y: -14 * depth, scale: 1 - 0.05 * depth, opacity: 1 - 0.25 * depth, duration: 0.07 }, at[i])
    })
  })
  tl.from('.rp-limit', { opacity: 0, y: 16, duration: 0.05 }, 0.66)

  // OUT
  tl.to('.rp-stage', { scale: 0.9, y: -60, opacity: 0, filter: 'blur(10px)', duration: 0.12, ease: 'power2.in' }, 0.88)

  return () => { pct.textContent = '50%' }
})
</script>

<template>
  <section id="report" ref="root" data-anchor-progress="0.74" class="relative h-svh overflow-hidden bg-paper" aria-labelledby="report-title">
    <!-- DEPTH 0/1 -->
    <div class="pointer-events-none absolute inset-0" data-depth="0" aria-hidden="true">
      <div class="absolute inset-0 bg-[linear-gradient(180deg,#fffcfa,#f8f1ea)]" />
      <div class="absolute inset-0 opacity-[0.5] [background-image:linear-gradient(rgba(19,45,80,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(19,45,80,.05)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(70%_60%_at_50%_50%,#000,transparent)]" />
    </div>
    <div class="pointer-events-none absolute inset-0" data-depth="1" aria-hidden="true">
      <div class="absolute left-[20%] top-[30%] size-[34vw] rounded-full bg-coral-500/10 blur-[110px]" />
    </div>

    <div ref="stage" class="rp-stage relative mx-auto flex h-full max-w-7xl flex-col justify-center px-4 pb-4 pt-20 md:px-6 md:pt-16 compact:pt-16 short:pt-14">
      <!-- scaled down by useFitHeight only if it can't fit the viewport -->
      <div ref="fit" class="flex flex-col gap-5 md:gap-10 compact:gap-4 short:gap-4" data-depth="4">
      <header class="rp-head flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="eyebrow text-navy-700">AI Document Risk Report</p>
          <h2 id="report-title" class="mt-3 font-display text-[clamp(1.6rem,3.6vw,3.2rem)] font-light leading-[1.15] compact:mt-2">
            <span class="line-mask"><span>{{ t.title }}<em class="text-heart font-medium">{{ t.titleEm }}</em></span></span>
          </h2>
        </div>
        <span class="line-mask"><span class="inline-flex w-fit items-center gap-2 rounded-full border border-warning/30 bg-warning/10 px-3 py-1 font-mono text-[11px] text-warning">
          <HIcon name="flask" :size="14" />{{ t.demo }}
        </span></span>
      </header>

      <div class="grid items-center gap-4 md:grid-cols-[1.05fr_1fr] md:gap-10 [perspective:1600px] [&>*]:min-w-0">
        <!-- DEPTH 3 — the document under the scanner -->
        <div class="rp-doc-wrap relative">
          <div class="rp-doc relative overflow-hidden rounded-[1.6rem] border border-navy-900/10 bg-white p-5 shadow-[0_40px_100px_-40px_rgba(19,45,80,.45)] md:p-8 compact:p-4">
            <div class="flex items-center justify-between border-b border-dashed border-navy-900/15 pb-3 md:pb-4">
              <div class="flex items-center gap-2 text-navy-900">
                <HIcon name="document" :size="18" />
                <span class="font-display text-base md:text-lg">{{ t.docTitle }}</span>
              </div>
              <span class="font-mono text-[10px] text-navy-500">{{ t.page }}</span>
            </div>
            <dl class="mt-3 space-y-1.5 text-[13px] md:mt-4 md:space-y-2.5 md:text-[14.5px]">
              <!-- on short screens only the highlighted lines (the ones the findings refer to) are kept -->
              <div
                v-for="l in docLines"
                :key="l.k"
                class="relative justify-between gap-4 rounded-md px-2 py-0.5 md:py-1"
                :class="l.desktopOnly ? 'hidden md:flex short:hidden' : l.hl ? 'flex' : 'flex compact:max-md:hidden short:hidden'"
              >
                <span v-if="l.hl" class="rp-hl absolute inset-0 origin-left rounded-md" :class="hlClass[l.hl]" aria-hidden="true" />
                <dt class="relative text-navy-500">{{ l.k }}</dt>
                <dd class="relative text-right font-medium text-navy-900">{{ l.v }}</dd>
              </div>
            </dl>
            <!-- scanner beam -->
            <div class="rp-scan pointer-events-none absolute inset-x-0 top-0 h-2" aria-hidden="true">
              <div class="h-px w-full bg-gold-500 shadow-[0_0_24px_6px_rgba(218,164,66,.55)] [animation:scan-glow_1.2s_ease-in-out_infinite]" />
              <div class="h-16 w-full -translate-y-16 bg-gradient-to-t from-gold-300/30 to-transparent" />
            </div>
          </div>
        </div>

        <!-- DEPTH 4 — report panel -->
        <div class="rp-panel">
          <div class="hidden grid-cols-2 gap-3 md:grid short:hidden">
            <div class="rounded-2xl border border-navy-900/8 bg-white/70 p-4">
              <p class="text-[12px] text-navy-500">{{ t.ratio }}</p>
              <p class="mt-1 font-display text-3xl text-navy-900"><span class="rp-pct">50%</span></p>
              <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-navy-900/8">
                <div class="rp-ratio-bar h-full w-1/2 origin-left rounded-full bg-gradient-to-r from-peach-400 to-coral-500" />
              </div>
            </div>
            <div class="rounded-2xl border border-navy-900/8 bg-white/70 p-4">
              <p class="text-[12px] text-navy-500">{{ t.sum }}</p>
              <p class="mt-1 flex items-center gap-2 font-display text-3xl text-navy-900">
                {{ t.sumOk }} <HIcon name="check" :size="22" class="text-success" />
              </p>
              <p class="mt-1 text-[11px] text-navy-500">{{ t.byCode }}</p>
            </div>
          </div>

          <!-- cascading findings stack -->
          <!-- all cards share one grid cell: the stack is as tall as the tallest card (+ room for the cards pushed back) -->
          <div class="mt-2 grid pt-7 md:mt-4">
            <article
              v-for="(f, i) in findings"
              :key="f.status"
              class="rp-card relative col-start-1 row-start-1 self-end rounded-2xl border border-navy-900/8 bg-white p-5 shadow-[0_24px_60px_-30px_rgba(19,45,80,.45)] compact:p-4"
              :style="{ zIndex: i + 1 }"
            >
              <span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium" :class="f.tone">
                <HIcon :name="f.icon" :size="14" />{{ f.label }}
              </span>
              <h3 class="mt-3 font-display text-lg leading-snug text-navy-900 md:text-xl compact:mt-2 compact:text-base">{{ f.title }}</h3>
              <p class="mt-2 flex items-start gap-2 font-mono text-[11.5px] text-navy-500 compact:max-md:hidden short:hidden">
                <HIcon name="bookmark" :size="14" class="mt-px" />{{ f.evidence }}
              </p>
              <p class="mt-3 flex items-start gap-2 text-[13.5px] text-navy-700 compact:mt-2 compact:text-[13px]">
                <HIcon name="user-asking" :size="16" class="mt-0.5 text-gold-600" />{{ f.ask }}
              </p>
            </article>
          </div>

          <div class="rp-limit mt-5 flex flex-wrap items-center justify-between gap-3 compact:mt-3">
            <p class="flex items-start gap-2 text-[12px] text-navy-500">
              <HIcon name="info-circle" :size="15" class="mt-px" />
              {{ t.limit }}
            </p>
            <a href="#contact" class="btn-primary group !py-2.5 !text-[14px]" @click.prevent="scrollTo('#contact')">
              {{ t.cta }}
              <HIcon name="arrow-right" :size="16" class="icon-nudge" />
            </a>
          </div>
        </div>
      </div>
      </div>
    </div>
  </section>
</template>
