<script setup lang="ts">
/**
 * CONTACT / PILOT REQUEST — closing scene
 * Techniques: giant bleed typography sliding with scroll, form card rises
 * with perspective, master logo resolves into view.
 * NOTE: there is no lead backend yet — the form says so instead of faking success.
 */
import { gsap } from 'gsap'

const root = ref<HTMLElement | null>(null)

const t = useCopy({
  th: {
    bleed: 'หลงรักบ้าน · หลงรักงาน',
    eyebrow: 'Pilot · Early Access',
    l1: 'บ้านที่', l1Em: 'รัก',
    l2: 'งานที่', l2Em: 'ไว้ใจ',
    lede: 'เรากำลังเปิดทดลองกับร้านบิ้วอิน/รีโนเวท และเจ้าของบ้านที่กำลังจะว่าจ้าง ฝากช่องทางติดต่อไว้ แล้วเราจะติดต่อกลับเพื่อคุยรายละเอียด',
    line: 'LINE OA — เร็ว ๆ นี้',
    email: 'อีเมล — เร็ว ๆ นี้',
    iAm: 'ฉันเป็น',
    owner: 'เจ้าของบ้าน',
    contractor: 'ผู้รับเหมา / ร้าน',
    name: 'ชื่อ',
    contact: 'อีเมล หรือ LINE ID',
    consent: 'ยินยอมให้ LongRak ใช้ข้อมูลนี้เพื่อติดต่อกลับเรื่องการทดลองใช้งานเท่านั้น',
    submit: 'ขอทดลองใช้งาน',
    demo: 'Demo: ระบบรับลงทะเบียนยังไม่เชื่อมต่อ ข้อมูลของคุณยังไม่ถูกส่งหรือบันทึก',
  },
  en: {
    bleed: 'Love the home · Trust the work',
    eyebrow: 'Pilot · Early Access',
    l1: 'Love your ', l1Em: 'home.',
    l2: 'Trust the ', l2Em: 'work.',
    lede: 'We are opening a pilot with built-in and renovation workshops, and with homeowners about to hire. Leave your contact details and we will get back to you to talk it through.',
    line: 'LINE OA — coming soon',
    email: 'Email — coming soon',
    iAm: 'I am a',
    owner: 'Homeowner',
    contractor: 'Contractor / shop',
    name: 'Name',
    contact: 'Email or LINE ID',
    consent: 'I agree that LongRak may use this information only to contact me about the pilot.',
    submit: 'Request pilot access',
    demo: 'Demo: registration is not connected yet. Your details have not been sent or saved.',
  },
})

const { locale } = useI18n()

const form = reactive({ name: '', contact: '', role: 'owner', consent: false })
const status = ref<'idle' | 'demo'>('idle')

function submit() {
  // TODO: POST to /api/leads (Strapi) once the endpoint and privacy notice are ready.
  status.value = 'demo'
}

useScene(root, () => {
  gsap.fromTo('.ct-bleed', { xPercent: 12 }, {
    xPercent: -18, ease: 'none',
    scrollTrigger: { trigger: root.value, start: 'top bottom', end: 'bottom top', scrub: true },
  })

  // Last scene before the footer: it scrubs in (and back out when scrolling up);
  // no exit tween, since the page ends before it could leave the viewport.
  inOutTimeline('.ct-inner', 'top 90%', 'top 25%')
    .from('.ct-head .line-mask > span', { yPercent: 110, stagger: 0.15, ease: 'power3.out', duration: 1 })
    .from('.ct-lede', { y: 24, opacity: 0, duration: 0.8 }, 0.3)
    .from('.ct-form', { y: 120, rotateX: 16, opacity: 0, ease: 'power3.out', duration: 1.2 }, 0.2)
    .from('.ct-channel', { y: 20, opacity: 0, stagger: 0.1, duration: 0.6 }, 0.6)
})
</script>

<template>
  <section id="contact" ref="root" class="relative overflow-hidden bg-paper pb-24 pt-28 md:pb-32 md:pt-40" aria-labelledby="contact-title">
    <!-- DEPTH 0 — bleed type -->
    <div class="ct-bleed pointer-events-none absolute left-0 top-10 whitespace-nowrap font-display text-[26vw] font-extralight leading-none text-coral-500/[0.07]" data-depth="0" aria-hidden="true">
      {{ t.bleed }}
    </div>
    <div class="pointer-events-none absolute inset-0" data-depth="1" aria-hidden="true">
      <div class="absolute bottom-0 left-1/2 size-[60vw] -translate-x-1/2 translate-y-1/2 rounded-full bg-coral-500/10 blur-[120px]" />
    </div>

    <div class="ct-inner relative mx-auto grid max-w-7xl gap-14 px-6 md:grid-cols-[1fr_1.1fr] md:items-center [perspective:1400px]" data-depth="4">
      <div class="ct-head">
        <p class="eyebrow text-navy-700">{{ t.eyebrow }}</p>
        <h2
          id="contact-title"
          class="mt-6 font-display font-light leading-[1.12]"
          :class="locale === 'en' ? 'text-[clamp(2.2rem,4.6vw,4.2rem)]' : 'text-[clamp(2.4rem,5.4vw,4.8rem)]'"
        >
          <span class="line-mask"><span>{{ t.l1 }}<em class="text-heart font-medium">{{ t.l1Em }}</em></span></span>
          <span class="line-mask"><span>{{ t.l2 }}<em class="text-gold font-medium">{{ t.l2Em }}</em></span></span>
        </h2>
        <p class="ct-lede mt-6 max-w-md text-[15.5px] leading-relaxed text-navy-700">
          {{ t.lede }}
        </p>
        <ul class="mt-8 flex flex-wrap gap-3">
          <li class="ct-channel inline-flex items-center gap-2 rounded-full border border-navy-900/10 bg-white/70 px-4 py-2 text-[13.5px] text-navy-700">
            <HIcon name="chat" :size="16" class="text-success" />{{ t.line }}
          </li>
          <li class="ct-channel inline-flex items-center gap-2 rounded-full border border-navy-900/10 bg-white/70 px-4 py-2 text-[13.5px] text-navy-700">
            <HIcon name="mail" :size="16" class="text-gold-600" />{{ t.email }}
          </li>
        </ul>
      </div>

      <form
        class="ct-form rounded-[2rem] border border-white bg-white/80 p-7 shadow-[0_50px_120px_-50px_rgba(19,45,80,.5)] backdrop-blur md:p-10"
        @submit.prevent="submit"
      >
        <fieldset class="grid grid-cols-2 gap-2 rounded-full bg-paper-2 p-1.5">
          <legend class="sr-only">{{ t.iAm }}</legend>
          <label
            v-for="r in [{ v: 'owner', i: 'home' }, { v: 'contractor', i: 'briefcase' }] as const"
            :key="r.v"
            class="flex cursor-pointer items-center justify-center gap-2 rounded-full px-3 py-2.5 text-[14px] transition-colors duration-500"
            :class="form.role === r.v ? 'bg-navy-900 text-paper shadow' : 'text-navy-700 hover:text-navy-900'"
          >
            <input v-model="form.role" type="radio" name="role" :value="r.v" class="sr-only">
            <HIcon :name="r.i" :size="16" />{{ t[r.v] }}
          </label>
        </fieldset>

        <label class="mt-6 block">
          <span class="text-[13px] text-navy-700">{{ t.name }}</span>
          <input v-model="form.name" required autocomplete="name" class="mt-2 w-full rounded-2xl border border-navy-900/10 bg-paper px-4 py-3 text-navy-900 outline-none transition focus:border-gold-500 focus:ring-4 focus:ring-gold-500/15">
        </label>
        <label class="mt-4 block">
          <span class="text-[13px] text-navy-700">{{ t.contact }}</span>
          <input v-model="form.contact" required class="mt-2 w-full rounded-2xl border border-navy-900/10 bg-paper px-4 py-3 text-navy-900 outline-none transition focus:border-gold-500 focus:ring-4 focus:ring-gold-500/15">
        </label>
        <label class="mt-5 flex items-start gap-3 text-[13px] text-navy-700">
          <input v-model="form.consent" type="checkbox" required class="mt-1 size-4 accent-navy-900">
          {{ t.consent }}
        </label>

        <button type="submit" class="btn-primary group mt-7 w-full justify-center">
          {{ t.submit }}
          <HIcon name="arrow-right" :size="18" class="icon-nudge" />
        </button>

        <p
          v-if="status === 'demo'"
          role="status"
          class="mt-4 flex items-start gap-2 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-[13px] text-navy-800"
        >
          <HIcon name="info-circle" :size="16" class="mt-0.5 shrink-0 text-warning" />
          {{ t.demo }}
        </p>
      </form>
    </div>
  </section>
</template>
