import Image from 'next/image';
import Link from 'next/link';
import { getRecentArticles, getStrapiMediaUrl } from '@/lib/strapi';
import type { StrapiData, StrapiArticleAttributes } from '@/lib/strapi';

export const metadata = {
  title: 'Blog | RegulateThis',
  description: 'Latest insights on compliance, technology, and practice management for RIAs.',
};

export default async function BlogPage({
  searchParams,
}: {
  searchParams: { page?: string; pillar?: string };
}) {
  const page = Number(searchParams.page) || 1;
  const pillar = searchParams.pillar || undefined;
  
  // Fake pagination logic since getRecentArticles doesn't support pagination out of the box in the instructions, 
  // but we can slice the array or assume it accepts limit param. Based on instruction: "Fetch from getRecentArticles(30)."
  const allArticles = await getRecentArticles(30);
  
  let filteredArticles: StrapiData<StrapiArticleAttributes>[] = allArticles;
  if (pillar) {
    filteredArticles = allArticles.filter((article: StrapiData<StrapiArticleAttributes>) => 
      article.attributes.pillar?.data?.attributes?.slug === pillar || 
      article.attributes.pillar?.data?.attributes?.name?.toLowerCase().includes(pillar.toLowerCase())
    );
  }

  const itemsPerPage = 9;
  const totalPages = Math.ceil(filteredArticles.length / itemsPerPage);
  const currentArticles = filteredArticles.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div className="min-h-screen bg-gray-50 py-12 md:py-20 text-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-[#0B1F3B]">Insights & Analysis</h1>
        <p className="text-xl text-gray-600 mb-12">Actionable intelligence for modern wealth management.</p>
        
        {currentArticles.length === 0 ? (
          <p className="text-gray-500">No articles found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {currentArticles.map((article: StrapiData<StrapiArticleAttributes>) => {
              const attrs = article.attributes;
              const imageUrl = attrs.featuredImage?.data?.attributes?.url
                ? getStrapiMediaUrl(attrs.featuredImage.data.attributes.url)
                : null;
              const imageAlt = attrs.featuredImage?.data?.attributes?.url
                ? (attrs.title)
                : attrs.title;

              return (
                <Link href={`/article/${attrs.slug}`} key={article.id} className="group flex flex-col bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="relative aspect-video w-full overflow-hidden bg-gray-200">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={imageAlt}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : null}
                  </div>
                  <div className="p-6 flex flex-col flex-grow">
                    <h3 className="text-xl font-bold mb-2 group-hover:text-[#49648C] transition-colors line-clamp-2">
                      {attrs.title}
                    </h3>
                    <p className="text-gray-600 line-clamp-2 mb-4 flex-grow">
                      {attrs.excerpt}
                    </p>
                    <p className="text-sm text-gray-500 font-medium">
                      {attrs.readTime ? `${attrs.readTime} min read` : '5 min read'}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-12 flex justify-center space-x-4">
            {page > 1 && (
              <Link
                href={`/blog?page=${page - 1}${pillar ? `&pillar=${pillar}` : ''}`}
                className="px-6 py-2 bg-white text-gray-700 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors focus:ring-2 focus:ring-[#49648C] focus:outline-none"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/blog?page=${page + 1}${pillar ? `&pillar=${pillar}` : ''}`}
                className="px-6 py-2 bg-white text-gray-700 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors focus:ring-2 focus:ring-[#49648C] focus:outline-none"
              >
                Next
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
