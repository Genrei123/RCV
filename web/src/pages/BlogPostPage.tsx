import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, User, Tag, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Footer } from "@/components/Footer";
import { SanityService } from "@/services/sanityService";
import { urlFor } from "@/lib/sanity";
import type { SanityBlogPost } from "@/lib/sanity";
import { PortableText } from "@portabletext/react";

export function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<SanityBlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<SanityBlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      if (!slug) return;
      
      setLoading(true);
      try {
        const fetchedPost = await SanityService.getBlogPostBySlug(slug);
        setPost(fetchedPost);

        // Fetch related posts from the same category
        if (fetchedPost?.categories?.[0]?._id) {
          const related = await SanityService.getBlogPostsByCategory(
            fetchedPost.categories[0]._id,
            4
          );
          setRelatedPosts(related.filter((p) => p._id !== fetchedPost._id));
        }
      } catch (error) {
        console.error("Error fetching blog post:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [slug]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const estimateReadTime = (body: any[]) => {
    if (!body) return 1;
    const words = body.reduce((count, block) => {
      if (block._type === "block" && block.children) {
        return count + block.children.reduce((c: number, child: any) => {
          return c + (child.text?.split(" ").length || 0);
        }, 0);
      }
      return count;
    }, 0);
    return Math.max(1, Math.ceil(words / 200));
  };

  // PortableText components for rendering rich content
  const portableTextComponents = {
    types: {
      image: ({ value }: any) => {
        if (!value?.asset) return null;
        return (
          <figure className="my-8">
            <img
              src={urlFor(value).width(1200).url()}
              alt={value.alt || "Blog image"}
              className="w-full rounded-lg"
            />
            {value.caption && (
              <figcaption className="text-center text-sm text-text-subtle mt-2">
                {value.caption}
              </figcaption>
            )}
          </figure>
        );
      },
      file: ({ value }: any) => {
        if (!value?.asset?.url) return null;
        
        // Check if it's a video file
        const isVideo = value.asset.mimeType?.startsWith("video/");
        
        if (isVideo) {
          return (
            <figure className="my-8">
              <video
                src={value.asset.url}
                controls
                className="w-full rounded-lg"
              >
                Your browser does not support the video tag.
              </video>
              {value.caption && (
                <figcaption className="text-center text-sm text-text-subtle mt-2">
                  {value.caption}
                </figcaption>
              )}
            </figure>
          );
        }
        
        return null;
      },
    },
    block: {
      h1: ({ children }: any) => (
        <h1 className="text-4xl font-bold app-text-primary mt-8 mb-4">{children}</h1>
      ),
      h2: ({ children }: any) => (
        <h2 className="text-3xl font-bold app-text-primary mt-8 mb-4">{children}</h2>
      ),
      h3: ({ children }: any) => (
        <h3 className="text-2xl font-bold app-text-primary mt-6 mb-3">{children}</h3>
      ),
      h4: ({ children }: any) => (
        <h4 className="text-xl font-bold app-text-primary mt-6 mb-3">{children}</h4>
      ),
      normal: ({ children }: any) => (
        <p className="text-text-subtle mb-4 leading-relaxed">{children}</p>
      ),
      blockquote: ({ children }: any) => (
        <blockquote className="border-l-4 border-app-primary pl-4 my-6 italic text-text-subtle">
          {children}
        </blockquote>
      ),
    },
    list: {
      bullet: ({ children }: any) => (
        <ul className="list-disc list-inside mb-4 space-y-2 text-text-subtle">
          {children}
        </ul>
      ),
      number: ({ children }: any) => (
        <ol className="list-decimal list-inside mb-4 space-y-2 text-text-subtle">
          {children}
        </ol>
      ),
    },
    marks: {
      strong: ({ children }: any) => <strong className="font-bold">{children}</strong>,
      em: ({ children }: any) => <em className="italic">{children}</em>,
      link: ({ children, value }: any) => (
        <a
          href={value?.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-app-primary hover:underline"
        >
          {children}
        </a>
      ),
    },
  };

  if (loading) {
    return (
      <div className="min-h-screen app-bg-neutral flex items-center justify-center">
        <div className="text-text-subtle">Loading post...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen app-bg-neutral flex items-center justify-center">
        <div className="text-center">
          <p className="text-text-subtle mb-4">Post not found</p>
          <Button onClick={() => navigate("/blog")}>Back to Blog</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
              <img src="/logo_inv.svg" alt="RCV Logo" className="h-10 w-10" draggable="false"/>
              <div className="flex flex-col">
                <span className="font-bold text-lg app-text-primary leading-tight">
                  RCV
                </span>
                <span className="text-[10px] app-text-primary leading-tight">
                  Regulatory Compliance Verification
                </span>
              </div>
            </div>

            {/* Back to Blog Button */}
            <Button 
              onClick={() => navigate("/blog")} 
              variant="ghost"
              className="hover:text-primary"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Blog
            </Button>
          </div>
        </div>
      </header>

      {/* Add padding top to account for fixed header */}
      <div className="pt-16">
      {/* Featured Image/Video */}
      {(post.featuredVideo?.asset?.url || post.mainImage) && (
        <div className="relative h-[400px] md:h-[500px] overflow-hidden">
          {post.featuredVideo?.asset?.url ? (
            <video
              src={post.featuredVideo.asset.url}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : post.mainImage ? (
            <img
              src={urlFor(post.mainImage).width(1920).url()}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Post Header */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2 mb-4">
            {post.categories?.map((category) => (
              <Badge key={category._id} className="app-bg-primary text-white border-0">
                <Tag className="w-3 h-3 mr-1" />
                {category.title}
              </Badge>
            ))}
          </div>

          <h1 className="text-4xl md:text-5xl font-bold app-text-primary mb-6">
            {post.title}
          </h1>

          <div className="flex flex-wrap items-center gap-6 text-text-subtle mb-6">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5" />
              <span className="font-medium">{post.author?.name || "RCV Team"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              <span>{formatDate(post.publishedAt)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              <span>{estimateReadTime(post.body)} min read</span>
            </div>
          </div>

          {post.excerpt && (
            <p className="text-xl text-text-subtle leading-relaxed">
              {post.excerpt}
            </p>
          )}
        </div>

        {/* Author Card */}
        {post.author && (
          <Card className="p-6 mb-8 flex items-center gap-4">
            {post.author.image && (
              <img
                src={urlFor(post.author.image).width(80).height(80).url()}
                alt={post.author.name}
                className="w-16 h-16 rounded-full object-cover"
              />
            )}
            <div>
              <h3 className="font-bold app-text-primary">{post.author.name}</h3>
              {post.author.bio && (
                <p className="text-sm text-text-subtle mt-1">
                  {post.author.bio[0]?.children?.[0]?.text}
                </p>
              )}
            </div>
          </Card>
        )}

        {/* Post Body */}
        <article className="prose prose-lg max-w-none">
          <PortableText value={post.body} components={portableTextComponents} />
        </article>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <div className="mt-16">
            <h2 className="text-3xl font-bold app-text-primary mb-8">Related Posts</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedPosts.slice(0, 3).map((relatedPost) => (
                <Card
                  key={relatedPost._id}
                  className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/blog/${relatedPost.slug.current}`)}
                >
                  {relatedPost.mainImage && (
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={urlFor(relatedPost.mainImage).width(600).url()}
                        alt={relatedPost.title}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="text-lg font-bold app-text-primary mb-2 line-clamp-2">
                      {relatedPost.title}
                    </h3>
                    <p className="text-sm text-text-subtle line-clamp-2">
                      {relatedPost.excerpt}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
      </div>

      <Footer />
    </div>
  );
}
