import { sanityClient } from '@/lib/sanity';
import type { SanityHeroSlide, SanityFeature, SanityAboutSection, SanityObjective, SanityVideoSection, SanityBlogPost } from '@/lib/sanity';

export class SanityService {
  /**
   * Fetch hero carousel slides
   */
  static async getHeroSlides(): Promise<SanityHeroSlide[]> {
    const query = `*[_type == "heroSlide"] | order(order asc) {
      _id,
      title,
      subtitle,
      description,
      gradient,
      mediaType,
      image{
        asset->{
          _id,
          url
        }
      },
      video{
        asset->{
          _id,
          url
        }
      },
      order
    }`;

    return await sanityClient.fetch(query);
  }

  /**
   * Fetch features
   */
  static async getFeatures(): Promise<SanityFeature[]> {
    const query = `*[_type == "feature"] | order(order asc) {
      _id,
      title,
      description,
      icon,
      color,
      order
    }`;

    return await sanityClient.fetch(query);
  }

  /**
   * Fetch About section content
   */
  static async getAboutSection(): Promise<SanityAboutSection> {
    const query = `*[_type == "aboutSection"][0] {
      _id,
      title,
      subtitle,
      description,
      highlights,
      stats
    }`;

    return await sanityClient.fetch(query);
  }

  /**
   * Fetch mission objectives
   */
  static async getObjectives(): Promise<SanityObjective[]> {
    const query = `*[_type == "objective"] | order(order asc) {
      _id,
      title,
      description,
      icon,
      order
    }`;

    return await sanityClient.fetch(query);
  }

  /**
   * Fetch video section
   */
  static async getVideoSection(): Promise<SanityVideoSection | null> {
    const query = `*[_type == "videoSection"][0] {
      _id,
      title,
      subtitle,
      description,
      video{
        asset->{
          _id,
          url
        }
      },
      thumbnail{
        asset->{
          _id,
          url
        }
      }
    }`;

    return await sanityClient.fetch(query);
  }

  /**
   * Fetch all blog posts
   * @param limit - Number of posts to fetch. Pass 0 or undefined for all posts.
   */
  static async getBlogPosts(limit?: number): Promise<SanityBlogPost[]> {
    const limitClause = limit && limit > 0 ? `[0...${limit}]` : '';
    const query = `*[_type == "blogPost"] | order(publishedAt desc) ${limitClause} {
      _id,
      title,
      slug,
      excerpt,
      mainImage{
        asset->{
          _id,
          url
        }
      },
      featuredVideo{
        asset->{
          _id,
          url
        }
      },
      body,
      author->{
        name,
        image{
          asset->{
            _id,
            url
          }
        }
      },
      publishedAt,
      featured,
      categories[]->{
        _id,
        title
      }
    }`;

    return await sanityClient.fetch(query);
  }

  /**
   * Fetch featured blog posts only
   */
  static async getFeaturedBlogPosts(limit: number = 3): Promise<SanityBlogPost[]> {
    const query = `*[_type == "blogPost" && featured == true] | order(publishedAt desc) [0...${limit}] {
      _id,
      title,
      slug,
      excerpt,
      mainImage{
        asset->{
          _id,
          url
        }
      },
      featuredVideo{
        asset->{
          _id,
          url
        }
      },
      author->{
        name,
        image{
          asset->{
            _id,
            url
          }
        }
      },
      publishedAt,
      categories[]->{
        _id,
        title
      }
    }`;

    return await sanityClient.fetch(query);
  }

  /**
   * Fetch a single blog post by slug
   */
  static async getBlogPostBySlug(slug: string): Promise<SanityBlogPost> {
    const query = `*[_type == "blogPost" && slug.current == $slug][0] {
      _id,
      title,
      slug,
      excerpt,
      mainImage{
        asset->{
          _id,
          url
        }
      },
      featuredVideo{
        asset->{
          _id,
          url
        }
      },
      body,
      author->{
        name,
        image{
          asset->{
            _id,
            url
          }
        }
      },
      publishedAt,
      featured,
      categories[]->{
        _id,
        title
      }
    }`;

    return await sanityClient.fetch(query, { slug });
  }

  /**
   * Fetch blog posts by category
   * @param categoryId - The category ID to filter by
   * @param limit - Number of posts to fetch. Pass 0 or undefined for all posts.
   */
  static async getBlogPostsByCategory(categoryId: string, limit?: number): Promise<SanityBlogPost[]> {
    const limitClause = limit && limit > 0 ? `[0...${limit}]` : '';
    const query = `*[_type == "blogPost" && $categoryId in categories[]._ref] | order(publishedAt desc) ${limitClause} {
      _id,
      title,
      slug,
      excerpt,
      mainImage,
      author->{
        name,
        image
      },
      publishedAt,
      categories[]->{
        _id,
        title
      }
    }`;

    return await sanityClient.fetch(query, { categoryId });
  }

  /**
   * Fetch all blog categories
   */
  static async getBlogCategories() {
    const query = `*[_type == "category"] | order(title asc) {
      _id,
      title,
      description
    }`;

    return await sanityClient.fetch(query);
  }

  /**
   * Fetch mobile app showcase
   */
  static async getMobileAppShowcase() {
    const query = `*[_type == "mobileAppShowcase"] | order(_createdAt asc) {
      _id,
      title,
      subtitle,
      description,
      screenshots[] | order(order asc) {
        image{
          asset->{
            _id,
            url
          }
        },
        hotspots[]{
          title,
          description,
          xPosition,
          yPosition,
          icon
        },
        order
      }
    }`;

    return await sanityClient.fetch(query);
  }

  /**
   * Fetch kiosk showcase with 3D model
   */
  static async getKioskShowcase() {
    const query = `*[_type == "kioskShowcase"][0] {
      _id,
      title,
      subtitle,
      description,
      model3D{
        title,
        description,
        modelFile{
          asset->{
            _id,
            url
          }
        },
        thumbnail{
          asset->{
            _id,
            url
          }
        },
        hotspots[]{
          title,
          description,
          xPosition,
          yPosition,
          zPosition,
          icon
        }
      }
    }`;

    return await sanityClient.fetch(query);
  }
}
