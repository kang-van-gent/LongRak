import type { AiReport } from '#shared/utils/aiReport'

/**
 * Sample Mode (context.md §6): a FICTIONAL quotation with a PRECOMPUTED result.
 * No upload, no AI call, no tokens, nothing random. Always shown with a Sample label.
 * Same fictional kitchen quotation as the landing-page demo.
 */
const base = {
  schema_version: '1.0',
  analysis_id: 'sample-kitchen-001',
  document_type: 'quotation',
  document_read_status: 'complete',
  amounts: {
    contract_total_thb: 200000,
    listed_milestones_total_thb: 200000,
    advance_thb: 100000,
    advance_ratio: 0.5,
    arithmetic_verified: true,
  },
  is_sample: true,
} as const

export const sampleReports: Record<'th' | 'en', AiReport> = {
  th: {
    ...base,
    summary: 'ใบเสนอราคางานรีโนเวทห้องครัว (เอกสารสมมติ) ยอดงวดรวมตรงกับยอดสัญญา แต่ยังมีรายการที่ควรทบทวนก่อนโอนมัดจำ',
    findings: [
      {
        id: 'F001',
        dimension: 'deposit',
        status: 'needs_attention',
        title: 'ยังไม่พบรายละเอียดรองรับการจ่ายล่วงหน้า',
        reason: 'เอกสารระบุมัดจำ 50% ของยอดรวม แต่ไม่พบรายการวัสดุหรือเกณฑ์ส่งมอบที่ผูกกับเงินก้อนนี้',
        document_evidence: [{ page: 2, quote: 'งวดที่ 1 มัดจำ 100,000 บาท' }],
        knowledge_citations: [],
        question_to_ask: 'เงินก้อนนี้ใช้ซื้อวัสดุอะไร และมีหลักฐานการจัดซื้อ/ส่งมอบอย่างไร',
        suggested_action: 'ขอรายการวัสดุและหลักฐานการสั่งซื้อก่อนยืนยันเงื่อนไขจ่ายล่วงหน้า',
        needs_professional_review: false,
      },
      {
        id: 'F002',
        dimension: 'dates',
        status: 'missing_information',
        title: 'ไม่พบกำหนดวันแล้วเสร็จ',
        reason: 'ไม่พบวันเริ่มงาน วันส่งมอบ หรือเงื่อนไขการขยายเวลาในเอกสารที่อ่านได้',
        document_evidence: [],
        knowledge_citations: [],
        question_to_ask: 'ขอวันเริ่ม–วันส่งมอบ และเงื่อนไขที่ขยายเวลาได้',
        suggested_action: 'ระบุวันเริ่ม วันส่งมอบ และเหตุที่ขยายเวลาได้ไว้ในเอกสาร',
        needs_professional_review: false,
      },
      {
        id: 'F003',
        dimension: 'acceptance',
        status: 'missing_information',
        title: 'ยังไม่พบเกณฑ์ตรวจรับก่อนเรียกเก็บงวดที่ 2',
        reason: 'งวดที่ 2 อ้างอิง “เมื่อติดตั้งตู้” แต่ไม่ระบุว่าตรวจรับอะไร โดยใคร และแก้ไขงานอย่างไรหากไม่ผ่าน',
        document_evidence: [{ page: 2, quote: 'งวดที่ 2 60,000 บาท เมื่อติดตั้งตู้' }],
        knowledge_citations: [],
        question_to_ask: 'การติดตั้งตู้ถือว่าเสร็จเมื่อไร และถ้าพบจุดต้องแก้ จะแก้ก่อนหรือหลังจ่ายงวดนี้',
        suggested_action: 'เพิ่มรายการตรวจรับ (เช่น ระดับ บานพับ รอยต่อ) ที่ทั้งสองฝ่ายยืนยันร่วมกัน',
        needs_professional_review: false,
      },
      {
        id: 'F004',
        dimension: 'money',
        status: 'present_in_document',
        title: 'ผลรวมงวดเท่ากับยอดสัญญา',
        reason: '100,000 + 60,000 + 40,000 = 200,000 บาท (ตรวจด้วยโค้ด) — พบข้อมูลเท่านั้น ไม่ได้รับรองความถูกต้องของราคาหรืองาน',
        document_evidence: [{ page: 2, quote: 'ยอดรวม 200,000 บาท' }],
        knowledge_citations: [],
        needs_professional_review: false,
      },
    ],
    missing_information: ['กำหนดวันแล้วเสร็จ', 'เกณฑ์ตรวจรับงาน', 'เงื่อนไขการรับประกันงาน'],
    limitations: [
      'ตัวอย่างนี้ใช้เอกสารสมมติและผลลัพธ์ที่คำนวณไว้ล่วงหน้า ไม่ได้ส่งให้ AI วิเคราะห์',
      'ไม่ใช่คำปรึกษาทางกฎหมายหรือผลตรวจของวิศวกร และไม่ได้รับรองคุณภาพงานหรือราคา',
    ],
  },
  en: {
    ...base,
    summary: 'A kitchen-renovation quotation (fictional). The milestones add up to the contract total, but some items are worth reviewing before paying the deposit.',
    findings: [
      {
        id: 'F001',
        dimension: 'deposit',
        status: 'needs_attention',
        title: 'No details found supporting the advance payment',
        reason: 'The document asks for 50% of the total as a deposit, but no materials list or deliverable is tied to that payment.',
        document_evidence: [{ page: 2, quote: 'Milestone 1: deposit 100,000 THB' }],
        knowledge_citations: [],
        question_to_ask: 'What materials does this payment buy, and what proof of purchase or delivery will there be?',
        suggested_action: 'Ask for the materials list and purchase evidence before agreeing to the advance payment.',
        needs_professional_review: false,
      },
      {
        id: 'F002',
        dimension: 'dates',
        status: 'missing_information',
        title: 'No completion date found',
        reason: 'No start date, handover date or extension conditions were found in the readable document.',
        document_evidence: [],
        knowledge_citations: [],
        question_to_ask: 'Ask for start and handover dates, and the conditions under which they can be extended.',
        suggested_action: 'Write the start date, handover date and allowed reasons for delay into the document.',
        needs_professional_review: false,
      },
      {
        id: 'F003',
        dimension: 'acceptance',
        status: 'missing_information',
        title: 'No sign-off criteria before milestone 2 is billed',
        reason: 'Milestone 2 is due “on cabinet install”, but it does not say what is checked, by whom, or how defects are fixed.',
        document_evidence: [{ page: 2, quote: 'Milestone 2: 60,000 THB on cabinet install' }],
        knowledge_citations: [],
        question_to_ask: 'When does the install count as done — and if something needs fixing, is it fixed before or after this payment?',
        suggested_action: 'Add a short sign-off checklist (levels, hinges, joints) that both sides confirm.',
        needs_professional_review: false,
      },
      {
        id: 'F004',
        dimension: 'money',
        status: 'present_in_document',
        title: 'Milestones add up to the contract total',
        reason: '100,000 + 60,000 + 40,000 = 200,000 THB (checked by code) — information found only; this does not certify the price or the work.',
        document_evidence: [{ page: 2, quote: 'Total 200,000 THB' }],
        knowledge_citations: [],
        needs_professional_review: false,
      },
    ],
    missing_information: ['Completion date', 'Sign-off criteria', 'Warranty terms'],
    limitations: [
      'This sample uses a fictional document and a precomputed result. Nothing was sent to an AI.',
      'Not legal advice or an engineer\'s inspection, and it does not certify the quality of the work or the price.',
    ],
  },
}
