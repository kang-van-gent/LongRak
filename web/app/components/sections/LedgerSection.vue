<script setup lang="ts">
/**
 * SHARED EVIDENCE LEDGER (W1 preview, coming soon) — dark scene
 * Techniques: circle iris open, staggered audit rows with scrambled SHA-256
 * digests, trust-invariant cards, scrubbed exit.
 * Every row is labelled as an example: nothing here reflects a real event.
 */
import { gsap } from 'gsap'
import type { HumbleIconName } from '~/utils/humbleicons'

const root = ref<HTMLElement | null>(null)

const t = useCopy({
  th: {
    h1: 'พื้นที่หลักฐาน',
    h2Em: 'ร่วมกัน',
    h2: 'ของสองฝ่าย',
    lede: 'ทุกเหตุการณ์บันทึกผู้กระทำ เวลา เวอร์ชัน และค่า SHA-256 ของไฟล์ต้นฉบับ — ค่า hash พิสูจน์ได้ว่าไฟล์ไม่ถูกแก้ แต่ไม่ได้พิสูจน์ว่าภาพถ่ายตรงกับความจริงหน้างาน',
    project: 'รีโนเวทห้องครัว · 150,000 บาท',
    demo: 'ตัวอย่างโครงการ (Demo) — ไม่ใช่ข้อมูลจริง',
    status: 'ACTIVE · ตัวอย่าง',
    by: (actor: string, time: string) => `โดย ${actor} · ${time} น.`,
    owner: 'เจ้าของบ้าน',
    contractor: 'ผู้รับเหมา',
    actions: [
      'อัปโหลด Agreement v1',
      'รับทราบ Agreement v1 (OTP)',
      'ส่งงานงวด 1 · รูปถ่าย 6 ไฟล์',
      'แจ้งชำระเงินตรง งวด 1',
      'ยืนยันได้รับเงิน งวด 1',
    ],
    invariants: [
      'ข้อตกลงที่รับทราบแล้วแก้ทับไม่ได้ — การเปลี่ยนแปลงจะเป็นเวอร์ชันใหม่',
      'ไม่มีฝ่ายใดเปลี่ยน “ขอเบิก” เป็น “จ่ายแล้ว” หรือ “ตรวจรับแทน” อีกฝ่ายได้',
      'LongRak ไม่รับพักเงินค่าก่อสร้าง — คู่สัญญาจ่ายกันโดยตรง',
    ],
  },
  en: {
    h1: 'A shared evidence space',
    h2Em: 'for both sides',
    h2: '',
    lede: 'Every event records who did it, when, the version, and the SHA-256 hash of the original file — a hash proves a file has not been altered, but it does not prove a photo matches what is on site.',
    project: 'Kitchen renovation · 150,000 THB',
    demo: 'Example project (Demo) — not real data',
    status: 'ACTIVE · example',
    by: (actor: string, time: string) => `by ${actor} · ${time}`,
    owner: 'Homeowner',
    contractor: 'Contractor',
    actions: [
      'Uploaded Agreement v1',
      'Acknowledged Agreement v1 (OTP)',
      'Submitted milestone 1 · 6 photos',
      'Reported direct payment, milestone 1',
      'Confirmed payment received, milestone 1',
    ],
    invariants: [
      'Acknowledged agreements cannot be overwritten — any change becomes a new version',
      'Neither side can turn a “payment request” into “paid”, or sign off on the other side\'s behalf',
      'LongRak never holds construction money — the parties pay each other directly',
    ],
  },
})

const eventMeta: { icon: HumbleIconName; actor: 'owner' | 'contractor'; hash: string; time: string }[] = [
  { icon: 'document-add', actor: 'owner', hash: '3fa9c0e1…7b2d', time: '09:12' },
  { icon: 'check-circle', actor: 'contractor', hash: 'a41d77f0…c903', time: '10:47' },
  { icon: 'images', actor: 'contractor', hash: '9e02b5aa…1f6e', time: '16:05' },
  { icon: 'credit-card', actor: 'owner', hash: 'c7f3e8d2…40ab', time: '18:30' },
  { icon: 'verified', actor: 'contractor', hash: '5b18aa3c…e7d4', time: '18:52' },
]
const events = computed(() =>
  eventMeta.map((m, i) => ({ ...m, action: t.value.actions[i]!, meta: t.value.by(t.value[m.actor], m.time) })),
)

const invariantIcons: HumbleIconName[] = ['lock', 'users', 'ban']
const invariants = computed(() => invariantIcons.map((icon, i) => ({ icon, text: t.value.invariants[i]! })))

useScene(root, () => {
  // Iris opens as the section arrives
  gsap.fromTo('.lg-iris', { clipPath: 'circle(6% at 50% 45%)' }, {
    clipPath: 'circle(140% at 50% 45%)', ease: 'power2.in',
    scrollTrigger: { trigger: root.value, start: 'top 90%', end: 'top 10%', scrub: true },
  })

  const tl = inOutTimeline('.lg-content', 'top 80%', 'bottom 0%')
  tl.from('.lg-head .line-mask > span', { yPercent: 110, stagger: 0.12, ease: 'power3.out', duration: 1 })
    .from('.lg-badge', { scale: 0.7, opacity: 0, duration: 0.6 }, 0.2)
    .from('.lg-card', { y: 80, rotateX: 14, opacity: 0, duration: 1 }, 0.3)

  const hashes: [HTMLElement, string][] = []
  gsap.utils.toArray<HTMLElement>('.lg-row').forEach((row, i) => {
    const hash = row.querySelector<HTMLElement>('.lg-hash')!
    const digest = hash.textContent ?? ''
    hashes.push([hash, digest])
    hash.textContent = '············'
    tl.from(row, { x: 50, opacity: 0, duration: 0.6 }, 0.6 + i * 0.22)
      .to(hash, { scrambleText: { text: digest, chars: '0123456789abcdef' }, ease: 'none', duration: 0.8 }, '<')
  })
  tl.from('.lg-inv', { y: 40, opacity: 0, stagger: 0.15, duration: 0.7 }, 1.2)
    // OUT
    .to('.lg-card', { y: -80, opacity: 0, filter: 'blur(8px)', ease: 'power2.in', duration: 1 }, '+=2')
    .to('.lg-inv', { y: -60, opacity: 0, stagger: 0.08, duration: 0.8 }, '<')
    .to('.lg-head', { y: -40, opacity: 0, duration: 0.8 }, '<')

  return () => hashes.forEach(([el, digest]) => { el.textContent = digest })
})
</script>

<template>
  <section id="ledger" ref="root" class="relative bg-paper" aria-labelledby="ledger-title">
    <div class="lg-iris relative overflow-hidden bg-navy-950 text-paper">
      <!-- DEPTH 0/1 -->
      <div class="pointer-events-none absolute inset-0" data-depth="0" aria-hidden="true">
        <div class="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_0%,#1b3a60,transparent)]" />
        <div class="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(#ebcb86_1px,transparent_1px)] [background-size:28px_28px]" />
      </div>
      <div class="pointer-events-none absolute inset-0" data-depth="1" aria-hidden="true">
        <div class="absolute right-[-10%] bottom-[-10%] size-[44vw] rounded-full bg-coral-500/12 blur-[130px]" />
      </div>

      <div class="lg-content relative mx-auto max-w-7xl px-6 py-28 md:py-40" data-depth="4">
        <header class="lg-head grid gap-6 md:grid-cols-[1.2fr_1fr] md:items-end [&>*]:min-w-0">
          <div>
            <span class="lg-badge inline-flex items-center gap-2 rounded-full border border-gold-500/40 px-3 py-1 font-mono text-[11px] text-gold-300">
              <HIcon name="clock" :size="14" />COMING SOON · PHASE W1
            </span>
            <h2 id="ledger-title" class="mt-6 font-display text-[clamp(2.2rem,5vw,4.4rem)] font-light leading-[1.15]">
              <span class="line-mask"><span>{{ t.h1 }}</span></span>
              <span class="line-mask"><span><em class="text-gold font-medium">{{ t.h2Em }}</em>{{ t.h2 }}</span></span>
            </h2>
          </div>
          <p class="text-[15.5px] leading-relaxed text-paper/70">
            {{ t.lede }}
          </p>
        </header>

        <div class="mt-16 grid gap-6 lg:grid-cols-[1.4fr_1fr] [perspective:1400px] [&>*]:min-w-0">
          <div class="lg-card rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur sm:p-6 md:p-8">
            <div class="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">
              <div class="min-w-0">
                <p class="font-display text-xl">{{ t.project }}</p>
                <p class="mt-1 text-[12px] text-paper/50">{{ t.demo }}</p>
              </div>
              <span class="rounded-full bg-white/5 px-3 py-1 font-mono text-[11px] text-paper/60">{{ t.status }}</span>
            </div>
            <ul class="mt-4 divide-y divide-white/5">
              <li v-for="e in events" :key="e.hash" class="lg-row flex items-center gap-4 py-3.5">
                <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-white/5 text-gold-300">
                  <HIcon :name="e.icon" :size="20" :stroke="1.6" />
                </span>
                <div class="min-w-0 flex-1">
                  <p class="text-[14.5px] leading-snug [overflow-wrap:anywhere]">{{ e.action }}</p>
                  <p class="mt-0.5 text-[12px] text-paper/50">{{ e.meta }}</p>
                </div>
                <code class="lg-hash hidden font-mono text-[11.5px] text-gold-300/80 sm:block">{{ e.hash }}</code>
              </li>
            </ul>
          </div>

          <ul class="flex flex-col gap-4">
            <li v-for="v in invariants" :key="v.icon" class="lg-inv group flex flex-1 items-start gap-4 rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-6">
              <span class="grid size-11 shrink-0 place-items-center rounded-xl bg-gold-500/10 text-gold-300 transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110">
                <HIcon :name="v.icon" :size="22" :stroke="1.6" />
              </span>
              <p class="text-[15px] leading-relaxed text-paper/85">{{ v.text }}</p>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>
