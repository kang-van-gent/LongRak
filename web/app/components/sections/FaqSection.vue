<script setup lang="ts">
/**
 * FAQ — native <details> accordion (keyboard + screen reader friendly)
 * Techniques: sticky title column, items slide in from the right and lift out.
 * Toggling refreshes ScrollTrigger because the page height changes.
 */
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const root = ref<HTMLElement | null>(null)

const t = useCopy({
  th: {
    h1: 'คำถามที่',
    h2Em: 'พบบ่อย',
    more: 'ไม่เจอคำตอบที่ต้องการ? ส่งคำถามมาได้ในแบบฟอร์มด้านล่าง',
    faqs: [
      {
        q: 'ผลวิเคราะห์จาก AI ถือเป็นคำปรึกษาทางกฎหมายไหม?',
        a: 'ไม่ใช่ AI ของ LongRak ช่วยตรวจความครบถ้วนและชี้จุดที่ควรทบทวนเบื้องต้นเท่านั้น หากเป็นเรื่องข้อกฎหมายหรือโครงสร้าง ควรปรึกษาทนายหรือวิศวกรที่มีคุณสมบัติ',
      },
      {
        q: 'ถ้า AI อ่านเอกสารไม่ออก จะเกิดอะไรขึ้น?',
        a: 'ระบบจะบอกตรง ๆ ว่า “อ่านไม่ครบ” หรือ “ข้อมูลไม่พอ” และขอไฟล์ใหม่ แทนการเดาผลลัพธ์',
      },
      {
        q: 'เอกสารที่อัปโหลดจะถูกเก็บไว้นานแค่ไหน?',
        a: 'เราจะแจ้งระยะเวลาเก็บอย่างชัดเจนก่อนเปิดรับไฟล์จริง และลบไฟล์ชั่วคราวตามรอบที่แจ้ง เอกสารของคุณจะไม่ถูกนำไปเป็นคลังความรู้ส่วนกลางหรือใช้ฝึกโมเดล',
      },
      {
        q: 'LongRak รับพักเงินค่าก่อสร้างไหม?',
        a: 'ไม่รับ ผู้ว่าจ้างจ่ายให้ผู้รับเหมาโดยตรง LongRak บันทึกว่าแจ้งจ่ายแล้วและอีกฝ่ายยืนยันรับเงินแล้ว — สองเหตุการณ์นี้แยกจากกันเสมอ',
      },
      {
        q: 'ผู้รับเหมาต้องเสียค่าใช้จ่ายไหม?',
        a: 'แนวคิดเริ่มต้นคือผู้ว่าจ้างเป็นผู้จ่าย และผู้รับเหมาเข้าร่วมได้ฟรี หรือร้านบิ้วอินจะเป็นผู้จ่ายแล้วเชิญลูกค้าเข้ามาฟรีก็ได้ (อยู่ระหว่างทดลอง) ใครจ่ายก็ไม่มีสิทธิแก้ข้อมูลแทนอีกฝ่าย',
      },
      {
        q: 'หลักฐานใน LongRak ใช้ในศาลได้ไหม?',
        a: 'หลักฐานอิเล็กทรอนิกส์อาจนำไปประกอบการใช้สิทธิทางกฎหมายได้ แต่ศาลเป็นผู้ชั่งน้ำหนักความน่าเชื่อถือ LongRak ไม่รับรองผลทางคดี',
      },
    ],
  },
  en: {
    h1: 'Frequently asked',
    h2Em: 'questions',
    more: 'Can\'t find what you need? Send us your question using the form below.',
    faqs: [
      {
        q: 'Is the AI analysis legal advice?',
        a: 'No. LongRak\'s AI only checks completeness and points out what is worth reviewing. For legal or structural questions, consult a qualified lawyer or engineer.',
      },
      {
        q: 'What happens if the AI can\'t read my document?',
        a: 'It tells you plainly that the document is “not fully readable” or that there is “missing information”, and asks for a new file instead of guessing.',
      },
      {
        q: 'How long are uploaded documents kept?',
        a: 'We will state the retention period clearly before accepting real files, and delete temporary files on the stated schedule. Your documents are never added to a shared knowledge base or used to train models.',
      },
      {
        q: 'Does LongRak hold construction payments?',
        a: 'No. The client pays the contractor directly. LongRak records that a payment was reported and that the other side confirmed receiving it — these are always two separate events.',
      },
      {
        q: 'Do contractors have to pay?',
        a: 'The starting idea is that the client pays and contractors join free — or a built-in workshop pays and invites its customer free (still being tested). Whoever pays never gets the right to edit the other side\'s information.',
      },
      {
        q: 'Can evidence from LongRak be used in court?',
        a: 'Electronic evidence may support a legal claim, but courts decide how much weight it carries. LongRak does not guarantee any legal outcome.',
      },
    ],
  },
})

let refreshTimer: ReturnType<typeof setTimeout> | undefined
function onToggle() {
  clearTimeout(refreshTimer)
  refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 350)
}

useScene(root, () => {
  inOutTimeline('.fq-title', 'top 90%', 'bottom 10%')
    .from('.fq-title .line-mask > span', { yPercent: 110, stagger: 0.15, ease: 'power3.out', duration: 1 })
    .from('.fq-title .fq-icon path', { drawSVG: '0%', duration: 0.8 }, 0.2)
    .to('.fq-title', { opacity: 0, y: -40, duration: 1 }, '+=2')

  gsap.utils.toArray<HTMLElement>('.fq-item').forEach((item) => {
    inOutTimeline(item, 'top 95%', 'bottom 5%')
      .from(item, { x: 80, opacity: 0, ease: 'power3.out', duration: 1 })
      .to(item, { y: -30, opacity: 0, ease: 'power2.in', duration: 1 }, '+=2.5')
  })
})
</script>

<template>
  <section id="faq" ref="root" class="relative overflow-x-clip bg-paper py-28 md:py-40" aria-labelledby="faq-title">
    <div class="pointer-events-none absolute inset-0 overflow-hidden" data-depth="0" aria-hidden="true">
      <div class="absolute right-[-10%] top-[10%] size-[36vw] rounded-full bg-peach-400/10 blur-[120px]" />
    </div>
    <div class="relative mx-auto grid max-w-7xl gap-12 px-6 md:grid-cols-[1fr_1.4fr] md:gap-20" data-depth="4">
      <div>
        <div class="fq-title md:sticky md:top-32">
          <span class="fq-icon grid size-14 place-items-center rounded-2xl bg-paper-2 text-gold-600"><HIcon name="user-asking" :size="28" :stroke="1.5" /></span>
          <h2 id="faq-title" class="mt-6 font-display text-[clamp(2.2rem,4.4vw,3.8rem)] font-light leading-[1.15]">
            <span class="line-mask"><span>{{ t.h1 }}</span></span>
            <span class="line-mask"><span><em class="text-heart font-medium">{{ t.h2Em }}</em></span></span>
          </h2>
          <p class="mt-5 max-w-sm text-[15px] text-navy-700">{{ t.more }}</p>
        </div>
      </div>

      <div class="divide-y divide-navy-900/10 border-y border-navy-900/10">
        <details v-for="f in t.faqs" :key="f.q" class="fq-item group py-2" @toggle="onToggle">
          <summary class="flex cursor-pointer items-center justify-between gap-6 py-5 font-display text-lg text-navy-900 md:text-xl">
            {{ f.q }}
            <span class="grid size-10 shrink-0 place-items-center rounded-full border border-navy-900/10 transition-colors group-hover:border-gold-500 group-open:bg-navy-900 group-open:text-paper">
              <HIcon name="plus" :size="18" class="faq-plus transition-transform duration-500 ease-luxe" />
            </span>
          </summary>
          <p class="pb-6 pr-14 text-[15px] leading-relaxed text-navy-700">{{ f.a }}</p>
        </details>
      </div>
    </div>
  </section>
</template>
