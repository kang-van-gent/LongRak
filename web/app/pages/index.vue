<script setup lang="ts">
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const route = useRoute()
const scrollTo = useSmoothScroll()
onMounted(() => {
  if (!route.hash) return
  // wait for fonts + every section's pins to exist, then jump (pinned scenes need real positions)
  const land = () => {
    ScrollTrigger.refresh()
    scrollTo(route.hash, { immediate: true })
  }
  ;(document.fonts?.ready ?? Promise.resolve()).then(() => requestAnimationFrame(() => requestAnimationFrame(land)))
})

const t = useCopy({
  th: {
    title: 'LongRak (หลงรัก) — ข้อตกลงชัดเจน หลักฐานตรวจสอบได้',
    description:
      'พื้นที่กลางสำหรับเจ้าของบ้านและผู้รับเหมา: เอกสาร ข้อตกลง งวดงาน และหลักฐานที่ตรวจสอบย้อนหลังได้ พร้อม AI ช่วยหาจุดที่ควรทบทวนในใบเสนอราคาหรือสัญญา',
    ogDescription: 'ก่อนตกลงจ้าง ลองตรวจให้ชัด ก่อนเริ่มงาน เก็บหลักฐานให้ครบ',
  },
  en: {
    title: 'LongRak — Clear agreements, verifiable evidence',
    description:
      'A neutral space for homeowners and contractors: documents, agreements, milestones and evidence you can verify later, with AI that points out what to review in a quotation or contract.',
    ogDescription: 'Check it clearly before you hire. Keep the evidence complete before work begins.',
  },
})

useSeoMeta({
  title: () => t.value.title,
  description: () => t.value.description,
  ogTitle: 'LongRak (หลงรัก)',
  ogDescription: () => t.value.ogDescription,
  ogImage: '/brand/longrak-logo-master.png',
  twitterCard: 'summary_large_image',
})
</script>

<template>
  <div>
    <SiteHeader />
    <main id="main">
      <SectionsHeroSection />
      <SectionsManifestoSection />
      <SectionsTwoSidedSection />
      <SectionsPillarsSection />
      <SectionsReportDemoSection />
      <SectionsHowItWorksSection />
      <SectionsLedgerSection />
      <SectionsPricingSection />
      <SectionsTrustSection />
      <SectionsFaqSection />
      <SectionsContactSection />
    </main>
    <SiteFooter />
  </div>
</template>
