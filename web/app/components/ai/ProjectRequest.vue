<script setup lang="ts">
/**
 * "Request a project from this document" — shown under a report on /ai-check.
 * Email is collected here with its own consent and sent only to /api/project-request
 * (never with the documents to the AI).
 */
import type { DocumentType } from '#shared/utils/aiReport'

const props = defineProps<{ analysisId: string; documentType: DocumentType; isSample?: boolean }>()
/** shared with the upload form's optional email field */
const email = defineModel<string>('email', { default: '' })
const { locale } = useI18n()

const t = useCopy({
  th: {
    eyebrow: 'ขั้นต่อไป',
    title: 'ขอเปิดโครงการจากเอกสารนี้',
    titleSample: 'อยากใช้กับโครงการจริง?',
    body: 'ส่งคำขอไว้ แล้วเราจะติดต่อกลับเพื่อเปิดพื้นที่โครงการร่วมกันระหว่างคุณกับอีกฝ่าย — ข้อตกลง งวดงาน และหลักฐานในที่เดียว (Pilot) เมื่อสมัครใช้ระบบโครงการด้วยอีเมลเดียวกัน ผลตรวจที่บันทึกไว้จะเชื่อมกับบัญชีของคุณ',
    email: 'อีเมล',
    emailPh: 'you@example.com',
    role: 'ฉันเป็น',
    owner: 'เจ้าของบ้าน',
    contractor: 'ผู้รับเหมา / ร้าน',
    consent: 'ยินยอมให้ LongRak ใช้อีเมลนี้เพื่อติดต่อกลับเรื่องการเปิดโครงการเท่านั้น',
    note: 'อีเมลนี้ไม่ได้ถูกส่งไปพร้อมเอกสารให้ AI',
    submit: 'ส่งคำขอเปิดโครงการ',
    sending: 'กำลังส่ง…',
    sentTitle: 'ได้รับคำขอแล้ว',
    sent: (e: string) => `เราจะติดต่อกลับที่ ${e} เร็ว ๆ นี้`,
    errors: {
      invalid_email: 'รูปแบบอีเมลไม่ถูกต้อง',
      consent_required: 'กรุณายืนยันการให้ติดต่อกลับ',
      not_configured: 'ระบบรับคำขอเปิดโครงการยังไม่เปิดใช้งาน — อีเมลของคุณยังไม่ถูกส่งหรือบันทึก',
      rate_limited: 'ส่งคำขอถี่เกินไป กรุณารอสักครู่แล้วลองใหม่',
      provider_unavailable: 'ส่งคำขอไม่สำเร็จ กรุณาลองใหม่ภายหลัง',
      network: 'เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่',
    } as Record<string, string>,
  },
  en: {
    eyebrow: 'Next step',
    title: 'Request a project from this document',
    titleSample: 'Want this for a real project?',
    body: 'Send a request and we\'ll get back to you to open a shared project space between you and the other side — agreement, milestones and evidence in one place (Pilot). When you sign up for the project app with the same email, your saved checks are linked to your account.',
    email: 'Email',
    emailPh: 'you@example.com',
    role: 'I am a',
    owner: 'Homeowner',
    contractor: 'Contractor / shop',
    consent: 'I agree that LongRak may use this email only to contact me about opening a project.',
    note: 'This email is not sent to the AI with your document.',
    submit: 'Send project request',
    sending: 'Sending…',
    sentTitle: 'Request received',
    sent: (e: string) => `We'll get back to you at ${e} soon.`,
    errors: {
      invalid_email: 'That email address doesn\'t look right.',
      consent_required: 'Please confirm we may contact you.',
      not_configured: 'Project requests aren\'t enabled yet — your email has not been sent or saved.',
      rate_limited: 'Too many requests — please wait a moment and try again.',
      provider_unavailable: 'Couldn\'t send the request. Please try again later.',
      network: 'Couldn\'t connect. Please try again.',
    } as Record<string, string>,
  },
})

const role = ref<'owner' | 'contractor'>('owner')
const consent = ref(false)
const state = ref<'idle' | 'sending' | 'sent' | 'error'>('idle')
const errorCode = ref('')

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const emailOk = computed(() => EMAIL_RE.test(email.value.trim()))
const showEmailError = ref(false)

async function send() {
  showEmailError.value = !emailOk.value
  if (!emailOk.value || !consent.value || state.value === 'sending') return
  state.value = 'sending'
  errorCode.value = ''
  try {
    await $fetch('/api/project-request', {
      method: 'POST',
      body: {
        email: email.value.trim(),
        role: role.value,
        analysis_id: props.analysisId,
        document_type: props.documentType,
        locale: locale.value === 'en' ? 'en' : 'th',
        consent_contact: consent.value,
      },
    })
    state.value = 'sent'
  }
  catch (err: unknown) {
    const e = err as { data?: { data?: { code?: string }; statusMessage?: string }; statusCode?: number }
    errorCode.value = e.data?.data?.code ?? e.data?.statusMessage ?? (e.statusCode ? 'provider_unavailable' : 'network')
    state.value = 'error'
  }
}
</script>

<template>
  <section id="project-request" class="scroll-mt-28 rounded-[1.8rem] bg-navy-950 p-6 text-paper shadow-[0_40px_100px_-50px_rgba(10,26,48,.8)] md:p-8 print:hidden" aria-labelledby="pr-title">
    <p class="eyebrow text-gold-300">{{ t.eyebrow }}</p>
    <h2 id="pr-title" class="mt-3 font-display text-2xl font-light md:text-3xl">{{ isSample ? t.titleSample : t.title }}</h2>

    <!-- sent -->
    <div v-if="state === 'sent'" role="status" class="mt-5 flex items-start gap-3 rounded-2xl bg-white/5 p-4">
      <HIcon name="check-circle" :size="22" class="mt-0.5 shrink-0 text-success" />
      <div>
        <p class="font-medium">{{ t.sentTitle }}</p>
        <p class="mt-1 text-[14px] text-paper/75">{{ t.sent(email.trim()) }}</p>
      </div>
    </div>

    <form v-else class="mt-3" novalidate @submit.prevent="send">
      <p class="max-w-xl text-[14.5px] leading-relaxed text-paper/75">{{ t.body }}</p>

      <div class="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <label class="block">
          <span class="text-[13px] text-paper/70">{{ t.email }}</span>
          <input
            v-model="email"
            type="email"
            inputmode="email"
            autocomplete="email"
            :placeholder="t.emailPh"
            class="mt-2 w-full rounded-2xl border bg-white/5 px-4 py-3 text-paper outline-none transition placeholder:text-paper/30 focus:border-gold-500 focus:ring-4 focus:ring-gold-500/20"
            :class="showEmailError && !emailOk ? 'border-coral-400' : 'border-white/15'"
            :aria-invalid="showEmailError && !emailOk"
            @blur="showEmailError = !!email && !emailOk"
          >
        </label>
        <fieldset class="grid grid-cols-2 gap-1 rounded-full bg-white/5 p-1">
          <legend class="sr-only">{{ t.role }}</legend>
          <label
            v-for="r in (['owner', 'contractor'] as const)"
            :key="r"
            class="cursor-pointer whitespace-nowrap rounded-full px-3 py-2.5 text-center text-[13px] transition-colors duration-300"
            :class="role === r ? 'bg-paper text-navy-900' : 'text-paper/70 hover:text-paper'"
          >
            <input v-model="role" type="radio" name="pr-role" :value="r" class="sr-only">{{ t[r] }}
          </label>
        </fieldset>
      </div>
      <p v-if="showEmailError && !emailOk" class="mt-2 text-[12.5px] text-coral-400">{{ t.errors.invalid_email }}</p>

      <label class="mt-4 flex items-start gap-3 text-[13px] text-paper/80">
        <input v-model="consent" type="checkbox" class="mt-0.5 size-4 shrink-0 accent-gold-500">
        {{ t.consent }}
      </label>
      <p class="mt-2 flex items-center gap-2 pl-7 text-[12px] text-paper/50">
        <HIcon name="lock" :size="13" />{{ t.note }}
      </p>

      <p v-if="state === 'error'" role="alert" class="mt-4 flex items-start gap-2 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-[13px] text-paper">
        <HIcon name="info-circle" :size="16" class="mt-0.5 shrink-0 text-warning" />{{ t.errors[errorCode] ?? t.errors.provider_unavailable }}
      </p>

      <button
        type="submit"
        class="group mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-paper px-6 py-3.5 text-[15px] font-medium text-navy-900 transition-transform duration-500 ease-luxe hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 sm:w-auto"
        :disabled="!consent || !email || state === 'sending'"
      >
        <HIcon v-if="state === 'sending'" name="spinner-earring" :size="18" class="animate-spin" />
        {{ state === 'sending' ? t.sending : t.submit }}
        <HIcon v-if="state !== 'sending'" name="arrow-right" :size="18" class="icon-nudge" />
      </button>
    </form>
  </section>
</template>
