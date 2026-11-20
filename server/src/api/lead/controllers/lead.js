'use strict';

/**
 * Leads — contact form and "request a project" from /ai-check.
 *
 * POST /api/longrak/leads  (custom route, see ../routes/01-longrak-lead.js)
 * Called server-to-server by the website (web/server/api/*) with a limited API token,
 * never directly from the browser. Generated CRUD stays closed to the public.
 *
 * Body (flat JSON):
 *   source            'contact_form' | 'ai_check_project_request'
 *   role              'owner' | 'contractor' | 'interior' | 'inspector' | 'other'
 *   name?             string
 *   email?            string            (email or contact is required)
 *   contact?          string            email or LINE ID, as typed in the contact form
 *   note?             string
 *   analysis_public_id? string          which document check it came from ("sample" for the demo)
 *   language?         'th' | 'en'
 *   page?             string            page path
 *   consent_contact   true              required
 *   ip_hash?          string            salted hash computed by the website server (never the raw IP)
 *
 * Creates: lead (+ consent receipt, + pilot application for contractors from the contact form).
 */
const { factories } = require('@strapi/strapi');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ROLE_TO_LEAD_TYPE = { owner: 'homeowner', homeowner: 'homeowner', contractor: 'contractor', interior: 'interior', inspector: 'inspector' };
const SOURCES = new Set(['contact_form', 'ai_check_project_request']);

const str = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined);

module.exports = factories.createCoreController('api::lead.lead', ({ strapi }) => ({
  async submit(ctx) {
    const b = ctx.request.body ?? {};
    if (typeof b !== 'object' || Array.isArray(b)) return ctx.badRequest('invalid_request');
    if (b.consent_contact !== true) return ctx.badRequest('consent_required');

    const source = SOURCES.has(b.source) ? b.source : null;
    if (!source) return ctx.badRequest('invalid_source');

    // contact: an explicit email, or the contact form's "email or LINE ID" field
    let email = str(b.email, 254)?.toLowerCase();
    let lineHandle;
    const contact = str(b.contact, 120);
    if (!email && contact) {
      if (contact.includes('@') && EMAIL_RE.test(contact)) email = contact.toLowerCase();
      else lineHandle = contact.replace(/^@/, '');
    }
    if (email && !EMAIL_RE.test(email)) return ctx.badRequest('invalid_email');
    if (!email && !lineHandle) return ctx.badRequest('contact_required');

    const language = b.language === 'en' ? 'en' : 'th';
    const leadType = ROLE_TO_LEAD_TYPE[b.role] ?? 'other';

    const lead = await strapi.documents('api::lead.lead').create({
      data: {
        name: str(b.name, 120),
        contact_email: email,
        line_handle: lineHandle,
        lead_type: leadType,
        lead_source: source,
        interest_note: str(b.note, 2000),
        contact_permission: true,
        lifecycle_state: 'new',
        created_from: str(b.page, 200),
        related_analysis_public_id: str(b.analysis_public_id, 80),
        preferred_language: language,
      },
    });

    // consent receipt — pinned to the active privacy policy text when one exists
    const policy = await strapi.documents('api::policy-version.policy-version').findFirst({
      filters: { policy_kind: 'privacy', policy_state: 'active', language },
      sort: 'effective_at:desc',
    });
    await strapi.documents('api::consent-receipt.consent-receipt').create({
      data: {
        purpose_code: 'contact_followup',
        legal_basis_record: 'consent',
        choice: 'accepted',
        captured_at: new Date().toISOString(),
        capture_method: 'web_checkbox',
        policy_sha256: policy?.content_sha256 ?? null,
        ip_hash: str(b.ip_hash, 128),
        lead: { connect: [{ documentId: lead.documentId }] },
        ...(policy ? { policy_version: { connect: [{ documentId: policy.documentId }] } } : {}),
      },
    });

    // contractors writing in through the pilot form are design-partner candidates
    if (source === 'contact_form' && leadType === 'contractor') {
      await strapi.documents('api::pilot-application.pilot-application').create({
        data: {
          business_name: str(b.name, 120),
          work_type: 'other',
          goal: str(b.note, 2000),
          application_state: 'new',
          source,
          lead: { connect: [{ documentId: lead.documentId }] },
        },
      });
    }

    ctx.status = 201;
    ctx.body = { ok: true, public_id: lead.public_id };
  },
}));
