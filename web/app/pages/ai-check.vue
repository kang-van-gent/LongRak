<script setup lang="ts">
/**
 * /ai-check — Public AI Document Checker (context.md §5–§7, §16)
 *  · Sample first (fictional document, precomputed result, no sign-up)
 *  · Upload → consent → POST /api/ai-check → n8n (server-side) → validated report
 *  · Honest states: not enabled yet, unsupported/too large, timeout, provider down…
 */
import { gsap } from 'gsap'
import { DOCUMENT_TYPES, type AiReport, type DocumentType } from '#shared/utils/aiReport'
import { sampleReports } from '~/utils/sampleReport'
import type { HumbleIconName } from '~/utils/humbleicons'

const { locale } = useI18n()
const localePath = useLocalePath()

const MAX_FILES = 3
const MAX_MB = 10
const ACCEPT = ['application/pdf', 'image/jpeg', 'image/png']
const ACCEPT_EXT = /\.(pdf|jpe?g|png)$/i

const t = useCopy({
  th: {
    metaTitle: 'ตรวจเอกสารก่อนเซ็น — LongRak AI Document Checker',
    metaDesc: 'ให้ AI ช่วยหารายการที่ควรทบทวนในใบเสนอราคา สัญญา BOQ หรือตารางงวดจ่าย พร้อมหลักฐานอ้างอิงหน้าในเอกสาร ไม่ใช่คำปรึกษากฎหมาย',
    eyebrow: 'AI Document Checker · Beta',
    titleA: 'ตรวจเอกสาร',
    titleEm: 'ก่อนเซ็น',
    lede: 'ให้ AI ช่วยหารายการที่ควรทบทวนในใบเสนอราคา สัญญา หรือตารางงวดจ่าย — ทุกข้อสังเกตอ้างอิงหน้าและข้อความในเอกสารของคุณ',
    note: 'ผลประเมิน AI เป็นข้อมูลช่วยตรวจความครบถ้วนเบื้องต้น ไม่ใช่คำปรึกษาทางกฎหมายหรือวิศวกรรม',
    modeSample: 'ดูตัวอย่าง (เอกสารสมมติ)',
    modeUpload: 'อัปโหลดเอกสารของคุณ',
    modeSampleShort: 'ตัวอย่าง',
    modeUploadShort: 'อัปโหลด',
    sampleDoc: 'ใบเสนอราคา — รีโนเวทห้องครัว',
    sampleBadge: 'SAMPLE · เอกสารสมมติ',
    sampleHint: 'ตัวอย่างนี้ไม่ได้ส่งเอกสารให้ AI และไม่ใช้ข้อมูลลูกค้าจริง ลองอัปโหลดเอกสารของคุณเพื่อวิเคราะห์จริง',
    sampleLines: [
      ['ผู้ว่าจ้าง', 'คุณ ก. (สมมติ)'], ['ขอบเขตงาน', 'รื้อถอนและติดตั้งชุดครัวใหม่ 3.2 ม.'], ['ยอดรวม', '200,000 บาท'],
      ['งวดที่ 1', 'มัดจำ 100,000 บาท'], ['งวดที่ 2', '60,000 บาท เมื่อติดตั้งตู้'], ['งวดที่ 3', '40,000 บาท เมื่อส่งมอบ'], ['กำหนดแล้วเสร็จ', '— ไม่ระบุ —'],
    ],
    tryUpload: 'ลองกับเอกสารของคุณ',
    dropTitle: 'ลากไฟล์มาวาง หรือเลือกไฟล์',
    dropHint: `PDF, JPG, PNG · สูงสุด ${MAX_FILES} ไฟล์ · ไฟล์ละไม่เกิน ${MAX_MB} MB · รวมไม่เกิน 20 หน้า`,
    choose: 'เลือกไฟล์',
    remove: 'ลบไฟล์',
    docType: 'ประเภทเอกสาร',
    types: { quotation: 'ใบเสนอราคา', contract: 'สัญญาจ้าง', boq: 'BOQ / รายการวัสดุ', milestone_schedule: 'ตารางงวดจ่าย', other: 'อื่น ๆ' } as Record<DocumentType, string>,
    noticeTitle: 'ก่อนส่งเอกสาร',
    notice: [
      'เอกสารจะถูกส่งไปประมวลผลกับผู้ให้บริการ AI ภายนอก เพื่อวิเคราะห์ความครบถ้วนของเอกสารนี้เท่านั้น',
      'เอกสารของคุณจะไม่ถูกนำไปเป็นคลังความรู้ส่วนกลางหรือใช้ฝึกโมเดล',
      'ระยะเวลาเก็บไฟล์ชั่วคราวจะแจ้งไว้ที่นี่ก่อนเปิดรับเอกสารจริง',
    ],
    redact: 'แนะนำ: ปิดหรือลบเลขบัตรประชาชน เลขบัญชี เบอร์โทร และที่อยู่ ก่อนอัปโหลด',
    email: 'อีเมลของคุณ',
    emailStep: 'ขั้นที่ 1',
    filesStep: 'ขั้นที่ 2',
    emailHint: 'เราบันทึกผลตรวจไว้กับอีเมลนี้ — เมื่อคุณสมัครใช้ระบบโครงการด้วยอีเมลเดียวกัน (และยืนยันอีเมลแล้ว) ผลตรวจนี้จะเชื่อมกับบัญชีของคุณ อีเมลไม่ถูกส่งไปพร้อมเอกสารให้ AI',
    emailInvalid: 'รูปแบบอีเมลไม่ถูกต้อง',
    consentStorage: 'ฉันยินยอมให้ LongRak บันทึกผลตรวจนี้ไว้กับอีเมลของฉัน เพื่อดูต่อในระบบโครงการเมื่อสมัครใช้งาน',
    savedNote: (e: string) => `บันทึกผลตรวจนี้ไว้กับ ${e} แล้ว — สมัครใช้ระบบโครงการด้วยอีเมลนี้เพื่อดูผลต่อ`,
    notSavedNote: 'ยังไม่ได้บันทึกผลตรวจนี้ (ระบบบันทึกยังไม่เชื่อมต่อ) — ผลด้านล่างแสดงได้ตามปกติ',
    consentRights: 'ฉันเป็นเจ้าของเอกสาร หรือได้รับอนุญาตให้ใช้เอกสารนี้',
    consentProcessing: 'ฉันยินยอมให้ส่งเอกสารไปประมวลผลกับผู้ให้บริการ AI ภายนอกตามข้อมูลข้างต้น',
    optOut: 'ถ้าไม่ยินยอม คุณยังดูผลตัวอย่างได้โดยไม่ต้องส่งเอกสาร',
    submit: 'เริ่มวิเคราะห์',
    uploading: (p: number) => `กำลังอัปโหลด ${p}%`,
    analysing: 'กำลังวิเคราะห์เอกสาร',
    elapsed: (s: number) => `ผ่านไป ${s} วินาที · อาจใช้เวลาสูงสุดประมาณ 2 นาที`,
    steps: ['อัปโหลด', 'อ่านและแยกข้อมูล', 'เทียบกับเช็กลิสต์', 'อธิบายพร้อมหลักฐาน'],
    idleTitle: 'ผลวิเคราะห์จะแสดงที่นี่',
    idleBody: 'เช็กลิสต์ + ข้อความอ้างอิงจากเอกสาร + คำถามที่ควรถามอีกฝ่าย แบ่งเป็น ต้องทบทวน / ข้อมูลไม่พอ / พบข้อมูลตามเกณฑ์',
    viewSample: 'ดูผลตัวอย่าง',
    clientErrors: {
      too_many_files: `เลือกได้สูงสุด ${MAX_FILES} ไฟล์`,
      file_too_large: `มีไฟล์ใหญ่เกิน ${MAX_MB} MB`,
      unsupported_file: 'รองรับเฉพาะไฟล์ PDF, JPG และ PNG',
      unreadable: 'เปิดไฟล์นี้ไม่ได้ ลองเลือกไฟล์ใหม่อีกครั้ง',
    } as Record<string, string>,
    errors: {
      invalid_email: 'กรุณาใส่อีเมลที่ถูกต้องก่อนส่งเอกสาร',
      not_configured: 'ระบบวิเคราะห์เอกสารยังไม่เปิดใช้งาน — เอกสารของคุณไม่ได้ถูกส่งไปที่ใด ระหว่างนี้ลองดูผลตัวอย่างได้',
      consent_required: 'กรุณายืนยันทั้งสองข้อก่อนส่งเอกสาร',
      no_files: 'ยังไม่ได้เลือกไฟล์',
      too_many_files: `เลือกได้สูงสุด ${MAX_FILES} ไฟล์`,
      file_too_large: `มีไฟล์ใหญ่เกิน ${MAX_MB} MB`,
      unsupported_file: 'ไฟล์นี้ไม่ใช่ PDF, JPG หรือ PNG ที่อ่านได้',
      rate_limited: 'ส่งเอกสารถี่เกินไป กรุณารอสักครู่แล้วลองใหม่',
      timeout: 'การวิเคราะห์ใช้เวลานานเกินกำหนด กรุณาลองใหม่อีกครั้ง หรือแบ่งเอกสารให้สั้นลง',
      provider_unavailable: 'ระบบวิเคราะห์ไม่พร้อมใช้งานชั่วคราว กรุณาลองใหม่ภายหลัง',
      invalid_report: 'ได้ผลลัพธ์ที่ตรวจสอบความถูกต้องไม่ผ่าน จึงไม่แสดงผล กรุณาลองใหม่อีกครั้ง',
      network: 'เชื่อมต่อไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่',
    } as Record<string, string>,
    errorTitle: 'ยังวิเคราะห์ไม่ได้',
    retry: 'ลองใหม่',
  },
  en: {
    metaTitle: 'Check your document before you sign — LongRak AI Document Checker',
    metaDesc: 'Let AI point out what to review in a quotation, contract, BOQ or payment schedule, citing pages in your document. Not legal advice.',
    eyebrow: 'AI Document Checker · Beta',
    titleA: 'Check your document ',
    titleEm: 'before you sign',
    lede: 'Let AI point out what is worth reviewing in a quotation, contract or payment schedule — every observation cites the page and text in your document.',
    note: 'AI results are a first-pass completeness check, not legal or engineering advice.',
    modeSample: 'See a sample (fictional)',
    modeUpload: 'Upload your document',
    modeSampleShort: 'Sample',
    modeUploadShort: 'Upload',
    sampleDoc: 'Quotation — kitchen renovation',
    sampleBadge: 'SAMPLE · fictional document',
    sampleHint: 'Nothing was sent to an AI for this sample and no real customer data is used. Upload your own document for a real analysis.',
    sampleLines: [
      ['Client', 'Khun A. (fictional)'], ['Scope', 'Remove and install new 3.2 m kitchen'], ['Total', '200,000 THB'],
      ['Milestone 1', 'Deposit 100,000 THB'], ['Milestone 2', '60,000 THB on cabinet install'], ['Milestone 3', '40,000 THB on handover'], ['Completion date', '— not stated —'],
    ],
    tryUpload: 'Try it with your document',
    dropTitle: 'Drop files here, or choose files',
    dropHint: `PDF, JPG, PNG · up to ${MAX_FILES} files · ${MAX_MB} MB each · 20 pages in total`,
    choose: 'Choose files',
    remove: 'Remove file',
    docType: 'Document type',
    types: { quotation: 'Quotation', contract: 'Contract', boq: 'BOQ / materials list', milestone_schedule: 'Payment schedule', other: 'Other' } as Record<DocumentType, string>,
    noticeTitle: 'Before you send',
    notice: [
      'Your document is sent to an external AI provider, only to analyse the completeness of this document.',
      'Your document is never added to a shared knowledge base or used to train models.',
      'The temporary retention period will be stated here before real documents are accepted.',
    ],
    redact: 'Tip: cover or remove ID numbers, bank account numbers, phone numbers and addresses before uploading.',
    email: 'Your email',
    emailStep: 'Step 1',
    filesStep: 'Step 2',
    emailHint: 'We save your result with this email — when you sign up for the project app with the same (verified) email, this check is linked to your account. Your email is not sent to the AI with the document.',
    emailInvalid: 'That email address doesn\'t look right',
    consentStorage: 'I agree that LongRak may save this result with my email, so I can continue in the project app after signing up',
    savedNote: (e: string) => `Saved with ${e} — sign up for the project app with this email to continue from this result.`,
    notSavedNote: 'This result wasn\'t saved (storage isn\'t connected yet) — it is shown below as usual.',
    consentRights: 'I own this document, or I have permission to use it',
    consentProcessing: 'I agree to my document being processed by an external AI provider as described above',
    optOut: 'If you don\'t agree, you can still view the sample without sending anything.',
    submit: 'Start analysis',
    uploading: (p: number) => `Uploading ${p}%`,
    analysing: 'Analysing your document',
    elapsed: (s: number) => `${s}s elapsed · this can take up to about 2 minutes`,
    steps: ['Upload', 'Read and extract', 'Compare with checklist', 'Explain with evidence'],
    idleTitle: 'Your results will appear here',
    idleBody: 'A checklist + quotes from your document + questions to ask the other side, grouped as Needs review / Missing information / Found in document.',
    viewSample: 'View the sample',
    clientErrors: {
      too_many_files: `Choose up to ${MAX_FILES} files`,
      file_too_large: `A file is larger than ${MAX_MB} MB`,
      unsupported_file: 'Only PDF, JPG and PNG files are supported',
      unreadable: 'Couldn\'t open this file — please choose it again',
    } as Record<string, string>,
    errors: {
      invalid_email: 'Please enter a valid email before sending.',
      not_configured: 'Document analysis isn\'t enabled yet — your document was not sent anywhere. In the meantime, you can view the sample.',
      consent_required: 'Please confirm both statements before sending.',
      no_files: 'No file selected yet.',
      too_many_files: `Choose up to ${MAX_FILES} files.`,
      file_too_large: `A file is larger than ${MAX_MB} MB.`,
      unsupported_file: 'This file isn\'t a readable PDF, JPG or PNG.',
      rate_limited: 'Too many requests — please wait a moment and try again.',
      timeout: 'The analysis took too long. Please try again, or split the document into shorter parts.',
      provider_unavailable: 'The analysis service is temporarily unavailable. Please try again later.',
      invalid_report: 'The result failed validation, so it isn\'t shown. Please try again.',
      network: 'Couldn\'t connect. Check your internet connection and try again.',
    } as Record<string, string>,
    errorTitle: 'Couldn\'t analyse yet',
    retry: 'Try again',
  },
})

useSeoMeta({
  title: () => t.value.metaTitle,
  description: () => t.value.metaDesc,
  ogTitle: () => t.value.metaTitle,
  ogDescription: () => t.value.metaDesc,
  ogImage: '/brand/longrak-logo-master.png',
})

// ---------------------------------------------------------------- state
type Mode = 'sample' | 'upload'
type Phase = 'idle' | 'uploading' | 'analysing' | 'done' | 'error'

const mode = ref<Mode>('sample')
const phase = ref<Phase>('idle')
const files = ref<File[]>([])
const documentType = ref<DocumentType>('quotation')
const consentRights = ref(false)
const consentProcessing = ref(false)
const consentStorage = ref(false)
const clientError = ref('')
const errorCode = ref('')
const uploadPct = ref(0)
const elapsed = ref(0)
const report = ref<AiReport | null>(null)
const dragging = ref(false)
/** required before upload: the check is saved with it (claimable later). Never sent to the AI. */
const email = ref('')
const emailValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim()))
const emailTouched = ref(false)
const emailInvalid = computed(() => (emailTouched.value || !!email.value) && !emailValid.value && email.value.trim().length > 0)
const fileInput = ref<HTMLInputElement | null>(null)

const sample = computed(() => sampleReports[locale.value === 'en' ? 'en' : 'th'])
const canSubmit = computed(() => emailValid.value && files.value.length > 0 && consentRights.value && consentProcessing.value && consentStorage.value && phase.value !== 'uploading' && phase.value !== 'analysing')
const busy = computed(() => phase.value === 'uploading' || phase.value === 'analysing')
const stepIndex = computed(() => (phase.value === 'uploading' ? 0 : Math.min(3, 1 + Math.floor(elapsed.value / 12))))

const sizeLabel = (b: number) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`)
const fileIcon = (f: File): HumbleIconName => (f.type.startsWith('image/') ? 'image' : 'document')

async function addFiles(list: FileList | File[] | null) {
  clientError.value = ''
  if (!list) return
  const picked = Array.from(list)
  for (const f of picked) {
    if (!ACCEPT.includes(f.type) && !ACCEPT_EXT.test(f.name)) { clientError.value = t.value.clientErrors.unsupported_file!; return }
    if (f.size > MAX_MB * 1024 * 1024) { clientError.value = t.value.clientErrors.file_too_large!; return }
  }
  // Copy each file into memory now. Chrome otherwise re-reads it from disk when sending,
  // and fails (ERR_FILE_NOT_FOUND) if it changed meanwhile — e.g. a synced iCloud/Drive file.
  let incoming: File[]
  try {
    incoming = await Promise.all(picked.map(async (f) => new File([await f.arrayBuffer()], f.name, { type: f.type, lastModified: f.lastModified })))
  }
  catch {
    clientError.value = t.value.clientErrors.unreadable!
    return
  }
  const merged = [...files.value, ...incoming.filter((f) => !files.value.some((x) => x.name === f.name && x.size === f.size))]
  if (merged.length > MAX_FILES) { clientError.value = t.value.clientErrors.too_many_files!; return }
  files.value = merged
  if (phase.value === 'error' || phase.value === 'done') phase.value = 'idle'
}
function onPick(e: Event) {
  addFiles((e.target as HTMLInputElement).files)
  ;(e.target as HTMLInputElement).value = ''
}
function onDrop(e: DragEvent) {
  dragging.value = false
  addFiles(e.dataTransfer?.files ?? null)
}
function removeFile(i: number) {
  files.value = files.value.filter((_, j) => j !== i)
}

let timer: ReturnType<typeof setInterval> | undefined
let xhr: XMLHttpRequest | undefined

/** XHR instead of fetch: fetch can't report upload progress */
function submit() {
  if (!canSubmit.value) return
  errorCode.value = ''
  report.value = null
  uploadPct.value = 0
  elapsed.value = 0
  phase.value = 'uploading'

  const form = new FormData()
  files.value.forEach((f) => form.append('files', f, f.name))
  form.append('document_type', documentType.value)
  form.append('locale', locale.value === 'en' ? 'en' : 'th')
  form.append('consent_rights', String(consentRights.value))
  form.append('consent_processing', String(consentProcessing.value))
  form.append('consent_storage', String(consentStorage.value))
  form.append('email', email.value.trim())

  xhr = new XMLHttpRequest()
  xhr.open('POST', '/api/ai-check')
  xhr.responseType = 'json'
  xhr.upload.onprogress = (e) => {
    if (e.lengthComputable) uploadPct.value = Math.round((e.loaded / e.total) * 100)
  }
  xhr.upload.onload = () => {
    phase.value = 'analysing'
    timer = setInterval(() => elapsed.value++, 1000)
  }
  xhr.onload = () => {
    clearInterval(timer)
    const body = xhr!.response
    if (xhr!.status >= 200 && xhr!.status < 300 && body) {
      report.value = body as AiReport
      phase.value = 'done'
    }
    else {
      errorCode.value = body?.data?.code ?? body?.statusMessage ?? 'provider_unavailable'
      phase.value = 'error'
    }
    scrollToResult()
  }
  xhr.onerror = () => {
    clearInterval(timer)
    errorCode.value = 'network'
    phase.value = 'error'
    scrollToResult()
  }
  xhr.send(form)
  scrollToResult()
}

function reset() {
  phase.value = 'idle'
  report.value = null
  errorCode.value = ''
  files.value = []
  mode.value = 'upload'
}

const scrollTo = useSmoothScroll()
/** Bring the result panel into view if it isn't (below the form on phones, scrolled past on desktop). */
function scrollToResult() {
  nextTick(() => {
    const el = document.getElementById('result')
    if (!el) return
    const r = el.getBoundingClientRect()
    if (r.top < 80 || r.top > window.innerHeight * 0.6) scrollTo('#result', { offset: -110 })
  })
}

function goToRequest() {
  nextTick(() => scrollTo('#project-request', { offset: -110 }))
}

function showSample() {
  mode.value = 'sample'
  scrollToResult()
}

onBeforeUnmount(() => {
  clearInterval(timer)
  xhr?.abort()
})

// ---------------------------------------------------------------- motion
const root = ref<HTMLElement | null>(null)
useScene(root, (_el, { isMobile }) => {
  // intro on load
  gsap.timeline({ defaults: { ease: 'expo.out' }, delay: 0.1 })
    .from('.ac-line > span', { yPercent: 115, duration: 1.3, stagger: 0.1 })
    .from('.ac-intro', { y: 24, opacity: 0, duration: 1, stagger: 0.08 }, 0.3)
    .from('.ac-panel', { y: 60, opacity: 0, duration: 1.2, stagger: 0.12 }, 0.4)

  // header recedes as you scroll into the tool (scrub, both ways)
  gsap.to('.ac-head', {
    y: isMobile ? -20 : -40, opacity: 0.35, ease: 'none',
    scrollTrigger: { trigger: '.ac-head', start: 'top 15%', end: 'bottom top', scrub: true },
  })
  gsap.to('.ac-glow', {
    yPercent: 30, scale: 1.2, ease: 'none',
    scrollTrigger: { trigger: root.value, start: 'top top', end: 'bottom top', scrub: true },
  })
})
</script>

<template>
  <div>
    <SiteHeader />
    <main id="main" ref="root" class="relative overflow-x-clip bg-paper">
      <!-- DEPTH 0/1 -->
      <div class="pointer-events-none absolute inset-0" data-depth="0" aria-hidden="true">
        <div class="absolute inset-0 bg-[radial-gradient(120%_60%_at_80%_0%,#fff3ec_0%,#fffcfa_45%,#f8f1ea_100%)]" />
        <div class="absolute inset-0 opacity-[0.45] [background-image:linear-gradient(rgba(19,45,80,.045)_1px,transparent_1px),linear-gradient(90deg,rgba(19,45,80,.045)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(70%_50%_at_50%_20%,#000,transparent)]" />
      </div>
      <div class="pointer-events-none absolute inset-0" data-depth="1" aria-hidden="true">
        <div class="ac-glow absolute right-[5%] top-[4%] size-[40vw] max-w-[620px] rounded-full bg-coral-500/12 blur-[110px]" />
        <div class="ac-glow absolute left-[2%] top-[30%] size-[30vw] max-w-[460px] rounded-full bg-gold-300/25 blur-[110px]" />
      </div>

      <div class="relative mx-auto max-w-7xl px-4 pb-24 pt-32 md:px-6 md:pb-32 md:pt-40" data-depth="4">
        <!-- header -->
        <header class="ac-head max-w-3xl">
          <p class="ac-intro eyebrow text-navy-700">{{ t.eyebrow }}</p>
          <h1 class="mt-5 text-balance font-display text-[clamp(2.3rem,5.6vw,4.6rem)] font-light leading-[1.12] text-navy-900">
            <span class="ac-line line-mask"><span>{{ t.titleA }}<em class="text-heart font-medium">{{ t.titleEm }}</em></span></span>
          </h1>
          <p class="ac-intro mt-5 max-w-2xl text-[15.5px] leading-relaxed text-navy-700">{{ t.lede }}</p>
          <p class="ac-intro mt-4 flex items-start gap-2 text-[12.5px] text-navy-500">
            <HIcon name="info-circle" :size="16" class="mt-0.5 shrink-0" />{{ t.note }}
          </p>
        </header>

        <!-- mode switch -->
        <div class="ac-intro mt-10 inline-grid grid-cols-2 gap-1 rounded-full border border-navy-900/8 bg-white/70 p-1.5 backdrop-blur print:hidden" role="tablist">
          <button
            v-for="m in (['sample', 'upload'] as const)"
            :key="m"
            type="button"
            role="tab"
            :aria-selected="mode === m"
            class="flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[14px] transition-colors duration-500 sm:px-5"
            :class="mode === m ? 'bg-navy-900 text-paper shadow' : 'text-navy-700 hover:text-navy-900'"
            @click="mode = m"
          >
            <HIcon :name="m === 'sample' ? 'flask' : 'upload'" :size="16" />
            <span class="max-sm:hidden">{{ m === 'sample' ? t.modeSample : t.modeUpload }}</span>
            <span class="sm:hidden">{{ m === 'sample' ? t.modeSampleShort : t.modeUploadShort }}</span>
          </button>
        </div>

        <div class="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-10 [&>*]:min-w-0">
          <!-- ============ LEFT: input ============ -->
          <div class="ac-panel lg:sticky lg:top-28 print:hidden">
            <!-- sample document -->
            <div v-if="mode === 'sample'" class="rounded-[1.8rem] border border-navy-900/10 bg-white p-6 shadow-[0_40px_100px_-50px_rgba(19,45,80,.45)] md:p-8">
              <div class="flex flex-wrap items-center justify-between gap-3 border-b border-dashed border-navy-900/15 pb-4">
                <div class="flex items-center gap-2 text-navy-900">
                  <HIcon name="document" :size="18" />
                  <span class="font-display text-lg">{{ t.sampleDoc }}</span>
                </div>
                <span class="rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 font-mono text-[10.5px] text-warning">{{ t.sampleBadge }}</span>
              </div>
              <dl class="mt-4 space-y-2 text-[14px]">
                <div v-for="[k, v] in t.sampleLines" :key="k" class="flex justify-between gap-4 rounded-md px-2 py-1 odd:bg-paper-2/60">
                  <dt class="text-navy-500">{{ k }}</dt>
                  <dd class="text-right font-medium text-navy-900">{{ v }}</dd>
                </div>
              </dl>
              <p class="mt-5 flex items-start gap-2 text-[12.5px] text-navy-500">
                <HIcon name="info-circle" :size="15" class="mt-px shrink-0" />{{ t.sampleHint }}
              </p>
              <button type="button" class="btn-primary group mt-6 w-full justify-center sm:w-auto" @click="mode = 'upload'">
                {{ t.tryUpload }}<HIcon name="upload" :size="18" class="text-gold-300" />
              </button>
            </div>

            <!-- upload form -->
            <form v-else class="rounded-[1.8rem] border border-navy-900/10 bg-white/90 p-5 shadow-[0_40px_100px_-50px_rgba(19,45,80,.45)] backdrop-blur md:p-8" novalidate @submit.prevent="submit">
              <!-- step 1: email first (the result is saved with it) -->
              <label class="block">
                <span class="flex items-center gap-2 text-[13px] font-medium text-navy-900">
                  <span class="rounded-full bg-navy-900 px-2 py-0.5 font-mono text-[10px] tracking-wider text-paper">{{ t.emailStep }}</span>
                  {{ t.email }} <span class="text-coral-500" aria-hidden="true">*</span>
                </span>
                <input
                  v-model="email"
                  type="email"
                  inputmode="email"
                  autocomplete="email"
                  required
                  placeholder="you@example.com"
                  class="mt-2 w-full rounded-2xl border bg-paper px-4 py-3 text-navy-900 outline-none transition focus:border-gold-500 focus:ring-4 focus:ring-gold-500/15"
                  :class="emailInvalid ? 'border-danger/60' : 'border-navy-900/10'"
                  :aria-invalid="emailInvalid"
                  :disabled="busy"
                  @blur="emailTouched = true"
                >
                <span v-if="emailInvalid" class="mt-1.5 block text-[12.5px] text-danger">{{ t.emailInvalid }}</span>
                <span class="mt-1.5 flex items-start gap-1.5 text-[12px] leading-relaxed text-navy-500">
                  <HIcon name="lock" :size="13" class="mt-0.5 shrink-0" />{{ t.emailHint }}
                </span>
              </label>

              <p class="mb-2 mt-6 flex items-center gap-2 text-[13px] font-medium text-navy-900">
                <span class="rounded-full bg-navy-900 px-2 py-0.5 font-mono text-[10px] tracking-wider text-paper">{{ t.filesStep }}</span>
                {{ t.choose }}
              </p>
              <!-- dropzone -->
              <label
                class="group relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[1.4rem] border-2 border-dashed px-5 py-9 text-center transition-colors duration-300"
                :class="dragging ? 'border-gold-500 bg-gold-300/15' : 'border-navy-900/15 bg-paper-2/50 hover:border-gold-500/70'"
                @dragover.prevent="dragging = true"
                @dragleave.prevent="dragging = false"
                @drop.prevent="onDrop"
              >
                <span class="grid size-14 place-items-center rounded-2xl bg-white text-navy-900 shadow-[0_12px_30px_-16px_rgba(19,45,80,.5)] transition-transform duration-500 group-hover:-translate-y-1">
                  <HIcon name="upload" :size="26" :stroke="1.6" />
                </span>
                <span class="font-display text-lg text-navy-900">{{ t.dropTitle }}</span>
                <span class="text-[12.5px] text-navy-500">{{ t.dropHint }}</span>
                <span class="btn-ghost !px-4 !py-2 !text-[13px]">{{ t.choose }}</span>
                <input
                  ref="fileInput"
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  class="sr-only"
                  :disabled="busy"
                  @change="onPick"
                >
              </label>

              <p v-if="clientError" role="alert" class="mt-3 flex items-center gap-2 text-[13px] text-danger">
                <HIcon name="exclamation" :size="16" />{{ clientError }}
              </p>

              <ul v-if="files.length" class="mt-4 space-y-2">
                <li v-for="(f, i) in files" :key="f.name + f.size" class="flex items-center gap-3 rounded-xl border border-navy-900/8 bg-white px-3 py-2.5">
                  <HIcon :name="fileIcon(f)" :size="18" class="shrink-0 text-gold-600" />
                  <span class="min-w-0 flex-1 truncate text-[14px] text-navy-900">{{ f.name }}</span>
                  <span class="shrink-0 font-mono text-[11px] text-navy-500">{{ sizeLabel(f.size) }}</span>
                  <button type="button" class="grid size-8 shrink-0 place-items-center rounded-full text-navy-500 hover:bg-paper-2 hover:text-danger" :aria-label="`${t.remove}: ${f.name}`" :disabled="busy" @click="removeFile(i)">
                    <HIcon name="times" :size="16" />
                  </button>
                </li>
              </ul>

              <!-- document type -->
              <fieldset class="mt-6">
                <legend class="text-[13px] font-medium text-navy-700">{{ t.docType }}</legend>
                <div class="mt-2 flex flex-wrap gap-2">
                  <label
                    v-for="d in DOCUMENT_TYPES"
                    :key="d"
                    class="cursor-pointer rounded-full border px-3.5 py-2 text-[13px] transition-colors duration-300"
                    :class="documentType === d ? 'border-navy-900 bg-navy-900 text-paper' : 'border-navy-900/12 text-navy-700 hover:border-gold-500'"
                  >
                    <input v-model="documentType" type="radio" name="document_type" :value="d" class="sr-only" :disabled="busy">
                    {{ t.types[d] }}
                  </label>
                </div>
              </fieldset>

              <!-- privacy notice -->
              <div class="mt-6 rounded-2xl border border-navy-900/8 bg-slate-100/70 p-4">
                <p class="flex items-center gap-2 text-[13px] font-medium text-navy-900">
                  <HIcon name="shield-check" :size="16" class="text-success" />{{ t.noticeTitle }}
                </p>
                <ul class="mt-2 space-y-1.5 text-[12.5px] leading-relaxed text-navy-700">
                  <li v-for="n in t.notice" :key="n" class="flex items-start gap-2">
                    <span class="mt-2 size-1 shrink-0 rounded-full bg-navy-500" />{{ n }}
                  </li>
                </ul>
                <p class="mt-3 flex items-start gap-2 text-[12.5px] text-navy-800">
                  <HIcon name="eye-off" :size="15" class="mt-px shrink-0 text-gold-600" />{{ t.redact }}
                </p>
              </div>

              <!-- consents -->
              <div class="mt-5 space-y-3">
                <label class="flex items-start gap-3 text-[13.5px] text-navy-800">
                  <input v-model="consentRights" type="checkbox" class="mt-0.5 size-4 shrink-0 accent-navy-900" :disabled="busy">
                  {{ t.consentRights }}
                </label>
                <label class="flex items-start gap-3 text-[13.5px] text-navy-800">
                  <input v-model="consentProcessing" type="checkbox" class="mt-0.5 size-4 shrink-0 accent-navy-900" :disabled="busy">
                  {{ t.consentProcessing }}
                </label>
                <label class="flex items-start gap-3 text-[13.5px] text-navy-800">
                  <input v-model="consentStorage" type="checkbox" class="mt-0.5 size-4 shrink-0 accent-navy-900" :disabled="busy">
                  {{ t.consentStorage }}
                </label>
                <p class="pl-7 text-[12px] text-navy-500">
                  {{ t.optOut }}
                  <button type="button" class="underline decoration-gold-500/60 underline-offset-2 hover:text-navy-900" @click="showSample">{{ t.viewSample }}</button>
                </p>
              </div>

              <button type="submit" class="btn-primary group mt-6 w-full justify-center disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0" :disabled="!canSubmit">
                <HIcon v-if="busy" name="spinner-earring" :size="18" class="animate-spin" />
                {{ t.submit }}
                <HIcon v-if="!busy" name="sparks" :size="18" class="icon-twinkle text-gold-300" />
              </button>
            </form>
          </div>

          <!-- ============ RIGHT: output ============ -->
          <div id="result" class="ac-panel scroll-mt-28" aria-live="polite">
            <!-- sample -->
            <div v-if="mode === 'sample'" class="space-y-6">
              <AiReportView :key="`sample-${locale}`" :report="sample" @reset="mode = 'upload'" @request="goToRequest" />
              <AiProjectRequest v-model:email="email" analysis-id="sample" document-type="quotation" is-sample />
            </div>

            <!-- result -->
            <div v-else-if="phase === 'done' && report" class="space-y-6">
              <p
                role="status"
                class="flex items-start gap-2 rounded-2xl border px-4 py-3 text-[13.5px]"
                :class="report.saved ? 'border-success/25 bg-success/10 text-navy-800' : 'border-warning/30 bg-warning/10 text-navy-800'"
              >
                <HIcon :name="report.saved ? 'check-circle' : 'info-circle'" :size="17" class="mt-0.5 shrink-0" :class="report.saved ? 'text-success' : 'text-warning'" />
                {{ report.saved ? t.savedNote(email.trim()) : t.notSavedNote }}
              </p>
              <AiReportView :key="report.analysis_id" :report="report" @reset="reset" @request="goToRequest" />
              <AiProjectRequest v-model:email="email" :analysis-id="report.analysis_id" :document-type="report.document_type" />
            </div>

            <!-- progress -->
            <div v-else-if="busy" class="rounded-[1.8rem] border border-navy-900/8 bg-white/90 p-6 shadow-[0_40px_100px_-50px_rgba(19,45,80,.45)] md:p-8">
              <p class="flex items-center gap-3 font-display text-xl text-navy-900">
                <HIcon name="spinner-earring" :size="22" class="animate-spin text-gold-600" />
                {{ phase === 'uploading' ? t.uploading(uploadPct) : t.analysing }}
              </p>
              <div class="mt-4 h-1.5 overflow-hidden rounded-full bg-navy-900/8">
                <div v-if="phase === 'uploading'" class="h-full rounded-full bg-gradient-to-r from-gold-500 to-coral-500 transition-[width] duration-300" :style="{ width: `${uploadPct}%` }" />
                <div v-else class="h-full w-1/3 animate-[indeterminate_1.6s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-gold-500 to-coral-500" />
              </div>
              <p v-if="phase === 'analysing'" class="mt-2 font-mono text-[11.5px] text-navy-500">{{ t.elapsed(elapsed) }}</p>
              <ol class="mt-6 space-y-3">
                <li v-for="(s, i) in t.steps" :key="s" class="flex items-center gap-3 text-[14px]" :class="i <= stepIndex ? 'text-navy-900' : 'text-navy-500/60'">
                  <span
                    class="grid size-7 shrink-0 place-items-center rounded-full border font-mono text-[11px] transition-colors duration-500"
                    :class="i < stepIndex ? 'border-gold-500 bg-gold-500 text-paper' : i === stepIndex ? 'border-gold-500 text-gold-600' : 'border-navy-900/15'"
                  >
                    <HIcon v-if="i < stepIndex" name="check" :size="14" />
                    <template v-else>{{ i + 1 }}</template>
                  </span>
                  {{ s }}
                </li>
              </ol>
            </div>

            <!-- error -->
            <div v-else-if="phase === 'error'" role="alert" class="rounded-[1.8rem] border border-warning/30 bg-white/90 p-6 md:p-8">
              <p class="flex items-center gap-2 font-display text-xl text-navy-900">
                <HIcon :name="errorCode === 'not_configured' ? 'clock' : 'exclamation-triangle'" :size="22" class="text-warning" />{{ t.errorTitle }}
              </p>
              <p class="mt-3 text-[14.5px] leading-relaxed text-navy-700">{{ t.errors[errorCode] ?? t.errors.provider_unavailable }}</p>
              <div class="mt-6 flex flex-wrap gap-3">
                <button v-if="errorCode !== 'not_configured'" type="button" class="btn-ghost group" :disabled="!canSubmit" @click="submit">
                  <HIcon name="refresh" :size="18" class="icon-spin" />{{ t.retry }}
                </button>
                <button type="button" class="btn-primary group" @click="showSample">
                  <HIcon name="flask" :size="18" class="text-gold-300" />{{ t.viewSample }}
                </button>
              </div>
            </div>

            <!-- idle -->
            <div v-else class="flex min-h-[320px] flex-col items-center justify-center rounded-[1.8rem] border border-dashed border-navy-900/15 bg-white/40 p-8 text-center">
              <span class="grid size-14 place-items-center rounded-2xl bg-white text-gold-600 shadow-[0_12px_30px_-16px_rgba(19,45,80,.5)]">
                <HIcon name="clipboard" :size="26" :stroke="1.6" />
              </span>
              <p class="mt-4 font-display text-xl text-navy-900">{{ t.idleTitle }}</p>
              <p class="mt-2 max-w-sm text-[14px] leading-relaxed text-navy-500">{{ t.idleBody }}</p>
              <button type="button" class="btn-ghost group mt-6" @click="showSample">
                <HIcon name="flask" :size="18" />{{ t.viewSample }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
    <SiteFooter />
  </div>
</template>
