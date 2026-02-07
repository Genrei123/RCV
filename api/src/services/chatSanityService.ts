import { createClient } from '@sanity/client';
import * as dotenv from 'dotenv';

dotenv.config();

// Sanity client for API backend
const sanityClient = createClient({
  projectId: process.env.SANITY_PROJECT_ID || '',
  dataset: process.env.SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: true,
  token: process.env.SANITY_TOKEN, // Optional: for authenticated requests
});

interface BlogPost {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  bodyText: string;
  authorName: string;
  publishedAt: string;
  categories: string[];
}

interface FAQItem {
  _id: string;
  question: string;
  answer: string;
  category: string;
}

interface AboutContent {
  title: string;
  subtitle: string;
  description: string[];
  highlights: string[];
}

interface VideoSection {
  title: string;
  description: string;
}

export class ChatSanityService {
  /**
   * Search blog posts based on keywords
   */
  async searchBlogPosts(keywords: string[]): Promise<BlogPost[]> {
    if (keywords.length === 0) return [];

    try {
      // Build search query for keywords
      const searchTerms = keywords.map(k => `"${k}"`).join(' || ');
      
      const query = `*[_type == "blogPost" && (
        title match $keywords ||
        excerpt match $keywords ||
        pt::text(body) match $keywords
      )] | order(publishedAt desc) [0...5] {
        _id,
        title,
        "slug": slug.current,
        excerpt,
        "bodyText": pt::text(body),
        "authorName": author->name,
        publishedAt,
        "categories": categories[]->title
      }`;

      const posts = await sanityClient.fetch(query, { 
        keywords: keywords.join('* ') + '*'
      });

      return posts || [];
    } catch (error) {
      console.error('Error searching Sanity blog posts:', error);
      return [];
    }
  }

  /**
   * Get all FAQ items for context
   */
  async getFAQs(): Promise<FAQItem[]> {
    try {
      const query = `*[_type == "faq"] | order(order asc) {
        _id,
        question,
        answer,
        "category": category->title
      }`;

      const faqs = await sanityClient.fetch(query);
      return faqs || [];
    } catch (error) {
      console.error('Error fetching FAQs from Sanity:', error);
      return [];
    }
  }

  /**
   * Get about section content
   */
  async getAboutContent(): Promise<AboutContent | null> {
    try {
      const query = `*[_type == "aboutSection"][0] {
        title,
        subtitle,
        description,
        highlights
      }`;

      return await sanityClient.fetch(query);
    } catch (error) {
      console.error('Error fetching about content from Sanity:', error);
      return null;
    }
  }

  /**
   * Get recent blog posts for general context
   */
  async getRecentBlogPosts(limit: number = 5): Promise<BlogPost[]> {
    try {
      const query = `*[_type == "blogPost"] | order(publishedAt desc) [0...${limit}] {
        _id,
        title,
        "slug": slug.current,
        excerpt,
        "bodyText": pt::text(body),
        "authorName": author->name,
        publishedAt,
        "categories": categories[]->title
      }`;

      const posts = await sanityClient.fetch(query);
      return posts || [];
    } catch (error) {
      console.error('Error fetching recent blog posts from Sanity:', error);
      return [];
    }
  }

  /**
   * Get video section content
   */
  async getVideoSectionInfo(): Promise<VideoSection | null> {
    try {
      const query = `*[_type == "videoSection"][0] {
        title,
        description
      }`;

      return await sanityClient.fetch(query);
    } catch (error) {
      console.error('Error fetching video section from Sanity:', error);
      return null;
    }
  }

  /**
   * Search all Sanity content based on query
   */
  async searchAllContent(keywords: string[]): Promise<{
    blogPosts: BlogPost[];
    faqs: FAQItem[];
    aboutContent: AboutContent | null;
  }> {
    const [blogPosts, faqs, aboutContent] = await Promise.all([
      this.searchBlogPosts(keywords),
      this.getFAQs(),
      this.getAboutContent(),
    ]);

    return { blogPosts, faqs, aboutContent };
  }

  /**
   * Format blog post for AI context
   */
  formatBlogPost(post: BlogPost): string {
    const categories = post.categories?.length > 0 
      ? post.categories.join(', ') 
      : 'Uncategorized';
    
    // Truncate body text to avoid token limits
    const truncatedBody = post.bodyText?.length > 500 
      ? post.bodyText.substring(0, 500) + '...' 
      : post.bodyText || '';

    return `
**Blog: ${post.title}**
- Author: ${post.authorName || 'RCV Team'}
- Published: ${post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : 'N/A'}
- Categories: ${categories}
- Summary: ${post.excerpt || 'No summary available'}
- Content Preview: ${truncatedBody}
    `.trim();
  }

  /**
   * Format FAQ for AI context
   */
  formatFAQ(faq: FAQItem): string {
    return `
**Q: ${faq.question}**
A: ${faq.answer}
${faq.category ? `(Category: ${faq.category})` : ''}
    `.trim();
  }

  /**
   * Format about content for AI context
   */
  formatAboutContent(about: AboutContent): string {
    return `
**About RCV:**
${about.title}
${about.description?.join('\n') || ''}

**Key Highlights:**
${about.highlights?.map(h => `- ${h}`).join('\n') || ''}
    `.trim();
  }

  /**
   * Build context string from all Sanity content
   */
  buildSanityContext(
    blogPosts: BlogPost[],
    faqs: FAQItem[],
    aboutContent: AboutContent | null
  ): string {
    let context = '';

    if (blogPosts.length > 0) {
      context += '\n\n**RELEVANT BLOG POSTS & ARTICLES:**\n';
      context += blogPosts.map(p => this.formatBlogPost(p)).join('\n\n');
    }

    if (faqs.length > 0) {
      context += '\n\n**FREQUENTLY ASKED QUESTIONS:**\n';
      context += faqs.map(f => this.formatFAQ(f)).join('\n\n');
    }

    if (aboutContent) {
      context += '\n\n**ABOUT RCV PLATFORM:**\n';
      context += this.formatAboutContent(aboutContent);
    }

    return context;
  }
}

export const chatSanityService = new ChatSanityService();
