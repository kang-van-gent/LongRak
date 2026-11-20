import type { Schema, Struct } from '@strapi/strapi';

export interface AdminApiToken extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_api_tokens';
  info: {
    description: '';
    displayName: 'Api Token';
    name: 'Api Token';
    pluralName: 'api-tokens';
    singularName: 'api-token';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    accessKey: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    adminPermissions: Schema.Attribute.Relation<
      'oneToMany',
      'admin::permission'
    >;
    adminUserOwner: Schema.Attribute.Relation<'manyToOne', 'admin::user'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Schema.Attribute.DefaultTo<''>;
    encryptedKey: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    expiresAt: Schema.Attribute.DateTime;
    kind: Schema.Attribute.Enumeration<['content-api', 'admin']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'content-api'>;
    lastUsedAt: Schema.Attribute.DateTime;
    lifespan: Schema.Attribute.BigInteger;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::api-token'> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Schema.Attribute.Relation<
      'oneToMany',
      'admin::api-token-permission'
    >;
    publishedAt: Schema.Attribute.DateTime;
    type: Schema.Attribute.Enumeration<['read-only', 'full-access', 'custom']> &
      Schema.Attribute.DefaultTo<'read-only'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminApiTokenPermission extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_api_token_permissions';
  info: {
    description: '';
    displayName: 'API Token Permission';
    name: 'API Token Permission';
    pluralName: 'api-token-permissions';
    singularName: 'api-token-permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'admin::api-token-permission'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    token: Schema.Attribute.Relation<'manyToOne', 'admin::api-token'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminAuditLog extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_audit_logs';
  info: {
    displayName: 'Audit Log';
    pluralName: 'audit-logs';
    singularName: 'audit-log';
  };
  options: {
    draftAndPublish: false;
    timestamps: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    date: Schema.Attribute.DateTime & Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::audit-log'> &
      Schema.Attribute.Private;
    payload: Schema.Attribute.JSON;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<'oneToOne', 'admin::user'>;
  };
}

export interface AdminPermission extends Struct.CollectionTypeSchema {
  collectionName: 'admin_permissions';
  info: {
    description: '';
    displayName: 'Permission';
    name: 'Permission';
    pluralName: 'permissions';
    singularName: 'permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    actionParameters: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    apiToken: Schema.Attribute.Relation<'manyToOne', 'admin::api-token'>;
    conditions: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<[]>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::permission'> &
      Schema.Attribute.Private;
    properties: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    publishedAt: Schema.Attribute.DateTime;
    role: Schema.Attribute.Relation<'manyToOne', 'admin::role'>;
    subject: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminRole extends Struct.CollectionTypeSchema {
  collectionName: 'admin_roles';
  info: {
    description: '';
    displayName: 'Role';
    name: 'Role';
    pluralName: 'roles';
    singularName: 'role';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::role'> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Schema.Attribute.Relation<'oneToMany', 'admin::permission'>;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    users: Schema.Attribute.Relation<'manyToMany', 'admin::user'>;
  };
}

export interface AdminSession extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_sessions';
  info: {
    description: 'Session Manager storage';
    displayName: 'Session';
    name: 'Session';
    pluralName: 'sessions';
    singularName: 'session';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
    i18n: {
      localized: false;
    };
  };
  attributes: {
    absoluteExpiresAt: Schema.Attribute.DateTime & Schema.Attribute.Private;
    childId: Schema.Attribute.String & Schema.Attribute.Private;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deviceId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
    expiresAt: Schema.Attribute.DateTime &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::session'> &
      Schema.Attribute.Private;
    metadata: Schema.Attribute.JSON & Schema.Attribute.Private;
    origin: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    sessionId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.Unique;
    status: Schema.Attribute.String & Schema.Attribute.Private;
    type: Schema.Attribute.String & Schema.Attribute.Private;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    userId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
  };
}

export interface AdminTransferToken extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_transfer_tokens';
  info: {
    description: '';
    displayName: 'Transfer Token';
    name: 'Transfer Token';
    pluralName: 'transfer-tokens';
    singularName: 'transfer-token';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    accessKey: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Schema.Attribute.DefaultTo<''>;
    expiresAt: Schema.Attribute.DateTime;
    lastUsedAt: Schema.Attribute.DateTime;
    lifespan: Schema.Attribute.BigInteger;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'admin::transfer-token'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Schema.Attribute.Relation<
      'oneToMany',
      'admin::transfer-token-permission'
    >;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminTransferTokenPermission
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_transfer_token_permissions';
  info: {
    description: '';
    displayName: 'Transfer Token Permission';
    name: 'Transfer Token Permission';
    pluralName: 'transfer-token-permissions';
    singularName: 'transfer-token-permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'admin::transfer-token-permission'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    token: Schema.Attribute.Relation<'manyToOne', 'admin::transfer-token'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminUser extends Struct.CollectionTypeSchema {
  collectionName: 'admin_users';
  info: {
    description: '';
    displayName: 'User';
    name: 'User';
    pluralName: 'users';
    singularName: 'user';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    apiTokens: Schema.Attribute.Relation<'oneToMany', 'admin::api-token'> &
      Schema.Attribute.Private;
    blocked: Schema.Attribute.Boolean &
      Schema.Attribute.Private &
      Schema.Attribute.DefaultTo<false>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    email: Schema.Attribute.Email &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    firstname: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    isActive: Schema.Attribute.Boolean &
      Schema.Attribute.Private &
      Schema.Attribute.DefaultTo<false>;
    lastname: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::user'> &
      Schema.Attribute.Private;
    password: Schema.Attribute.Password &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    preferedLanguage: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    registrationToken: Schema.Attribute.String & Schema.Attribute.Private;
    resetPasswordToken: Schema.Attribute.String & Schema.Attribute.Private;
    resetPasswordTokenExpiresAt: Schema.Attribute.DateTime &
      Schema.Attribute.Private;
    roles: Schema.Attribute.Relation<'manyToMany', 'admin::role'> &
      Schema.Attribute.Private;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    username: Schema.Attribute.String;
  };
}

export interface ApiAnalysisFeedbackAnalysisFeedback
  extends Struct.CollectionTypeSchema {
  collectionName: 'lr_analysis_feedback_entries';
  info: {
    description: 'User feedback on a report (no private document excerpts)';
    displayName: 'Analysis Feedback';
    pluralName: 'analysis-feedback-entries';
    singularName: 'analysis-feedback';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    analysis_job: Schema.Attribute.Relation<
      'manyToOne',
      'api::analysis-job.analysis-job'
    >;
    comment_sanitized: Schema.Attribute.Text;
    created_at_client: Schema.Attribute.DateTime;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    finding_accuracy_vote: Schema.Attribute.Enumeration<
      ['accurate', 'uncertain', 'inaccurate']
    >;
    helpfulness: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 5;
          min: 1;
        },
        number
      >;
    issue_kind: Schema.Attribute.Enumeration<
      [
        'incorrect_amount',
        'wrong_reference',
        'unreadable',
        'unclear',
        'privacy',
        'other',
      ]
    > &
      Schema.Attribute.DefaultTo<'other'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::analysis-feedback.analysis-feedback'
    > &
      Schema.Attribute.Private;
    public_id: Schema.Attribute.String &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 36;
        minLength: 36;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiAnalysisFindingAnalysisFinding
  extends Struct.CollectionTypeSchema {
  collectionName: 'lr_analysis_findings';
  info: {
    description: 'One observation in a report. Not a legal judgment; no risk percentages.';
    displayName: 'Analysis Finding';
    pluralName: 'analysis-findings';
    singularName: 'analysis-finding';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    analysis_run: Schema.Attribute.Relation<
      'manyToOne',
      'api::analysis-run.analysis-run'
    >;
    confidence_level: Schema.Attribute.Enumeration<
      ['low', 'medium', 'high', 'unknown']
    > &
      Schema.Attribute.DefaultTo<'unknown'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    dimension: Schema.Attribute.Enumeration<
      [
        'parties',
        'scope',
        'materials',
        'money',
        'deposit',
        'milestones',
        'dates',
        'acceptance',
        'change_control',
        'warranty',
        'cancellation',
        'evidence',
        'signature',
        'other',
      ]
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'other'>;
    explanation: Schema.Attribute.Text;
    finding_citations: Schema.Attribute.Relation<
      'oneToMany',
      'api::finding-citation.finding-citation'
    >;
    finding_code: Schema.Attribute.String;
    finding_state: Schema.Attribute.Enumeration<
      [
        'needs_attention',
        'missing_information',
        'present_in_document',
        'not_applicable',
        'unable_to_assess',
      ]
    > &
      Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::analysis-finding.analysis-finding'
    > &
      Schema.Attribute.Private;
    needs_professional_review: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    public_id: Schema.Attribute.String &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 36;
        minLength: 36;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    recommended_actions: Schema.Attribute.Relation<
      'oneToMany',
      'api::recommended-action.recommended-action'
    >;
    severity: Schema.Attribute.Enumeration<
      ['info', 'low', 'medium', 'high', 'review_required']
    > &
      Schema.Attribute.DefaultTo<'info'>;
    source_quote_verified: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    title: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiAnalysisInputAnalysisInput
  extends Struct.CollectionTypeSchema {
  collectionName: 'lr_analysis_inputs';
  info: {
    description: 'A document within a job';
    displayName: 'Analysis Input';
    pluralName: 'analysis-inputs';
    singularName: 'analysis-input';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    analysis_job: Schema.Attribute.Relation<
      'manyToOne',
      'api::analysis-job.analysis-job'
    >;
    contains_pii: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    document_kind: Schema.Attribute.Enumeration<
      [
        'quotation',
        'contract',
        'boq',
        'milestone_schedule',
        'drawing',
        'receipt',
        'change_order',
        'other',
        'unknown',
      ]
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'unknown'>;
    extraction_state: Schema.Attribute.Enumeration<
      ['pending', 'complete', 'partial', 'failed']
    > &
      Schema.Attribute.DefaultTo<'pending'>;
    file_asset: Schema.Attribute.Relation<
      'manyToOne',
      'api::file-asset.file-asset'
    >;
    finding_citations: Schema.Attribute.Relation<
      'oneToMany',
      'api::finding-citation.finding-citation'
    >;
    language_hint: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::analysis-input.analysis-input'
    > &
      Schema.Attribute.Private;
    page_count: Schema.Attribute.Integer;
    public_id: Schema.Attribute.String &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 36;
        minLength: 36;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    redaction_state: Schema.Attribute.Enumeration<
      ['not_needed', 'pending', 'done', 'failed']
    > &
      Schema.Attribute.DefaultTo<'pending'>;
    sequence_no: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<1>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiAnalysisJobAnalysisJob extends Struct.CollectionTypeSchema {
  collectionName: 'lr_analysis_jobs';
  info: {
    description: 'One document check request';
    displayName: 'Analysis Job';
    pluralName: 'analysis-jobs';
    singularName: 'analysis-job';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    analysis_feedback: Schema.Attribute.Relation<
      'oneToMany',
      'api::analysis-feedback.analysis-feedback'
    >;
    analysis_inputs: Schema.Attribute.Relation<
      'oneToMany',
      'api::analysis-input.analysis-input'
    >;
    analysis_runs: Schema.Attribute.Relation<
      'oneToMany',
      'api::analysis-run.analysis-run'
    >;
    analysis_session: Schema.Attribute.Relation<
      'manyToOne',
      'api::analysis-session.analysis-session'
    >;
    attempt_count: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    error_code: Schema.Attribute.String;
    expires_at: Schema.Attribute.DateTime;
    finished_at: Schema.Attribute.DateTime;
    idempotency_key_hash: Schema.Attribute.String & Schema.Attribute.Private;
    job_type: Schema.Attribute.Enumeration<
      ['pre_contract_check', 'quotation_check', 'milestone_check', 'boq_check']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'quotation_check'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::analysis-job.analysis-job'
    > &
      Schema.Attribute.Private;
    priority: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    processing_state: Schema.Attribute.Enumeration<
      [
        'queued',
        'preprocessing',
        'extracting',
        'rule_check',
        'retrieving',
        'model_call',
        'validating',
        'completed',
        'failed',
        'cancelled',
        'expired',
      ]
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'queued'>;
    public_id: Schema.Attribute.String &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 36;
        minLength: 36;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    queued_at: Schema.Attribute.DateTime;
    requested_language: Schema.Attribute.Enumeration<['th', 'en']> &
      Schema.Attribute.DefaultTo<'th'>;
    started_at: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiAnalysisRunAnalysisRun extends Struct.CollectionTypeSchema {
  collectionName: 'lr_analysis_runs';
  info: {
    description: 'One attempt at a job \u2014 provenance of model, prompt, rules and knowledge snapshot';
    displayName: 'Analysis Run';
    pluralName: 'analysis-runs';
    singularName: 'analysis-run';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    analysis_findings: Schema.Attribute.Relation<
      'oneToMany',
      'api::analysis-finding.analysis-finding'
    >;
    analysis_job: Schema.Attribute.Relation<
      'manyToOne',
      'api::analysis-job.analysis-job'
    >;
    completed_at: Schema.Attribute.DateTime;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    document_read_status: Schema.Attribute.Enumeration<
      ['complete', 'partial', 'unreadable']
    > &
      Schema.Attribute.DefaultTo<'complete'>;
    estimated_cost_thb: Schema.Attribute.Decimal;
    evidence_plan_drafts: Schema.Attribute.Relation<
      'oneToMany',
      'api::evidence-plan-draft.evidence-plan-draft'
    >;
    input_fingerprint_sha256: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 64;
      }>;
    knowledge_snapshot_key: Schema.Attribute.String;
    latency_ms: Schema.Attribute.Integer;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::analysis-run.analysis-run'
    > &
      Schema.Attribute.Private;
    model_config_digest: Schema.Attribute.String;
    model_id: Schema.Attribute.String;
    model_provider_key: Schema.Attribute.String;
    output_language: Schema.Attribute.Enumeration<['th', 'en']> &
      Schema.Attribute.DefaultTo<'th'>;
    prompt_version_key: Schema.Attribute.String;
    public_id: Schema.Attribute.String &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 36;
        minLength: 36;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    result_json_private: Schema.Attribute.JSON & Schema.Attribute.Private;
    ruleset_version_key: Schema.Attribute.String;
    run_no: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<1>;
    run_state: Schema.Attribute.Enumeration<
      ['running', 'completed', 'failed', 'invalidated']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'running'>;
    schema_version: Schema.Attribute.String & Schema.Attribute.DefaultTo<'1.0'>;
    started_at: Schema.Attribute.DateTime;
    total_tokens: Schema.Attribute.Integer;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiAnalysisSessionAnalysisSession
  extends Struct.CollectionTypeSchema {
  collectionName: 'lr_analysis_sessions';
  info: {
    description: 'One check on /ai-check. Stores the email given before upload (private) so a later account with the same confirmed email can claim the results. TTL-bound.';
    displayName: 'Analysis Session';
    pluralName: 'analysis-sessions';
    singularName: 'analysis-session';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    analysis_jobs: Schema.Attribute.Relation<
      'oneToMany',
      'api::analysis-job.analysis-job'
    >;
    claimed_at: Schema.Attribute.DateTime;
    claimed_by: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
    consent_receipts: Schema.Attribute.Relation<
      'oneToMany',
      'api::consent-receipt.consent-receipt'
    >;
    contact_email: Schema.Attribute.Email & Schema.Attribute.Private;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deletion_requested_at: Schema.Attribute.DateTime;
    expires_at: Schema.Attribute.DateTime;
    file_count: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::analysis-session.analysis-session'
    > &
      Schema.Attribute.Private;
    mode: Schema.Attribute.Enumeration<
      ['sample', 'anonymous_upload', 'account', 'project']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'anonymous_upload'>;
    public_id: Schema.Attribute.String &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 36;
        minLength: 36;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    requested_language: Schema.Attribute.Enumeration<['th', 'en']> &
      Schema.Attribute.DefaultTo<'th'>;
    session_secret_digest: Schema.Attribute.String & Schema.Attribute.Private;
    session_state: Schema.Attribute.Enumeration<
      ['open', 'processing', 'completed', 'expired', 'deleted']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'open'>;
    source_page: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    usage_quota_bucket: Schema.Attribute.String & Schema.Attribute.Private;
  };
}

export interface ApiBlogPostBlogPost extends Struct.CollectionTypeSchema {
  collectionName: 'lr_blog_posts';
  info: {
    description: 'Articles \u2014 not automatic legal references';
    displayName: 'Blog Post';
    pluralName: 'blog-posts';
    singularName: 'blog-post';
  };
  options: {
    draftAndPublish: true;
  };
  pluginOptions: {
    i18n: {
      localized: true;
    };
  };
  attributes: {
    article_category: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false;
        };
      }>;
    author_display: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false;
        };
      }>;
    body: Schema.Attribute.RichText &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    cover: Schema.Attribute.Media<'images'> &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false;
        };
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    excerpt: Schema.Attribute.Text &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    locale: Schema.Attribute.String;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::blog-post.blog-post'
    >;
    published_date: Schema.Attribute.Date &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false;
        };
      }>;
    publishedAt: Schema.Attribute.DateTime;
    seo: Schema.Attribute.Component<'shared.seo', false> &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    slug: Schema.Attribute.UID<'title'> &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiConsentReceiptConsentReceipt
  extends Struct.CollectionTypeSchema {
  collectionName: 'lr_consent_receipts';
  info: {
    description: 'What was agreed, when, against which policy text';
    displayName: 'Consent Receipt';
    pluralName: 'consent-receipts';
    singularName: 'consent-receipt';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    analysis_session: Schema.Attribute.Relation<
      'manyToOne',
      'api::analysis-session.analysis-session'
    >;
    capture_method: Schema.Attribute.Enumeration<
      ['web_checkbox', 'otp', 'account', 'other']
    > &
      Schema.Attribute.DefaultTo<'web_checkbox'>;
    captured_at: Schema.Attribute.DateTime & Schema.Attribute.Required;
    choice: Schema.Attribute.Enumeration<
      ['accepted', 'declined', 'withdrawn', 'not_applicable']
    > &
      Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    ip_hash: Schema.Attribute.String & Schema.Attribute.Private;
    lead: Schema.Attribute.Relation<'manyToOne', 'api::lead.lead'>;
    legal_basis_record: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::consent-receipt.consent-receipt'
    > &
      Schema.Attribute.Private;
    policy_sha256: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 64;
      }>;
    policy_version: Schema.Attribute.Relation<
      'manyToOne',
      'api::policy-version.policy-version'
    >;
    public_id: Schema.Attribute.String &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 36;
        minLength: 36;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    purpose_code: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user_agent_digest: Schema.Attribute.String & Schema.Attribute.Private;
  };
}

export interface ApiDemoSampleCaseDemoSampleCase
  extends Struct.CollectionTypeSchema {
  collectionName: 'lr_demo_sample_cases';
  info: {
    description: 'Fictional sample used by /ai-check without any AI call. Must contain synthetic people and money only.';
    displayName: 'Demo Sample Case';
    pluralName: 'demo-sample-cases';
    singularName: 'demo-sample-case';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    i18n: {
      localized: true;
    };
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::demo-sample-case.demo-sample-case'
    >;
    precomputed_result_json: Schema.Attribute.JSON &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    public_id: Schema.Attribute.String &
      Schema.Attribute.Unique &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false;
        };
      }> &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 36;
        minLength: 36;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    sample_document_file: Schema.Attribute.Media<'images' | 'files'> &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false;
        };
      }>;
    sample_state: Schema.Attribute.Enumeration<['draft', 'active', 'retired']> &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false;
        };
      }> &
      Schema.Attribute.DefaultTo<'draft'>;
    sample_version: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false;
        };
      }> &
      Schema.Attribute.DefaultTo<'1'>;
    slug: Schema.Attribute.UID<'title'> &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false;
        };
      }>;
    summary: Schema.Attribute.Text &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    work_type: Schema.Attribute.Enumeration<
      ['builtin', 'renovation', 'other']
    > &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false;
        };
      }> &
      Schema.Attribute.DefaultTo<'renovation'>;
  };
}

export interface ApiEvaluationCaseEvaluationCase
  extends Struct.CollectionTypeSchema {
  collectionName: 'lr_evaluation_cases';
  info: {
    description: 'Synthetic/anonymised test documents with expected results';
    displayName: 'Evaluation Case';
    pluralName: 'evaluation-cases';
    singularName: 'evaluation-case';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    case_code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    case_kind: Schema.Attribute.Enumeration<
      ['clean', 'missing', 'ambiguous', 'adversarial', 'privacy']
    > &
      Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    expected_fields: Schema.Attribute.JSON;
    expected_findings: Schema.Attribute.JSON;
    expert_approved_at: Schema.Attribute.DateTime;
    fixture_contains_real_data: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    input_fixture_key_private: Schema.Attribute.String &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::evaluation-case.evaluation-case'
    > &
      Schema.Attribute.Private;
    public_id: Schema.Attribute.String &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 36;
        minLength: 36;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiEvaluationRunEvaluationRun
  extends Struct.CollectionTypeSchema {
  collectionName: 'lr_evaluation_runs';
  info: {
    description: 'Aggregate evaluation of a model/prompt/rules/KB combination';
    displayName: 'Evaluation Run';
    pluralName: 'evaluation-runs';
    singularName: 'evaluation-run';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    completed_at: Schema.Attribute.DateTime;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    kb_snapshot_key: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::evaluation-run.evaluation-run'
    > &
      Schema.Attribute.Private;
    metrics_json: Schema.Attribute.JSON;
    model_id: Schema.Attribute.String;
    prompt_version_key: Schema.Attribute.String;
    public_id: Schema.Attribute.String &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 36;
        minLength: 36;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    release_decision: Schema.Attribute.Enumeration<
      ['pending', 'pass', 'fail']
    > &
      Schema.Attribute.DefaultTo<'pending'>;
    ruleset_version_key: Schema.Attribute.String;
    run_label: Schema.Attribute.String & Schema.Attribute.Required;
    started_at: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiEvidencePlanDraftEvidencePlanDraft
  extends Struct.CollectionTypeSchema {
  collectionName: 'lr_evidence_plan_drafts';
  info: {
    description: 'AI-suggested list of evidence to prepare \u2014 needs party review before it binds anything';
    displayName: 'Evidence Plan Draft';
    pluralName: 'evidence-plan-drafts';
    singularName: 'evidence-plan-draft';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    analysis_run: Schema.Attribute.Relation<
      'manyToOne',
      'api::analysis-run.analysis-run'
    >;
    created_at_business: Schema.Attribute.DateTime;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    evidence_plan_items: Schema.Attribute.Relation<
      'oneToMany',
      'api::evidence-plan-item.evidence-plan-item'
    >;
    generated_from_run_public_id: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 36;
      }>;
    generation_state: Schema.Attribute.Enumeration<
      ['proposed', 'reviewed', 'converted', 'discarded']
    > &
      Schema.Attribute.DefaultTo<'proposed'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::evidence-plan-draft.evidence-plan-draft'
    > &
      Schema.Attribute.Private;
    plan_json_digest: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 64;
      }>;
    plan_title: Schema.Attribute.String & Schema.Attribute.Required;
    public_id: Schema.Attribute.String &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 36;
        minLength: 36;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    total_expected_milestones: Schema.Attribute.Integer;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    work_type: Schema.Attribute.String;
  };
}

export interface ApiEvidencePlanItemEvidencePlanItem
  extends Struct.CollectionTypeSchema {
  collectionName: 'lr_evidence_plan_items';
  info: {
    description: 'One evidence requirement in a draft plan';
    displayName: 'Evidence Plan Item';
    pluralName: 'evidence-plan-items';
    singularName: 'evidence-plan-item';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    evidence_kind: Schema.Attribute.Enumeration<
      [
        'photo',
        'video',
        'receipt',
        'design_approval',
        'boq',
        'inspection',
        'other',
      ]
    > &
      Schema.Attribute.DefaultTo<'other'>;
    evidence_plan_draft: Schema.Attribute.Relation<
      'manyToOne',
      'api::evidence-plan-draft.evidence-plan-draft'
    >;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::evidence-plan-item.evidence-plan-item'
    > &
      Schema.Attribute.Private;
    origin_finding_code: Schema.Attribute.String;
    phase_or_milestone_hint: Schema.Attribute.String;
    public_id: Schema.Attribute.String &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 36;
        minLength: 36;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    required_before_payment: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    requirement_label: Schema.Attribute.String & Schema.Attribute.Required;
    review_state: Schema.Attribute.Enumeration<
      ['ai_suggested', 'user_selected', 'mutually_agreed', 'discarded']
    > &
      Schema.Attribute.DefaultTo<'ai_suggested'>;
    sequence_no: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<1>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    why_needed: Schema.Attribute.Text;
  };
}

export interface ApiFaqItemFaqItem extends Struct.CollectionTypeSchema {
  collectionName: 'lr_faq_items';
  info: {
    description: 'Public FAQ (shown on the website)';
    displayName: 'FAQ Item';
    pluralName: 'faq-items';
    singularName: 'faq-item';
  };
  options: {
    draftAndPublish: true;
  };
  pluginOptions: {
    i18n: {
      localized: true;
    };
  };
  attributes: {
    answer: Schema.Attribute.RichText &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    category: Schema.Attribute.Enumeration<
      ['ai', 'agreement', 'evidence', 'payment', 'privacy', 'other']
    > &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false;
        };
      }> &
      Schema.Attribute.DefaultTo<'other'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    is_featured: Schema.Attribute.Boolean &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false;
        };
      }> &
      Schema.Attribute.DefaultTo<false>;
    locale: Schema.Attribute.String;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::faq-item.faq-item'
    >;
    publishedAt: Schema.Attribute.DateTime;
    question: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    sort_order: Schema.Attribute.Integer &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false;
        };
      }> &
      Schema.Attribute.DefaultTo<0>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiFileAssetFileAsset extends Struct.CollectionTypeSchema {
  collectionName: 'lr_file_assets';
  info: {
    description: 'Metadata of a privately stored file (the file itself lives in private object storage, never here)';
    displayName: 'File Asset';
    pluralName: 'file-assets';
    singularName: 'file-asset';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    analysis_inputs: Schema.Attribute.Relation<
      'oneToMany',
      'api::analysis-input.analysis-input'
    >;
    byte_size: Schema.Attribute.BigInteger;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deleted_at: Schema.Attribute.DateTime;
    encryption_key_ref: Schema.Attribute.String & Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::file-asset.file-asset'
    > &
      Schema.Attribute.Private;
    metadata_safe: Schema.Attribute.JSON;
    mime_detected: Schema.Attribute.String;
    object_key_private: Schema.Attribute.String & Schema.Attribute.Private;
    object_version_id: Schema.Attribute.String & Schema.Attribute.Private;
    original_name_encrypted: Schema.Attribute.String & Schema.Attribute.Private;
    public_id: Schema.Attribute.String &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 36;
        minLength: 36;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    purpose: Schema.Attribute.Enumeration<
      [
        'demo_input',
        'project_document',
        'evidence',
        'identity',
        'inspection',
        'export',
        'other',
      ]
    > &
      Schema.Attribute.Required;
    retention_until: Schema.Attribute.DateTime;
    sha256: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 64;
      }>;
    storage_bucket_alias: Schema.Attribute.String & Schema.Attribute.Private;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    upload_state: Schema.Attribute.Enumeration<
      ['pending', 'scanned', 'accepted', 'quarantined', 'removed']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'pending'>;
    uploaded_at: Schema.Attribute.DateTime;
  };
}

export interface ApiFindingCitationFindingCitation
  extends Struct.CollectionTypeSchema {
  collectionName: 'lr_finding_citations';
  info: {
    description: 'Where a finding is grounded: the user document, a knowledge source, or a rule';
    displayName: 'Finding Citation';
    pluralName: 'finding-citations';
    singularName: 'finding-citation';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    analysis_finding: Schema.Attribute.Relation<
      'manyToOne',
      'api::analysis-finding.analysis-finding'
    >;
    analysis_input: Schema.Attribute.Relation<
      'manyToOne',
      'api::analysis-input.analysis-input'
    >;
    citation_kind: Schema.Attribute.Enumeration<
      ['user_document', 'knowledge_source', 'rule']
    > &
      Schema.Attribute.Required;
    citation_order: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    citation_state: Schema.Attribute.Enumeration<
      ['verified', 'partially_verified', 'unverified']
    > &
      Schema.Attribute.DefaultTo<'unverified'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    input_page: Schema.Attribute.Integer;
    kb_chunk_public_id: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 36;
      }>;
    kb_source_version: Schema.Attribute.Relation<
      'manyToOne',
      'api::kb-source-version.kb-source-version'
    >;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::finding-citation.finding-citation'
    > &
      Schema.Attribute.Private;
    public_id: Schema.Attribute.String &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 36;
        minLength: 36;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    quote_excerpt: Schema.Attribute.Text & Schema.Attribute.Private;
    source_section: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiKbSnapshotKbSnapshot extends Struct.CollectionTypeSchema {
  collectionName: 'lr_kb_snapshots';
  info: {
    description: 'Pinned set of approved source versions, so reports are reproducible';
    displayName: 'KB Snapshot';
    pluralName: 'kb-snapshots';
    singularName: 'kb-snapshot';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    approved_at: Schema.Attribute.DateTime;
    compiled_at: Schema.Attribute.DateTime;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::kb-snapshot.kb-snapshot'
    > &
      Schema.Attribute.Private;
    notes: Schema.Attribute.Text;
    public_id: Schema.Attribute.String &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 36;
        minLength: 36;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    snapshot_key: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    snapshot_sha256: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 64;
      }>;
    snapshot_state: Schema.Attribute.Enumeration<
      ['building', 'ready', 'active', 'retired']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'building'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiKbSourceVersionKbSourceVersion
  extends Struct.CollectionTypeSchema {
  collectionName: 'lr_kb_source_versions';
  info: {
    description: 'A specific version of a source; effective dates are read from the original, not the crawl date';
    displayName: 'KB Source Version';
    pluralName: 'kb-source-versions';
    singularName: 'kb-source-version';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    applicability_scope: Schema.Attribute.JSON;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    effective_at: Schema.Attribute.Date;
    expires_at: Schema.Attribute.Date;
    fetched_at: Schema.Attribute.DateTime;
    file_sha256: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 64;
      }>;
    finding_citations: Schema.Attribute.Relation<
      'oneToMany',
      'api::finding-citation.finding-citation'
    >;
    kb_source: Schema.Attribute.Relation<
      'manyToOne',
      'api::kb-source.kb-source'
    >;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::kb-source-version.kb-source-version'
    > &
      Schema.Attribute.Private;
    public_id: Schema.Attribute.String &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 36;
        minLength: 36;
      }>;
    published_at_source: Schema.Attribute.Date;
    publishedAt: Schema.Attribute.DateTime;
    review_state: Schema.Attribute.Enumeration<
      [
        'unreviewed',
        'expert_review',
        'published',
        'superseded',
        'rejected',
        'uncertain',
      ]
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'unreviewed'>;
    reviewed_at: Schema.Attribute.DateTime;
    reviewer_name_snapshot: Schema.Attribute.String;
    source_document_key_private: Schema.Attribute.String &
      Schema.Attribute.Private;
    supersedes_version_key: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    version_label: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface ApiKbSourceKbSource extends Struct.CollectionTypeSchema {
  collectionName: 'lr_kb_sources';
  info: {
    description: 'Curated knowledge source. Existence \u2260 approved applicability.';
    displayName: 'KB Source';
    pluralName: 'kb-sources';
    singularName: 'kb-source';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    jurisdiction: Schema.Attribute.String & Schema.Attribute.DefaultTo<'TH'>;
    kb_source_versions: Schema.Attribute.Relation<
      'oneToMany',
      'api::kb-source-version.kb-source-version'
    >;
    last_checked_at: Schema.Attribute.DateTime;
    license_note: Schema.Attribute.Text;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::kb-source.kb-source'
    > &
      Schema.Attribute.Private;
    public_id: Schema.Attribute.String &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 36;
        minLength: 36;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    publisher: Schema.Attribute.String;
    source_key: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    source_kind: Schema.Attribute.Enumeration<
      [
        'law',
        'regulation',
        'guideline',
        'checklist',
        'template',
        'technical_reference',
        'case_study',
      ]
    > &
      Schema.Attribute.Required;
    source_state: Schema.Attribute.Enumeration<
      ['discovered', 'pending_review', 'approved', 'deprecated', 'revoked']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'discovered'>;
    source_url: Schema.Attribute.String;
    title: Schema.Attribute.String & Schema.Attribute.Required;
    topic_tags: Schema.Attribute.JSON;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiLeadLead extends Struct.CollectionTypeSchema {
  collectionName: 'lr_leads';
  info: {
    description: 'Contact / pilot / project requests. Contact data is private; a lead is NOT consent to use documents for AI training.';
    displayName: 'Lead';
    pluralName: 'leads';
    singularName: 'lead';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    consent_receipts: Schema.Attribute.Relation<
      'oneToMany',
      'api::consent-receipt.consent-receipt'
    >;
    contact_email: Schema.Attribute.Email & Schema.Attribute.Private;
    contact_permission: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    created_from: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    interest_note: Schema.Attribute.Text;
    lead_source: Schema.Attribute.String;
    lead_type: Schema.Attribute.Enumeration<
      ['homeowner', 'contractor', 'interior', 'inspector', 'other']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'other'>;
    lifecycle_state: Schema.Attribute.Enumeration<
      ['new', 'contacted', 'qualified', 'closed']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'new'>;
    line_handle: Schema.Attribute.String & Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::lead.lead'> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String;
    phone_encrypted: Schema.Attribute.String & Schema.Attribute.Private;
    pilot_applications: Schema.Attribute.Relation<
      'oneToMany',
      'api::pilot-application.pilot-application'
    >;
    preferred_language: Schema.Attribute.Enumeration<['th', 'en']> &
      Schema.Attribute.DefaultTo<'th'>;
    public_id: Schema.Attribute.String &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 36;
        minLength: 36;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    related_analysis_public_id: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiModelCatalogModelCatalog
  extends Struct.CollectionTypeSchema {
  collectionName: 'lr_model_catalog_items';
  info: {
    description: 'Model names/metadata only \u2014 endpoints and keys stay in ENV';
    displayName: 'Model Catalog';
    pluralName: 'model-catalog-items';
    singularName: 'model-catalog';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    context_limit: Schema.Attribute.Integer;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    embedding_dimensions: Schema.Attribute.Integer;
    is_active: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::model-catalog.model-catalog'
    > &
      Schema.Attribute.Private;
    model_id: Schema.Attribute.String & Schema.Attribute.Required;
    model_notes: Schema.Attribute.Text;
    provider_key: Schema.Attribute.String & Schema.Attribute.Required;
    public_id: Schema.Attribute.String &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 36;
        minLength: 36;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    purpose: Schema.Attribute.Enumeration<
      ['generation', 'embedding', 'reranking', 'ocr']
    > &
      Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiPilotApplicationPilotApplication
  extends Struct.CollectionTypeSchema {
  collectionName: 'lr_pilot_applications';
  info: {
    description: 'Design-partner / pilot applications';
    displayName: 'Pilot Application';
    pluralName: 'pilot-applications';
    singularName: 'pilot-application';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    application_state: Schema.Attribute.Enumeration<
      ['new', 'screening', 'accepted', 'rejected']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'new'>;
    business_name: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    expected_project_count: Schema.Attribute.Integer;
    expected_start_date: Schema.Attribute.Date;
    goal: Schema.Attribute.Text;
    lead: Schema.Attribute.Relation<'manyToOne', 'api::lead.lead'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::pilot-application.pilot-application'
    > &
      Schema.Attribute.Private;
    public_id: Schema.Attribute.String &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 36;
        minLength: 36;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    source: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    work_type: Schema.Attribute.Enumeration<
      ['builtin', 'renovation', 'construction', 'other']
    > &
      Schema.Attribute.DefaultTo<'other'>;
  };
}

export interface ApiPlanCatalogPlanCatalog extends Struct.CollectionTypeSchema {
  collectionName: 'lr_plan_catalog_items';
  info: {
    description: 'Plans shown on the pricing section. Prices are Early Access hypotheses (real price history = plan_prices, W2).';
    displayName: 'Plan Catalog';
    pluralName: 'plan-catalog-items';
    singularName: 'plan-catalog';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    i18n: {
      localized: true;
    };
  };
  attributes: {
    billing_model: Schema.Attribute.Enumeration<
      ['per_project', 'subscription', 'add_on', 'free']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false;
        };
      }> &
      Schema.Attribute.DefaultTo<'per_project'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.Text &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    display_name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    display_price_amount: Schema.Attribute.Decimal &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false;
        };
      }>;
    display_price_unit: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    feature_summary: Schema.Attribute.JSON &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    is_featured: Schema.Attribute.Boolean &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false;
        };
      }> &
      Schema.Attribute.DefaultTo<false>;
    locale: Schema.Attribute.String;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::plan-catalog.plan-catalog'
    >;
    plan_code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false;
        };
      }>;
    public_id: Schema.Attribute.String &
      Schema.Attribute.Unique &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false;
        };
      }> &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 36;
        minLength: 36;
      }>;
    public_state: Schema.Attribute.Enumeration<['draft', 'active', 'retired']> &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false;
        };
      }> &
      Schema.Attribute.DefaultTo<'draft'>;
    publishedAt: Schema.Attribute.DateTime;
    sort_order: Schema.Attribute.Integer &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false;
        };
      }> &
      Schema.Attribute.DefaultTo<0>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiPolicyVersionPolicyVersion
  extends Struct.CollectionTypeSchema {
  collectionName: 'lr_policy_versions';
  info: {
    description: 'Exact text of privacy/terms/processing notices users accepted. Immutable after effective \u2014 supersede with a new version.';
    displayName: 'Policy Version';
    pluralName: 'policy-versions';
    singularName: 'policy-version';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    consent_receipts: Schema.Attribute.Relation<
      'oneToMany',
      'api::consent-receipt.consent-receipt'
    >;
    content: Schema.Attribute.RichText & Schema.Attribute.Required;
    content_sha256: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 64;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    effective_at: Schema.Attribute.DateTime;
    language: Schema.Attribute.Enumeration<['th', 'en']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'th'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::policy-version.policy-version'
    > &
      Schema.Attribute.Private;
    policy_kind: Schema.Attribute.Enumeration<
      ['privacy', 'terms', 'document_processing', 'project_terms', 'retention']
    > &
      Schema.Attribute.Required;
    policy_state: Schema.Attribute.Enumeration<['draft', 'active', 'retired']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'draft'>;
    public_id: Schema.Attribute.String &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 36;
        minLength: 36;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    retired_at: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    version_label: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface ApiPromptTemplateVersionPromptTemplateVersion
  extends Struct.CollectionTypeSchema {
  collectionName: 'lr_prompt_template_versions';
  info: {
    description: 'Approved prompt templates (no credentials)';
    displayName: 'Prompt Template Version';
    pluralName: 'prompt-template-versions';
    singularName: 'prompt-template-version';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    approved_at: Schema.Attribute.DateTime;
    approved_by: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::prompt-template-version.prompt-template-version'
    > &
      Schema.Attribute.Private;
    output_schema_version: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'1.0'>;
    prompt_key: Schema.Attribute.String & Schema.Attribute.Required;
    public_id: Schema.Attribute.String &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 36;
        minLength: 36;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    template_body_private: Schema.Attribute.Text & Schema.Attribute.Private;
    template_sha256: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 64;
      }>;
    template_state: Schema.Attribute.Enumeration<
      ['draft', 'approved', 'retired']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'draft'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    version_label: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface ApiRecommendedActionRecommendedAction
  extends Struct.CollectionTypeSchema {
  collectionName: 'lr_recommended_actions';
  info: {
    description: 'Question to ask / document to request \u2014 a suggestion until someone approves it';
    displayName: 'Recommended Action';
    pluralName: 'recommended-actions';
    singularName: 'recommended-action';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    action_kind: Schema.Attribute.Enumeration<
      [
        'question_to_ask',
        'request_document',
        'clarify_clause',
        'prepare_evidence',
        'expert_review',
      ]
    > &
      Schema.Attribute.Required;
    action_state: Schema.Attribute.Enumeration<
      ['suggested', 'accepted_by_user', 'dismissed', 'converted_to_project']
    > &
      Schema.Attribute.DefaultTo<'suggested'>;
    analysis_finding: Schema.Attribute.Relation<
      'manyToOne',
      'api::analysis-finding.analysis-finding'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.Text;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::recommended-action.recommended-action'
    > &
      Schema.Attribute.Private;
    priority: Schema.Attribute.Enumeration<['low', 'normal', 'high']> &
      Schema.Attribute.DefaultTo<'normal'>;
    public_id: Schema.Attribute.String &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 36;
        minLength: 36;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    related_milestone_no: Schema.Attribute.Integer;
    title: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiRetentionPolicyRetentionPolicy
  extends Struct.CollectionTypeSchema {
  collectionName: 'lr_retention_policies';
  info: {
    description: 'How long each data category is kept. Never indefinite without a reason.';
    displayName: 'Retention Policy';
    pluralName: 'retention-policies';
    singularName: 'retention-policy';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    data_category: Schema.Attribute.Enumeration<
      ['demo', 'analysis', 'project_evidence', 'account', 'analytics', 'audit']
    > &
      Schema.Attribute.Required;
    legal_basis_note: Schema.Attribute.Text;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::retention-policy.retention-policy'
    > &
      Schema.Attribute.Private;
    policy_key: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    policy_state: Schema.Attribute.Enumeration<['draft', 'active', 'retired']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'draft'>;
    publishedAt: Schema.Attribute.DateTime;
    reviewed_at: Schema.Attribute.DateTime;
    trigger_event: Schema.Attribute.Enumeration<
      ['created', 'completed', 'last_activity', 'policy_defined']
    > &
      Schema.Attribute.DefaultTo<'created'>;
    ttl_days: Schema.Attribute.Integer;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiRiskRuleVersionRiskRuleVersion
  extends Struct.CollectionTypeSchema {
  collectionName: 'lr_risk_rule_versions';
  info: {
    description: 'Versioned rule configuration (declarative only)';
    displayName: 'Risk Rule Version';
    pluralName: 'risk-rule-versions';
    singularName: 'risk-rule-version';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    approval_state: Schema.Attribute.Enumeration<
      ['draft', 'approved', 'retired']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'draft'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    effective_at: Schema.Attribute.DateTime;
    knowledge_source_keys: Schema.Attribute.JSON;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::risk-rule-version.risk-rule-version'
    > &
      Schema.Attribute.Private;
    logic_config: Schema.Attribute.JSON;
    logic_kind: Schema.Attribute.Enumeration<['code', 'config', 'json_logic']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'code'>;
    message_template_th: Schema.Attribute.Text;
    public_id: Schema.Attribute.String &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 36;
        minLength: 36;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    retired_at: Schema.Attribute.DateTime;
    reviewer_snapshot: Schema.Attribute.String;
    risk_rule: Schema.Attribute.Relation<
      'manyToOne',
      'api::risk-rule.risk-rule'
    >;
    severity_default: Schema.Attribute.Enumeration<
      ['info', 'low', 'medium', 'high', 'review_required']
    > &
      Schema.Attribute.DefaultTo<'info'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    version_label: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface ApiRiskRuleRiskRule extends Struct.CollectionTypeSchema {
  collectionName: 'lr_risk_rules';
  info: {
    description: 'Stable rule identity (logic lives in versions / repo code \u2014 never eval CMS code)';
    displayName: 'Risk Rule';
    pluralName: 'risk-rules';
    singularName: 'risk-rule';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description_th: Schema.Attribute.Text;
    dimension: Schema.Attribute.Enumeration<
      [
        'parties',
        'scope',
        'materials',
        'money',
        'deposit',
        'milestones',
        'dates',
        'acceptance',
        'change_control',
        'warranty',
        'cancellation',
        'evidence',
        'signature',
        'other',
      ]
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'other'>;
    document_kinds: Schema.Attribute.JSON;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::risk-rule.risk-rule'
    > &
      Schema.Attribute.Private;
    public_id: Schema.Attribute.String &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 36;
        minLength: 36;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    risk_rule_versions: Schema.Attribute.Relation<
      'oneToMany',
      'api::risk-rule-version.risk-rule-version'
    >;
    rule_code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    rule_state: Schema.Attribute.Enumeration<['active', 'retired', 'draft']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'draft'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    work_types: Schema.Attribute.JSON;
  };
}

export interface ApiSiteSettingSiteSetting extends Struct.SingleTypeSchema {
  collectionName: 'lr_site_setting';
  info: {
    description: 'Brand, contact channels and SEO defaults for the website';
    displayName: 'Site Settings';
    pluralName: 'site-settings';
    singularName: 'site-setting';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    i18n: {
      localized: true;
    };
  };
  attributes: {
    brand_name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false;
        };
      }> &
      Schema.Attribute.DefaultTo<'LongRak'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    default_locale: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false;
        };
      }> &
      Schema.Attribute.DefaultTo<'th'>;
    favicon: Schema.Attribute.Media<'images'> &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false;
        };
      }>;
    line_oa_url: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false;
        };
      }>;
    locale: Schema.Attribute.String;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::site-setting.site-setting'
    >;
    logo: Schema.Attribute.Media<'images'> &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false;
        };
      }>;
    maintenance_mode: Schema.Attribute.Boolean &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false;
        };
      }> &
      Schema.Attribute.DefaultTo<false>;
    publishedAt: Schema.Attribute.DateTime;
    seo_defaults: Schema.Attribute.Component<'shared.seo', false> &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    support_email: Schema.Attribute.Email &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false;
        };
      }>;
    tagline: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    thai_name: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false;
        };
      }> &
      Schema.Attribute.DefaultTo<'\u0E2B\u0E25\u0E07\u0E23\u0E31\u0E01'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiWebPageWebPage extends Struct.CollectionTypeSchema {
  collectionName: 'lr_web_pages';
  info: {
    description: 'CMS pages (blocks + SEO)';
    displayName: 'Web Page';
    pluralName: 'web-pages';
    singularName: 'web-page';
  };
  options: {
    draftAndPublish: true;
  };
  pluginOptions: {
    i18n: {
      localized: true;
    };
  };
  attributes: {
    blocks: Schema.Attribute.DynamicZone<
      [
        'website.hero',
        'website.feature-card',
        'website.step',
        'website.testimonial',
        'website.comparison-row',
        'website.cta-section',
      ]
    > &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::web-page.web-page'
    >;
    page_kind: Schema.Attribute.Enumeration<
      ['home', 'about', 'ai_check', 'pricing', 'trust', 'faq', 'other']
    > &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false;
        };
      }> &
      Schema.Attribute.DefaultTo<'other'>;
    publishedAt: Schema.Attribute.DateTime;
    seo: Schema.Attribute.Component<'shared.seo', false> &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    show_nav: Schema.Attribute.Boolean &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false;
        };
      }> &
      Schema.Attribute.DefaultTo<false>;
    slug: Schema.Attribute.UID<'title'> &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    sort_order: Schema.Attribute.Integer &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false;
        };
      }> &
      Schema.Attribute.DefaultTo<0>;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginContentReleasesRelease
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_releases';
  info: {
    displayName: 'Release';
    pluralName: 'releases';
    singularName: 'release';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    actions: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::content-releases.release-action'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    failureReason: Schema.Attribute.Enumeration<
      ['missed_schedule', 'failed_before_upgrade']
    >;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::content-releases.release'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    releaseCondition: Schema.Attribute.Enumeration<
      ['all_or_nothing', 'allow_partial']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'all_or_nothing'>;
    releasedAt: Schema.Attribute.DateTime;
    scheduledAt: Schema.Attribute.DateTime;
    status: Schema.Attribute.Enumeration<
      ['ready', 'blocked', 'failed', 'done', 'partial', 'empty']
    > &
      Schema.Attribute.Required;
    timezone: Schema.Attribute.String;
    totalPublishedEntries: Schema.Attribute.Integer;
    totalSkippedEntries: Schema.Attribute.Integer;
    totalUnpublishedEntries: Schema.Attribute.Integer;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginContentReleasesReleaseAction
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_release_actions';
  info: {
    displayName: 'Release Action';
    pluralName: 'release-actions';
    singularName: 'release-action';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    contentType: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    entryDocumentId: Schema.Attribute.String;
    isEntryValid: Schema.Attribute.Boolean;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::content-releases.release-action'
    > &
      Schema.Attribute.Private;
    outcome: Schema.Attribute.Enumeration<
      [
        'published',
        'unpublished',
        'skipped_invalid',
        'skipped_not_approved',
        'skipped_error',
        'skipped_held',
        'skipped_missed',
      ]
    >;
    publishedAt: Schema.Attribute.DateTime;
    reason: Schema.Attribute.JSON;
    release: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::content-releases.release'
    >;
    type: Schema.Attribute.Enumeration<['publish', 'unpublish']> &
      Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginI18NLocale extends Struct.CollectionTypeSchema {
  collectionName: 'i18n_locale';
  info: {
    collectionName: 'locales';
    description: '';
    displayName: 'Locale';
    pluralName: 'locales';
    singularName: 'locale';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    code: Schema.Attribute.String & Schema.Attribute.Unique;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::i18n.locale'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.SetMinMax<
        {
          max: 50;
          min: 1;
        },
        number
      >;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginReviewWorkflowsWorkflow
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_workflows';
  info: {
    description: '';
    displayName: 'Workflow';
    name: 'Workflow';
    pluralName: 'workflows';
    singularName: 'workflow';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    contentTypes: Schema.Attribute.JSON &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'[]'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::review-workflows.workflow'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    publishedAt: Schema.Attribute.DateTime;
    stageRequiredToPublish: Schema.Attribute.Relation<
      'oneToOne',
      'plugin::review-workflows.workflow-stage'
    >;
    stages: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::review-workflows.workflow-stage'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginReviewWorkflowsWorkflowStage
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_workflows_stages';
  info: {
    description: '';
    displayName: 'Stages';
    name: 'Workflow Stage';
    pluralName: 'workflow-stages';
    singularName: 'workflow-stage';
  };
  options: {
    draftAndPublish: false;
    version: '1.1.0';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    color: Schema.Attribute.String & Schema.Attribute.DefaultTo<'#4945FF'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::review-workflows.workflow-stage'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String;
    permissions: Schema.Attribute.Relation<'manyToMany', 'admin::permission'>;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    workflow: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::review-workflows.workflow'
    >;
  };
}

export interface PluginUploadFile extends Struct.CollectionTypeSchema {
  collectionName: 'files';
  info: {
    description: '';
    displayName: 'File';
    pluralName: 'files';
    singularName: 'file';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    alternativeText: Schema.Attribute.Text;
    caption: Schema.Attribute.Text;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    ext: Schema.Attribute.String;
    focalPoint: Schema.Attribute.JSON;
    folder: Schema.Attribute.Relation<'manyToOne', 'plugin::upload.folder'> &
      Schema.Attribute.Private;
    folderPath: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    formats: Schema.Attribute.JSON;
    hash: Schema.Attribute.String & Schema.Attribute.Required;
    height: Schema.Attribute.Integer;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::upload.file'
    > &
      Schema.Attribute.Private;
    mime: Schema.Attribute.String & Schema.Attribute.Required;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    previewUrl: Schema.Attribute.Text;
    provider: Schema.Attribute.String & Schema.Attribute.Required;
    provider_metadata: Schema.Attribute.JSON;
    publishedAt: Schema.Attribute.DateTime;
    related: Schema.Attribute.Relation<'morphToMany'>;
    size: Schema.Attribute.Decimal & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    url: Schema.Attribute.Text & Schema.Attribute.Required;
    width: Schema.Attribute.Integer;
  };
}

export interface PluginUploadFolder extends Struct.CollectionTypeSchema {
  collectionName: 'upload_folders';
  info: {
    displayName: 'Folder';
    pluralName: 'folders';
    singularName: 'folder';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    children: Schema.Attribute.Relation<'oneToMany', 'plugin::upload.folder'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    files: Schema.Attribute.Relation<'oneToMany', 'plugin::upload.file'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::upload.folder'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    parent: Schema.Attribute.Relation<'manyToOne', 'plugin::upload.folder'>;
    path: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    pathId: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginUsersPermissionsPermission
  extends Struct.CollectionTypeSchema {
  collectionName: 'up_permissions';
  info: {
    description: '';
    displayName: 'Permission';
    name: 'permission';
    pluralName: 'permissions';
    singularName: 'permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.permission'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    role: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.role'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginUsersPermissionsRole
  extends Struct.CollectionTypeSchema {
  collectionName: 'up_roles';
  info: {
    description: '';
    displayName: 'Role';
    name: 'role';
    pluralName: 'roles';
    singularName: 'role';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.role'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 3;
      }>;
    permissions: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.permission'
    >;
    publishedAt: Schema.Attribute.DateTime;
    type: Schema.Attribute.String & Schema.Attribute.Unique;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    users: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.user'
    >;
  };
}

export interface PluginUsersPermissionsUser
  extends Struct.CollectionTypeSchema {
  collectionName: 'up_users';
  info: {
    description: '';
    displayName: 'User';
    name: 'user';
    pluralName: 'users';
    singularName: 'user';
  };
  options: {
    draftAndPublish: false;
    timestamps: true;
  };
  attributes: {
    blocked: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    confirmationToken: Schema.Attribute.String & Schema.Attribute.Private;
    confirmed: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    email: Schema.Attribute.Email &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.user'
    > &
      Schema.Attribute.Private;
    password: Schema.Attribute.Password &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    provider: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    resetPasswordToken: Schema.Attribute.String & Schema.Attribute.Private;
    role: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.role'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    username: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 3;
      }>;
  };
}

declare module '@strapi/strapi' {
  export namespace Public {
    export interface ContentTypeSchemas {
      'admin::api-token': AdminApiToken;
      'admin::api-token-permission': AdminApiTokenPermission;
      'admin::audit-log': AdminAuditLog;
      'admin::permission': AdminPermission;
      'admin::role': AdminRole;
      'admin::session': AdminSession;
      'admin::transfer-token': AdminTransferToken;
      'admin::transfer-token-permission': AdminTransferTokenPermission;
      'admin::user': AdminUser;
      'api::analysis-feedback.analysis-feedback': ApiAnalysisFeedbackAnalysisFeedback;
      'api::analysis-finding.analysis-finding': ApiAnalysisFindingAnalysisFinding;
      'api::analysis-input.analysis-input': ApiAnalysisInputAnalysisInput;
      'api::analysis-job.analysis-job': ApiAnalysisJobAnalysisJob;
      'api::analysis-run.analysis-run': ApiAnalysisRunAnalysisRun;
      'api::analysis-session.analysis-session': ApiAnalysisSessionAnalysisSession;
      'api::blog-post.blog-post': ApiBlogPostBlogPost;
      'api::consent-receipt.consent-receipt': ApiConsentReceiptConsentReceipt;
      'api::demo-sample-case.demo-sample-case': ApiDemoSampleCaseDemoSampleCase;
      'api::evaluation-case.evaluation-case': ApiEvaluationCaseEvaluationCase;
      'api::evaluation-run.evaluation-run': ApiEvaluationRunEvaluationRun;
      'api::evidence-plan-draft.evidence-plan-draft': ApiEvidencePlanDraftEvidencePlanDraft;
      'api::evidence-plan-item.evidence-plan-item': ApiEvidencePlanItemEvidencePlanItem;
      'api::faq-item.faq-item': ApiFaqItemFaqItem;
      'api::file-asset.file-asset': ApiFileAssetFileAsset;
      'api::finding-citation.finding-citation': ApiFindingCitationFindingCitation;
      'api::kb-snapshot.kb-snapshot': ApiKbSnapshotKbSnapshot;
      'api::kb-source-version.kb-source-version': ApiKbSourceVersionKbSourceVersion;
      'api::kb-source.kb-source': ApiKbSourceKbSource;
      'api::lead.lead': ApiLeadLead;
      'api::model-catalog.model-catalog': ApiModelCatalogModelCatalog;
      'api::pilot-application.pilot-application': ApiPilotApplicationPilotApplication;
      'api::plan-catalog.plan-catalog': ApiPlanCatalogPlanCatalog;
      'api::policy-version.policy-version': ApiPolicyVersionPolicyVersion;
      'api::prompt-template-version.prompt-template-version': ApiPromptTemplateVersionPromptTemplateVersion;
      'api::recommended-action.recommended-action': ApiRecommendedActionRecommendedAction;
      'api::retention-policy.retention-policy': ApiRetentionPolicyRetentionPolicy;
      'api::risk-rule-version.risk-rule-version': ApiRiskRuleVersionRiskRuleVersion;
      'api::risk-rule.risk-rule': ApiRiskRuleRiskRule;
      'api::site-setting.site-setting': ApiSiteSettingSiteSetting;
      'api::web-page.web-page': ApiWebPageWebPage;
      'plugin::content-releases.release': PluginContentReleasesRelease;
      'plugin::content-releases.release-action': PluginContentReleasesReleaseAction;
      'plugin::i18n.locale': PluginI18NLocale;
      'plugin::review-workflows.workflow': PluginReviewWorkflowsWorkflow;
      'plugin::review-workflows.workflow-stage': PluginReviewWorkflowsWorkflowStage;
      'plugin::upload.file': PluginUploadFile;
      'plugin::upload.folder': PluginUploadFolder;
      'plugin::users-permissions.permission': PluginUsersPermissionsPermission;
      'plugin::users-permissions.role': PluginUsersPermissionsRole;
      'plugin::users-permissions.user': PluginUsersPermissionsUser;
    }
  }
}
