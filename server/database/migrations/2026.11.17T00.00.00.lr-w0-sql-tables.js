'use strict';

/**
 * LongRak W0 — custom SQL tables (longrak-database-er-strapi.md §6.1, §7.1–7.2, §14.1, §15).
 * These are deliberately NOT Strapi content types: private/ephemeral extraction data,
 * vector search, provenance traces and anonymous telemetry.
 *
 * - PostgreSQL only (skipped on SQLite dev databases).
 * - Prefixed lr_ so they never collide with Strapi-managed tables.
 * - Idempotent (IF NOT EXISTS), safe to re-run.
 * - lr_kb_embeddings needs pgvector AND a decided embedding dimension (open decision §20):
 *   it is created only when KB_EMBEDDING_DIMENSIONS is set, e.g. KB_EMBEDDING_DIMENSIONS=1024.
 */

const isPostgres = (knex) => ['pg', 'postgres', 'postgresql'].includes(knex.client.config.client);

module.exports = {
  async up(knex) {
    if (!isPostgres(knex)) {
      console.warn('[lr-w0-sql] not PostgreSQL — skipping custom SQL tables');
      return;
    }

    await knex.raw('CREATE EXTENSION IF NOT EXISTS pgcrypto');

    await knex.raw(`
      -- §6.1 page-level text extraction (private, TTL) ------------------------------
      CREATE TABLE IF NOT EXISTS lr_extracted_pages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        input_public_id UUID NOT NULL,
        page_number INTEGER NOT NULL CHECK (page_number > 0),
        text_object_key TEXT,
        text_sha256 CHAR(64),
        extractor_version TEXT NOT NULL,
        ocr_engine TEXT,
        confidence_numeric NUMERIC(5,4),
        quality_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
        bbox_index_object_key TEXT,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_lr_extracted_page UNIQUE (input_public_id, page_number)
      );
      CREATE INDEX IF NOT EXISTS idx_lr_extracted_pages_expires ON lr_extracted_pages (expires_at);

      CREATE TABLE IF NOT EXISTS lr_extracted_fields (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_public_id UUID NOT NULL,
        field_code TEXT NOT NULL,
        value_json JSONB,
        normalized_value_json JSONB,
        source_input_id UUID,
        source_page INTEGER,
        source_span JSONB,
        read_state TEXT NOT NULL CHECK (read_state IN ('read','partial','not_found','unreadable')),
        extractor_version TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_lr_extracted_fields_job ON lr_extracted_fields (job_public_id, field_code);
      CREATE INDEX IF NOT EXISTS idx_lr_extracted_fields_expires ON lr_extracted_fields (expires_at);

      -- §7.2 curated knowledge chunks (never customer documents) -------------------
      CREATE TABLE IF NOT EXISTS lr_kb_chunks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        public_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
        source_version_public_id UUID NOT NULL,
        chunk_order INTEGER NOT NULL CHECK (chunk_order >= 0),
        section_path TEXT,
        page_start INTEGER,
        page_end INTEGER,
        body_text TEXT NOT NULL,
        body_sha256 CHAR(64) NOT NULL,
        language VARCHAR(10) NOT NULL DEFAULT 'th',
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_lr_kb_chunk_version_order UNIQUE (source_version_public_id, chunk_order)
      );
      CREATE INDEX IF NOT EXISTS idx_lr_kb_chunks_source_version ON lr_kb_chunks (source_version_public_id);
      CREATE INDEX IF NOT EXISTS idx_lr_kb_chunks_metadata_gin ON lr_kb_chunks USING gin (metadata);

      CREATE TABLE IF NOT EXISTS lr_kb_snapshot_members (
        snapshot_public_id UUID NOT NULL,
        source_version_public_id UUID NOT NULL,
        added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        role TEXT,
        PRIMARY KEY (snapshot_public_id, source_version_public_id)
      );

      CREATE TABLE IF NOT EXISTS lr_retrieval_traces (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        run_public_id UUID NOT NULL,
        kb_snapshot_key TEXT NOT NULL,
        retriever_version TEXT NOT NULL,
        query_digest CHAR(64) NOT NULL,          -- no raw user prompt
        returned_chunk_ids UUID[] NOT NULL DEFAULT '{}',
        scores JSONB NOT NULL DEFAULT '{}'::jsonb,
        filter_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_lr_retrieval_traces_run ON lr_retrieval_traces (run_public_id);

      CREATE TABLE IF NOT EXISTS lr_rule_execution_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        run_public_id UUID NOT NULL,
        rule_version_public_id UUID NOT NULL,
        evaluation_state TEXT NOT NULL,
        input_digest CHAR(64) NOT NULL,
        result_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_lr_rule_exec_run ON lr_rule_execution_records (run_public_id);

      -- §7.1 evaluation detail (no production private data) -----------------------
      CREATE TABLE IF NOT EXISTS lr_evaluation_results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        evaluation_run_public_id UUID NOT NULL,
        evaluation_case_public_id UUID NOT NULL,
        result_digest CHAR(64) NOT NULL,
        field_accuracy JSONB NOT NULL DEFAULT '{}'::jsonb,
        finding_precision NUMERIC(6,5),
        finding_recall NUMERIC(6,5),
        citation_precision NUMERIC(6,5),
        error_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_lr_eval_result UNIQUE (evaluation_run_public_id, evaluation_case_public_id)
      );

      -- §6.1 AI call metadata only: no prompt/document/PII/API key ------------------
      CREATE TABLE IF NOT EXISTS lr_ai_invocations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        run_public_id UUID NOT NULL,
        provider_key TEXT NOT NULL,
        model_id TEXT NOT NULL,
        request_trace_id TEXT,
        request_digest CHAR(64),
        response_digest CHAR(64),
        prompt_version_key TEXT,
        model_parameters_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        input_tokens INTEGER,
        output_tokens INTEGER,
        latency_ms INTEGER,
        cost_estimate_thb NUMERIC(14,4),
        error_code TEXT,
        started_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_lr_ai_invocations_run ON lr_ai_invocations (run_public_id);
      CREATE INDEX IF NOT EXISTS idx_lr_ai_invocations_started ON lr_ai_invocations (started_at);

      -- §15 anonymous funnel analytics + abuse control (minimal, TTL) ----------------
      CREATE TABLE IF NOT EXISTS lr_analytics_funnel_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        anonymous_session_digest CHAR(64) NOT NULL,
        event_name TEXT NOT NULL,
        page_path TEXT,
        experiment_variant TEXT,
        cohort_source TEXT,
        occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        safe_props_json JSONB NOT NULL DEFAULT '{}'::jsonb,   -- never document text, file names, amounts tied to identity, OTP or PII
        expires_at TIMESTAMPTZ NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_lr_funnel_event_time ON lr_analytics_funnel_events (event_name, occurred_at);
      CREATE INDEX IF NOT EXISTS idx_lr_funnel_expires ON lr_analytics_funnel_events (expires_at);

      CREATE TABLE IF NOT EXISTS lr_abuse_control_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        risk_bucket_hash CHAR(64) NOT NULL,
        event_kind TEXT NOT NULL,
        action_taken TEXT NOT NULL,
        occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        expires_at TIMESTAMPTZ NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_lr_abuse_bucket_time ON lr_abuse_control_events (risk_bucket_hash, occurred_at);
      CREATE INDEX IF NOT EXISTS idx_lr_abuse_expires ON lr_abuse_control_events (expires_at);
    `);

    // §14.1 embeddings — pgvector + a decided dimension
    const dim = Number.parseInt(process.env.KB_EMBEDDING_DIMENSIONS ?? '', 10);
    if (!Number.isInteger(dim) || dim <= 0) {
      console.warn('[lr-w0-sql] KB_EMBEDDING_DIMENSIONS not set — lr_kb_embeddings not created yet (decide the embedding model first)');
      return;
    }
    try {
      await knex.raw('CREATE EXTENSION IF NOT EXISTS vector');
    }
    catch (err) {
      console.warn('[lr-w0-sql] pgvector extension unavailable — use the pgvector/pgvector Postgres image. lr_kb_embeddings not created.');
      return;
    }
    await knex.raw(`
      CREATE TABLE IF NOT EXISTS lr_kb_embeddings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        chunk_id UUID NOT NULL REFERENCES lr_kb_chunks(id) ON DELETE CASCADE,
        embedding_model_key TEXT NOT NULL,
        embedding_dimensions INTEGER NOT NULL CHECK (embedding_dimensions = ${dim}),
        embedding VECTOR(${dim}) NOT NULL,
        embedded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        vector_sha256 CHAR(64),
        CONSTRAINT uq_lr_kb_embedding_model UNIQUE (chunk_id, embedding_model_key)
      );
      CREATE INDEX IF NOT EXISTS idx_lr_kb_embeddings_hnsw_cosine ON lr_kb_embeddings USING hnsw (embedding vector_cosine_ops);
    `);
  },

  async down() {
    // Intentionally not reversible automatically: dropping these tables deletes data.
  },
};
