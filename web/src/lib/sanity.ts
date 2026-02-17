import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';

// Sanity client configuration
export const sanityClient = createClient({
  projectId: import.meta.env.VITE_SANITY_PROJECT_ID || 'your-project-id',
  dataset: import.meta.env.VITE_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: true,
  token: import.meta.env.VITE_SANITY_TOKEN, // Optional: for authenticated requests
});

// Helper function to generate image URLs
const builder = imageUrlBuilder(sanityClient);
export const urlFor = (source: any) => builder.image(source);

// Types for Sanity data
export interface SanityHeroSlide {
  _id: string;
  title: string;
  subtitle: string;
  description: string;
  gradient: string;
  mediaType?: 'image' | 'video';
  image?: {
    asset: {
      _ref: string;
      _type: 'reference';
    };
  };
  video?: {
    asset: {
      _ref: string;
      _type: 'reference';
      url?: string;
    };
  };
  order: number;
}

export interface SanityFeature {
  _id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  order: number;
}

export interface SanityAboutSection {
  _id: string;
  title: string;
  subtitle: string;
  description: string[];
  highlights: string[];
  stats: {
    productsVerified: string;
    companies: string;
    qrScans: string;
    uptime: string;
  };
}

export interface SanityObjective {
  _id: string;
  title: string;
  description: string;
  icon: string;
  order: number;
}

export interface SanityVideoSection {
  _id: string;
  title: string;
  subtitle?: string;
  description?: string;
  video: {
    asset: {
      _ref: string;
      _type: 'reference';
      url?: string;
    };
  };
  thumbnail?: {
    asset: {
      _ref: string;
      _type: 'reference';
    };
  };
}

export interface SanityBlogPost {
  _id: string;
  title: string;
  slug: {
    current: string;
  };
  excerpt: string;
  mainImage: {
    asset: {
      _ref: string;
      _type: 'reference';
    };
  };
  featuredVideo?: {
    asset: {
      _ref: string;
      _type: 'reference';
      url?: string;
    };
  };
  body: any; // Portable Text
  author: {
    name: string;
    image: any;
    bio?: any;
  };
  publishedAt: string;
  categories: Array<{
    title: string;
    _id: string;
  }>;
  featured?: boolean;
}

export interface SanityCategory {
  _id: string;
  title: string;
  description?: string;
}

export interface SanityMobileAppShowcase {
  _id: string;
  title: string;
  subtitle?: string;
  description?: string;
  screenshots: Array<{
    image: {
      asset: {
        _ref: string;
        _type: 'reference';
      };
    };
    hotspots?: Array<{
      title: string;
      description: string;
      xPosition: number;
      yPosition: number;
      icon?: string;
    }>;
    order: number;
  }>;
}

export interface SanityCtaButton {
  _key: string;
  label: string;
  linkType: 'internal' | 'external' | 'scroll';
  href: string;
  variant: 'primary' | 'outline' | 'ghost';
  backgroundColor?: string;
  textColor?: string;
  showArrow: boolean;
  openInNewTab: boolean;
}

export interface SanityCtaSection {
  _id: string;
  title: string;
  description?: string;
  buttons: SanityCtaButton[];
  sectionBackground?: string;
}

export interface SanityKioskShowcase {
  _id: string;
  title: string;
  subtitle?: string;
  description?: string;
  model3D: {
    title: string;
    description?: string;
    modelFile: {
      asset: {
        _ref: string;
        _type: 'reference';
        url?: string;
      };
    };
    thumbnail?: {
      asset: {
        _ref: string;
        _type: 'reference';
      };
    };
    hotspots?: Array<{
      title: string;
      description: string;
      xPosition: number;
      yPosition: number;
      zPosition: number;
      icon?: string;
    }>;
  };
}
