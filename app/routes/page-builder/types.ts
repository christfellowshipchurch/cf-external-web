import { RockCampus } from '~/lib/rock-config';

/**
 * Represents a section type in the page builder
 */
export type SectionType =
  | 'EVENT_COLLECTION'
  | 'RESOURCE_COLLECTION'
  | 'CTA_COLLECTION'
  | 'CONTENT_BLOCK'
  | 'FAQs'
  | 'IMAGE_GALLERY';

export type ContentType =
  | 'EVENTS'
  | 'MESSAGES'
  | 'ARTICLES'
  | 'DEVOTIONALS'
  | 'MINISTRY_PAGE'
  | 'PODCASTS'
  | 'CREW_CAST'
  | 'YOUNG_+_ADULTING'
  | 'SO_GOOD_SISTERHOOD'
  | 'MADE_FOR_MORE'
  | 'REDIRECT_CARD'
  | 'PAGE_BUILDER';

/**
 * Represents a call-to-action item with title and URL
 */
export type CallToAction = {
  title: string;
  url: string;
};

/**
 * Represents the structure of attribute values from Rock CMS
 */
export type RockAttributeValue = {
  value: string | number | boolean | null;
};

/**
 * Represents the structure of each FAQ item used in the FAQ component
 */
export type FAQItem = {
  id: string;
  question: string;
  answer: string;
};

/**
 * Represents FAQ data structure for mock data
 */
export type FAQ = {
  id: string;
  faqs: FAQItem[];
};

/**
 * Represents a single image in an Image Gallery section
 */
export type ImageGalleryItem = {
  id: string;
  image: string;
  title?: string;
  summary?: string;
};

/**
 * Represents Image Gallery data structure for mock data
 */
export type ImageGallery = {
  id: string;
  images: ImageGalleryItem[];
  description?: string;
  hideTitle?: boolean;
};

/**
 * Represents a collection card in the page builder
 */
export type CollectionItem = {
  id: string;
  readTime?: number;
  contentChannelId: string;
  contentType: ContentType;
  name: string;
  htmlContent?: string;
  summary: string;
  description?: string;
  image: string;
  pathname: string;
  startDate?: string; // for Events, Sermons, Devotionals, Podcasts
  author?: string; // for Sermons, Articles, Devotionals, Podcasts
  location?: string; // for Events
  /** Events only. Plain text (no HTML) "Card Subtitle" attribute from Rock; takes priority over `summary` as the card description. */
  cardSubtitle?: string;
  /** Redirect Card only (Rock `disableCard`). When true, carousel renders static content without link/card chrome. */
  disableCard?: boolean;
};

/**
 * Represents a child item in the page builder
 */
export type PageBuilderSection = {
  id: string;
  name: string;
  titleOverride?: string;
  hideTitle?: boolean;
  content: string;
  type: SectionType;
  linkTreeLayout?: 'GRID' | 'LIST'; // only used for resource collections
  collection?: CollectionItem[];
  faqs?: FAQItem[];
  stillHaveQuestionsLink?: string; // only in FAQs component
  cta?: CallToAction; // Used in FAQs component
  imageGallery?: ImageGalleryItem[];
  viewMoreLink?: string | undefined;
  className?: string; // Location Single pages uses page builder components that want custom padding around
};

/**
 * Represents the complete page builder data structure
 */
export type PageBuilderLoader = {
  title: string;
  heroImage: string;
  callsToAction: CallToAction[];
  content: string;
  sections: PageBuilderSection[];
  services?: MinistryService[];
};

/**
 * Ministry Types
 */
export type MinistryType =
  | 'cf-kids'
  | 'kids-university'
  | 'students'
  | 'the-mix'
  | 'young-adults'
  | 'college-nights'
  | 'celebrate-recovery';

/**
 * Represents a ministry service in the page builder
 */
export type MinistryService = {
  id: string;
  ministryType: MinistryType;
  location: RockCampus;
  daysOfWeek: string;
  times: string;
  learnMoreLink?: string;
  planAVisit?: boolean;
};

/**
 * Layout types for ContentBlock
 */
export type ContentBlockLayoutType =
  | 'FEATURE'
  | 'BANNER'
  | 'CARD'
  | 'FULLSCREEN';

/**
 * Aspect ratios for images
 */
export type ContentBlockAspectRatio = '16by9' | '4by5' | '1by1';

/**
 * Image layout options
 */
export type ContentBlockImageLayout = 'LEFT' | 'RIGHT';

/**
 * Background color options
 */
export type ContentBlockBackgroundColor =
  | 'WHITE'
  | 'OCEAN'
  | 'NAVY'
  | 'GRAY'
  | string;

/**
 * Represents a Content Block section in the page builder
 */
export interface ContentBlockData {
  id: string;
  type: 'CONTENT_BLOCK';
  name: string;
  content: string;
  layoutType: ContentBlockLayoutType;
  subtitle?: string;
  callsToAction?: string; // Format: "Label^#url|Label2^#url2"
  coverImage?: string;
  featureVideo?: string; // Wistia Video ID
  aspectRatio?: ContentBlockAspectRatio;
  imageLayout?: ContentBlockImageLayout;
  backgroundColor?: ContentBlockBackgroundColor;
  className?: string;
}
