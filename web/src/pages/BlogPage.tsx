import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Calendar, User, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Footer } from "@/components/Footer";
import { SanityService } from "@/services/sanityService";
import { urlFor } from "@/lib/sanity";
import type { SanityBlogPost, SanityCategory } from "@/lib/sanity";

export function BlogPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<SanityBlogPost[]>([]);
  const [categories, setCategories] = useState<SanityCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fetchedPosts, fetchedCategories] = await Promise.all([
          SanityService.getBlogPosts(),
          SanityService.getBlogCategories(),
        ]);
        setPosts(fetchedPosts);
        setCategories(fetchedCategories);
      } catch (error) {
        console.error("Error fetching blog data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchFilteredPosts = async () => {
      if (selectedCategory) {
        setLoading(true);
        try {
          const filteredPosts = await SanityService.getBlogPostsByCategory(
            selectedCategory
          );
          setPosts(filteredPosts);
        } catch (error) {
          console.error("Error fetching filtered posts:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(true);
        try {
          const allPosts = await SanityService.getBlogPosts();
          setPosts(allPosts);
        } catch (error) {
          console.error("Error fetching all posts:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchFilteredPosts();
  }, [selectedCategory]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const featuredPost = posts.find((post) => post.featured);
  const regularPosts = posts.filter((post) => !post.featured);

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

            {/* Back to Home Button */}
            <Button 
              onClick={() => navigate("/")} 
              variant="ghost"
              className="hover:text-primary"
            >
              Back to Home
            </Button>
          </div>
        </div>
      </header>

      <div className="pt-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page Title */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold app-text-primary mb-4">
            Blog & Insights
          </h1>
          <p className="text-lg text-text-subtle max-w-2xl mx-auto">
            Stay updated with the latest trends in product verification, blockchain technology, and regulatory compliance.
          </p>
        </div>

        {/* Categories Filter */}
        <div className="flex flex-wrap gap-3 mb-8 justify-center">
          <Badge
            variant={selectedCategory === null ? "default" : "outline"}
            className={`cursor-pointer px-4 py-2 ${
              selectedCategory === null 
                ? "app-bg-primary hover:app-bg-secondary text-white border-0" 
                : "border-gray-300 hover:border-gray-400 bg-white"
            }`}
            onClick={() => setSelectedCategory(null)}
          >
            All Posts
          </Badge>
          {categories.map((category) => (
            <Badge
              key={category._id}
              variant={selectedCategory === category._id ? "default" : "outline"}
              className={`cursor-pointer px-4 py-2 ${
                selectedCategory === category._id 
                  ? "app-bg-primary hover:app-bg-secondary text-white border-0" 
                  : "border-gray-300 hover:border-gray-400 bg-white"
              }`}
              onClick={() => setSelectedCategory(category._id)}
            >
              {category.title}
            </Badge>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-text-subtle">Loading posts...</div>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-text-subtle">No blog posts available yet.</p>
          </div>
        ) : (
          <>
            {/* Featured Post */}
            {featuredPost && (
              <Card className="mb-12 overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/blog/${featuredPost.slug.current}`)}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="relative h-64 lg:h-auto">
                    {featuredPost.featuredVideo?.asset?.url ? (
                      <video
                        src={featuredPost.featuredVideo.asset.url}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : featuredPost.mainImage ? (
                      <img
                        src={urlFor(featuredPost.mainImage).width(800).url()}
                        alt={featuredPost.title}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : null}
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-app-primary text-white">Featured</Badge>
                    </div>
                  </div>
                  <div className="p-6 lg:p-8 flex flex-col justify-center">
                    <div className="flex flex-wrap gap-2 mb-4">
                      {featuredPost.categories?.map((category) => (
                        <Badge key={category._id} variant="outline">
                          <Tag className="w-3 h-3 mr-1" />
                          {category.title}
                        </Badge>
                      ))}
                    </div>
                    <h2 className="text-3xl font-bold app-text-primary mb-4">
                      {featuredPost.title}
                    </h2>
                    <p className="text-text-subtle mb-6 line-clamp-3">
                      {featuredPost.excerpt}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-text-subtle mb-6">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>{featuredPost.author?.name || "RCV Team"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(featuredPost.publishedAt)}</span>
                      </div>
                    </div>
                    <Button className="w-fit">
                      Read More <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Regular Posts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {regularPosts.map((post) => (
                <Card
                  key={post._id}
                  className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group"
                  onClick={() => navigate(`/blog/${post.slug.current}`)}
                >
                  {post.mainImage && (
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={urlFor(post.mainImage).width(600).url()}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {post.categories?.slice(0, 2).map((category) => (
                        <Badge key={category._id} variant="outline" className="text-xs">
                          {category.title}
                        </Badge>
                      ))}
                    </div>
                    <h3 className="text-xl font-bold app-text-primary mb-3 line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-text-subtle mb-4 line-clamp-3">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-text-subtle">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(post.publishedAt)}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
