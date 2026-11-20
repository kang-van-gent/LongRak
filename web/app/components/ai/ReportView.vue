<script setup lang="ts">
/**
 * Renders an AI Document Risk Report (shared/utils/aiReport.ts) — the precomputed
 * sample or a real result from n8n. Checklist + evidence + questions, never a
 * "safe / legal / scam" verdict (context.md §5, §7).
 */
import { gsap } from 'gsap'
import type { AiReport, FindingStatus } from '#shared/utils/aiReport'
import type { HumbleIconName } from '~/utils/humbleicons'

const props = defineProps<{ report: AiReport }>()
const emit = defineEmits<{ reset: []; request: [] }>()
const { locale } = useI18n()

const t = useCopy({
  th: {
    sample: 'SAMPLE · เอกสารสมมติ ผลลัพธ์คำนวณไว้ล่วงหน้า',
    result: 'ผลการวิเคราะห์',
    summary: 'สรุป',
    total: 'ยอดรวมสัญญา',
    advance: 'จ่ายล่วงหน้า',
    match: 'ผลรวมงวด vs ยอดสัญญา',
    matchYes: 'ตรงกัน',
    matchNo: 'ไม่ตรงกัน',
    unknown: 'ไม่พบข้อมูล',
    byCode: 'คำนวณด้วยโค้ด ไม่ใช่ AI',
    findings: 'ข้อสังเกต',
    evidence: 'หลักฐานในเอกสาร',
    page: (n: number) => `หน้า ${n}`,
    noEvidence: 'ไม่พบข้อความที่เกี่ยวข้องในเอกสารที่อ่านได้',
    ask: 'ควรถามอีกฝ่าย',
    action: 'สิ่งที่ทำได้',
    pro: 'ควรให้ผู้เชี่ยวชาญตรวจเพิ่ม',
    sources: 'แหล่งอ้างอิง',
    missing: 'ข้อมูลที่ยังไม่พบ',
    limits: 'ข้อจำกัดของผลวิเคราะห์',
    partial: 'อ่านเอกสารได้ไม่ครบ — ผลลัพธ์อาจขาดบางส่วน ลองอัปโหลดไฟล์ที่ชัดขึ้นหรือเป็น PDF ที่เลือกข้อความได้',
    unreadable: 'อ่านเอกสารไม่ได้ — ระบบจะไม่สรุปผลจากเอกสารที่อ่านไม่ออก กรุณาอัปโหลดไฟล์ใหม่',
    print: 'พิมพ์ / บันทึกเป็น PDF',
    again: 'ตรวจเอกสารอื่น',
    pilot: 'ขอเปิดโครงการ',
    none: 'ไม่มีข้อสังเกตในหมวดนี้',
  },
  en: {
    sample: 'SAMPLE · fictional document, precomputed result',
    result: 'Analysis result',
    summary: 'Summary',
    total: 'Contract total',
    advance: 'Paid in advance',
    match: 'Milestones vs contract total',
    matchYes: 'Match',
    matchNo: 'Mismatch',
    unknown: 'Not found',
    byCode: 'Calculated by code, not AI',
    findings: 'Findings',
    evidence: 'Evidence in the document',
    page: (n: number) => `page ${n}`,
    noEvidence: 'No related text found in the readable document',
    ask: 'Ask the other side',
    action: 'What you can do',
    pro: 'Worth a professional review',
    sources: 'Sources',
    missing: 'Not found in the document',
    limits: 'Limitations of this analysis',
    partial: 'The document was not fully readable — results may be incomplete. Try a clearer file or a PDF with selectable text.',
    unreadable: 'The document could not be read — no conclusions are drawn from unreadable files. Please upload a new file.',
    print: 'Print / save as PDF',
    again: 'Check another document',
    pilot: 'Request a project',
    none: 'No findings in this group',
  },
})

const statusMeta = computed<Record<FindingStatus, { label: string; icon: HumbleIconName; tone: string; rank: number }>>(() => {
  const th = locale.value !== 'en'
  return {
    needs_attention: { label: th ? 'ต้องทบทวน' : 'Needs review', icon: 'exclamation-triangle', tone: 'text-coral-500 bg-coral-500/10 border-coral-500/20', rank: 0 },
    missing_information: { label: th ? 'ข้อมูลไม่พอ' : 'Missing information', icon: 'clock', tone: 'text-warning bg-warning/10 border-warning/25', rank: 1 },
    unable_to_assess: { label: th ? 'ประเมินไม่ได้' : 'Unable to assess', icon: 'eye-off', tone: 'text-navy-500 bg-navy-900/5 border-navy-900/10', rank: 2 },
    present_in_document: { label: th ? 'พบข้อมูลตามเกณฑ์' : 'Found in document', icon: 'check-circle', tone: 'text-success bg-success/10 border-success/20', rank: 3 },
    not_applicable: { label: th ? 'ไม่เกี่ยวข้อง' : 'Not applicable', icon: 'minus-circle', tone: 'text-navy-500 bg-navy-900/5 border-navy-900/10', rank: 4 },
  }
})

const sorted = computed(() =>
  [...props.report.findings].sort((a, b) => statusMeta.value[a.status].rank - statusMeta.value[b.status].rank),
)
const counts = computed(() => {
  const c = new Map<FindingStatus, number>()
  props.report.findings.forEach((f) => c.set(f.status, (c.get(f.status) ?? 0) + 1))
  return [...c.entries()].sort((a, b) => statusMeta.value[a[0]].rank - statusMeta.value[b[0]].rank)
})

const fmt = (n?: number) => (n === undefined ? '—' : new Intl.NumberFormat(locale.value === 'en' ? 'en-US' : 'th-TH').format(n))
const currency = computed(() => (locale.value === 'en' ? 'THB' : 'บาท'))
const amounts = computed(() => props.report.amounts)
const hasAmounts = computed(() => amounts.value.contract_total_thb !== undefined || amounts.value.advance_thb !== undefined)

const printReport = () => window.print()

// Entrance (not scroll-bound: this content appears after an action, not on scroll)
const root = ref<HTMLElement | null>(null)
let ctx: gsap.Context | undefined
onMounted(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  ctx = gsap.context(() => {
    gsap.from('.rv-in', { y: 24, opacity: 0, duration: 0.7, stagger: 0.07, ease: 'power3.out' })
    gsap.from('.rv-bar', { scaleX: 0, duration: 1.1, ease: 'power2.out', delay: 0.3 })
  }, root.value!)
})
onBeforeUnmount(() => ctx?.revert())
</script>

<template>
  <div ref="root" class="space-y-5">
    <!-- header -->
    <div class="rv-in flex flex-wrap items-center justify-between gap-3">
      <p class="eyebrow text-navy-700">{{ t.result }}</p>
      <span
        v-if="report.is_sample"
        class="inline-flex items-center gap-2 rounded-full border border-warning/30 bg-warning/10 px-3 py-1 font-mono text-[11px] text-warning"
      >
        <HIcon name="flask" :size="14" />{{ t.sample }}
      </span>
    </div>

    <!-- read status -->
    <p
      v-if="report.document_read_status !== 'complete'"
      role="status"
      class="rv-in flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-[14px] text-navy-800"
    >
      <HIcon name="exclamation-triangle" :size="18" class="mt-0.5 shrink-0 text-warning" />
      {{ report.document_read_status === 'unreadable' ? t.unreadable : t.partial }}
    </p>

    <!-- summary -->
    <div v-if="report.summary || counts.length" class="rv-in rounded-[1.6rem] border border-navy-900/8 bg-white p-6 shadow-[0_30px_80px_-50px_rgba(19,45,80,.5)]">
      <p class="font-mono text-[11px] tracking-[0.2em] text-gold-600 uppercase">{{ t.summary }}</p>
      <p v-if="report.summary" class="mt-3 font-display text-lg leading-relaxed text-navy-900 md:text-xl">{{ report.summary }}</p>
      <ul v-if="counts.length" class="mt-4 flex flex-wrap gap-2">
        <li
          v-for="[s, n] in counts"
          :key="s"
          class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] font-medium"
          :class="statusMeta[s].tone"
        >
          <HIcon :name="statusMeta[s].icon" :size="14" />{{ statusMeta[s].label }} · {{ n }}
        </li>
      </ul>
    </div>

    <!-- amounts (recomputed in code) -->
    <div v-if="hasAmounts" class="rv-in grid gap-3 sm:grid-cols-3">
      <div class="rounded-2xl border border-navy-900/8 bg-white/80 p-4">
        <p class="text-[12px] text-navy-500">{{ t.total }}</p>
        <p class="mt-1 font-display text-2xl text-navy-900">{{ fmt(amounts.contract_total_thb) }} <span class="text-[13px] text-navy-500">{{ currency }}</span></p>
      </div>
      <div class="rounded-2xl border border-navy-900/8 bg-white/80 p-4">
        <p class="text-[12px] text-navy-500">{{ t.advance }}</p>
        <p class="mt-1 font-display text-2xl text-navy-900">
          {{ amounts.advance_ratio !== undefined ? `${Math.round(amounts.advance_ratio * 100)}%` : '—' }}
          <span v-if="amounts.advance_thb !== undefined" class="text-[13px] text-navy-500">· {{ fmt(amounts.advance_thb) }} {{ currency }}</span>
        </p>
        <div v-if="amounts.advance_ratio !== undefined" class="mt-2 h-1.5 overflow-hidden rounded-full bg-navy-900/8">
          <div class="rv-bar h-full origin-left rounded-full bg-gradient-to-r from-peach-400 to-coral-500" :style="{ width: `${Math.min(100, amounts.advance_ratio * 100)}%` }" />
        </div>
      </div>
      <div class="rounded-2xl border border-navy-900/8 bg-white/80 p-4">
        <p class="text-[12px] text-navy-500">{{ t.match }}</p>
        <p class="mt-1 flex items-center gap-2 font-display text-2xl" :class="amounts.arithmetic_verified === false ? 'text-coral-500' : 'text-navy-900'">
          {{ amounts.arithmetic_verified === undefined ? t.unknown : amounts.arithmetic_verified ? t.matchYes : t.matchNo }}
          <HIcon v-if="amounts.arithmetic_verified !== undefined" :name="amounts.arithmetic_verified ? 'check' : 'exclamation'" :size="20" :class="amounts.arithmetic_verified ? 'text-success' : 'text-coral-500'" />
        </p>
        <p class="mt-1 text-[11px] text-navy-500">{{ t.byCode }}</p>
      </div>
    </div>

    <!-- findings -->
    <section :aria-label="t.findings" class="space-y-3">
      <article
        v-for="f in sorted"
        :key="f.id"
        class="rv-in rounded-[1.4rem] border border-navy-900/8 bg-white p-5 shadow-[0_24px_60px_-40px_rgba(19,45,80,.45)] md:p-6"
      >
        <div class="flex flex-wrap items-center gap-2">
          <span class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium" :class="statusMeta[f.status].tone">
            <HIcon :name="statusMeta[f.status].icon" :size="14" />{{ statusMeta[f.status].label }}
          </span>
          <span v-if="f.needs_professional_review" class="inline-flex items-center gap-1.5 rounded-full bg-navy-900 px-2.5 py-1 text-[12px] text-paper">
            <HIcon name="certificate-check" :size="14" />{{ t.pro }}
          </span>
        </div>
        <h3 class="mt-3 font-display text-lg leading-snug text-navy-900 md:text-xl">{{ f.title }}</h3>
        <p v-if="f.reason" class="mt-2 text-[14.5px] leading-relaxed text-navy-700">{{ f.reason }}</p>

        <div class="mt-4 rounded-xl bg-paper-2/70 p-3">
          <p class="text-[11.5px] text-navy-500">{{ t.evidence }}</p>
          <ul v-if="f.document_evidence.length" class="mt-1.5 space-y-1.5">
            <li v-for="(e, i) in f.document_evidence" :key="i" class="flex items-start gap-2 font-mono text-[12px] text-navy-800">
              <HIcon name="bookmark" :size="14" class="mt-px shrink-0 text-gold-600" />
              <span><span v-if="e.page" class="text-navy-500">{{ t.page(e.page) }} · </span>“{{ e.quote }}”</span>
            </li>
          </ul>
          <p v-else class="mt-1 text-[12.5px] text-navy-500">{{ t.noEvidence }}</p>
        </div>

        <dl class="mt-4 grid gap-3 md:grid-cols-2">
          <div v-if="f.question_to_ask" class="flex items-start gap-2">
            <HIcon name="user-asking" :size="18" class="mt-0.5 shrink-0 text-gold-600" />
            <div>
              <dt class="text-[11.5px] text-navy-500">{{ t.ask }}</dt>
              <dd class="text-[14px] text-navy-900">{{ f.question_to_ask }}</dd>
            </div>
          </div>
          <div v-if="f.suggested_action" class="flex items-start gap-2">
            <HIcon name="bulb" :size="18" class="mt-0.5 shrink-0 text-gold-600" />
            <div>
              <dt class="text-[11.5px] text-navy-500">{{ t.action }}</dt>
              <dd class="text-[14px] text-navy-900">{{ f.suggested_action }}</dd>
            </div>
          </div>
        </dl>

        <div v-if="f.knowledge_citations.length" class="mt-4 border-t border-navy-900/8 pt-3">
          <p class="text-[11.5px] text-navy-500">{{ t.sources }}</p>
          <ul class="mt-1 space-y-1 text-[12.5px]">
            <li v-for="c in f.knowledge_citations" :key="c.source_id">
              <a v-if="c.url" :href="c.url" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-navy-700 underline decoration-gold-500/50 underline-offset-2 hover:text-navy-900">
                {{ c.section || c.source_id }}<HIcon name="external-link" :size="12" />
              </a>
              <span v-else class="text-navy-700">{{ c.section || c.source_id }}</span>
            </li>
          </ul>
        </div>
      </article>
      <p v-if="!sorted.length" class="rv-in rounded-2xl border border-navy-900/8 bg-white/70 p-5 text-[14px] text-navy-500">{{ t.none }}</p>
    </section>

    <!-- missing + limitations -->
    <div class="rv-in grid gap-3 md:grid-cols-2">
      <div v-if="report.missing_information.length" class="rounded-2xl border border-navy-900/8 bg-white/70 p-5">
        <p class="text-[12px] font-medium text-navy-700">{{ t.missing }}</p>
        <ul class="mt-2 space-y-1.5 text-[14px] text-navy-800">
          <li v-for="m in report.missing_information" :key="m" class="flex items-start gap-2">
            <HIcon name="minus" :size="16" class="mt-0.5 shrink-0 text-warning" />{{ m }}
          </li>
        </ul>
      </div>
      <div class="rounded-2xl border border-navy-900/8 bg-navy-950 p-5 text-paper" :class="report.missing_information.length ? '' : 'md:col-span-2'">
        <p class="text-[12px] font-medium text-gold-300">{{ t.limits }}</p>
        <ul class="mt-2 space-y-1.5 text-[13.5px] text-paper/80">
          <li v-for="l in report.limitations" :key="l" class="flex items-start gap-2">
            <HIcon name="info-circle" :size="16" class="mt-0.5 shrink-0 text-gold-300" />{{ l }}
          </li>
        </ul>
      </div>
    </div>

    <!-- actions -->
    <div class="rv-in flex flex-wrap items-center gap-3 print:hidden">
      <button type="button" class="btn-ghost group" @click="emit('reset')">
        <HIcon name="refresh" :size="18" class="icon-spin" />{{ t.again }}
      </button>
      <button type="button" class="btn-ghost group" @click="printReport">
        <HIcon name="download" :size="18" />{{ t.print }}
      </button>
      <button type="button" class="btn-primary group" @click="emit('request')">
        {{ t.pilot }}<HIcon name="arrow-down" :size="18" class="icon-nudge" />
      </button>
    </div>
  </div>
</template>
