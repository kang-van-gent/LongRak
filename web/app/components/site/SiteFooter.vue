<script setup lang="ts">
const { hrefFor, go } = useSectionNav()
const localePath = useLocalePath()
const year = new Date().getFullYear()

const t = useCopy({
  th: {
    tagline: 'พื้นที่กลางสำหรับข้อตกลง งวดงาน และหลักฐาน ระหว่างเจ้าของบ้านและผู้รับเหมา',
    navLabel: 'ลิงก์ส่วนท้าย',
    checker: 'ตรวจเอกสารด้วย AI',
    links: [['#report', 'ตัวอย่างรายงาน AI'], ['#how', 'วิธีการทำงาน'], ['#pricing', 'ราคา Early Access'], ['#trust', 'ความไว้ใจและขอบเขต'], ['#faq', 'คำถามที่พบบ่อย']],
    notice: 'LongRak ช่วยจัดการเอกสารและหลักฐาน ไม่รับประกันผลงานก่อสร้าง ไม่ให้คำปรึกษากฎหมายหรือวิศวกรรม และไม่รับฝากเงินค่าก่อสร้าง',
    legal: 'นโยบายความเป็นส่วนตัวและข้อกำหนดการใช้งาน — กำลังจัดทำ',
    madeA: 'ทำด้วย',
    madeB: 'เพื่อบ้านที่รัก',
  },
  en: {
    tagline: 'A neutral space for agreements, milestones and evidence between homeowners and contractors',
    navLabel: 'Footer links',
    checker: 'AI document check',
    links: [['#report', 'Sample AI report'], ['#how', 'How it works'], ['#pricing', 'Early Access pricing'], ['#trust', 'Trust & limits'], ['#faq', 'FAQ']],
    notice: 'LongRak helps you manage documents and evidence. It does not guarantee construction work, does not give legal or engineering advice, and does not hold construction payments.',
    legal: 'Privacy policy and terms of use — in preparation',
    madeA: 'Made with',
    madeB: 'for homes people love',
  },
})
</script>

<template>
  <footer class="relative border-t border-navy-900/10 bg-paper-2">
    <div class="mx-auto grid max-w-7xl gap-12 px-6 py-16 md:grid-cols-[1.2fr_1fr_1fr]">
      <div>
        <img src="/brand/longrak-logo.webp" alt="LongRak หลงรัก" width="160" height="160" class="-ml-3 h-36 w-auto" loading="lazy">
        <p class="mt-2 max-w-xs text-[14px] leading-relaxed text-navy-700">
          {{ t.tagline }}
        </p>
      </div>
      <nav :aria-label="t.navLabel">
        <p class="font-mono text-[11px] tracking-[0.25em] text-gold-600">EXPLORE</p>
        <ul class="mt-4 space-y-2.5 text-[14px] text-navy-700">
          <li>
            <NuxtLink :to="localePath('/ai-check')" class="inline-flex items-center gap-1.5 text-navy-900 transition-colors hover:text-gold-600">
              {{ t.checker }}<HIcon name="sparks" :size="14" class="text-gold-600" />
            </NuxtLink>
          </li>
          <li v-for="l in t.links" :key="l[0]">
            <a :href="hrefFor(l[0]!)" class="transition-colors hover:text-navy-900" @click.prevent="go(l[0]!)">{{ l[1] }}</a>
          </li>
        </ul>
      </nav>
      <div>
        <p class="font-mono text-[11px] tracking-[0.25em] text-gold-600">NOTICE</p>
        <p class="mt-4 text-[13px] leading-relaxed text-navy-700">
          {{ t.notice }}
        </p>
        <p class="mt-4 text-[12px] text-navy-500">{{ t.legal }}</p>
      </div>
    </div>
    <div class="border-t border-navy-900/10">
      <div class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-[12px] text-navy-500">
        <p>© {{ year }} LongRak (หลงรัก)</p>
        <p class="flex items-center gap-1.5">{{ t.madeA }} <HIcon name="heart" :size="14" class="icon-heartbeat text-coral-500" /> {{ t.madeB }}</p>
      </div>
    </div>
  </footer>
</template>
