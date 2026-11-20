import type { Schema, Struct } from '@strapi/strapi';

export interface SharedSeo extends Struct.ComponentSchema {
  collectionName: 'components_shared_seos';
  info: {
    description: '';
    displayName: 'SEO';
  };
  attributes: {
    canonical_url: Schema.Attribute.String;
    meta_description: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 170;
      }>;
    meta_title: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 70;
      }>;
    og_image: Schema.Attribute.Media<'images'>;
  };
}

export interface WebsiteComparisonRow extends Struct.ComponentSchema {
  collectionName: 'components_website_comparison_rows';
  info: {
    description: '';
    displayName: 'Comparison Row';
  };
  attributes: {
    does: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    label: Schema.Attribute.String & Schema.Attribute.Required;
    note: Schema.Attribute.Text;
  };
}

export interface WebsiteCtaSection extends Struct.ComponentSchema {
  collectionName: 'components_website_cta_sections';
  info: {
    description: '';
    displayName: 'CTA Section';
  };
  attributes: {
    body: Schema.Attribute.Text;
    cta_label: Schema.Attribute.String;
    cta_url: Schema.Attribute.String;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface WebsiteFeatureCard extends Struct.ComponentSchema {
  collectionName: 'components_website_feature_cards';
  info: {
    description: '';
    displayName: 'Feature Card';
  };
  attributes: {
    body: Schema.Attribute.Text;
    icon_name: Schema.Attribute.String;
    phase_label: Schema.Attribute.String;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface WebsiteHero extends Struct.ComponentSchema {
  collectionName: 'components_website_heros';
  info: {
    description: '';
    displayName: 'Hero';
  };
  attributes: {
    cta_label: Schema.Attribute.String;
    cta_url: Schema.Attribute.String;
    headline: Schema.Attribute.String & Schema.Attribute.Required;
    illustration: Schema.Attribute.Media<'images'>;
    subheading: Schema.Attribute.Text;
  };
}

export interface WebsiteStep extends Struct.ComponentSchema {
  collectionName: 'components_website_steps';
  info: {
    description: '';
    displayName: 'Step';
  };
  attributes: {
    body: Schema.Attribute.Text;
    step_no: Schema.Attribute.Integer;
    tag: Schema.Attribute.String;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface WebsiteTestimonial extends Struct.ComponentSchema {
  collectionName: 'components_website_testimonials';
  info: {
    description: '';
    displayName: 'Testimonial';
  };
  attributes: {
    permission_confirmed: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<false>;
    person_display: Schema.Attribute.String;
    quote: Schema.Attribute.Text & Schema.Attribute.Required;
    role_display: Schema.Attribute.String;
  };
}

declare module '@strapi/strapi' {
  export namespace Public {
    export interface ComponentSchemas {
      'shared.seo': SharedSeo;
      'website.comparison-row': WebsiteComparisonRow;
      'website.cta-section': WebsiteCtaSection;
      'website.feature-card': WebsiteFeatureCard;
      'website.hero': WebsiteHero;
      'website.step': WebsiteStep;
      'website.testimonial': WebsiteTestimonial;
    }
  }
}
