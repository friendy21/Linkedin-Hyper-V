import Image from 'next/image';
import { getAuthors } from '@/lib/strapi';

export const metadata = {
  title: 'Authors | RegulateThis',
  description: 'Meet the industry experts and writers behind our insights.',
};

export default async function AuthorsPage() {
  const authors = await getAuthors();

  return (
    <div className="min-h-screen bg-gray-50 py-12 md:py-20 text-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-[#0B1F3B]">Our Authors</h1>
        <p className="text-xl text-gray-600 mb-12">Meet the industry experts behind RegulateThis.</p>
        
        {authors.length === 0 ? (
          <p className="text-gray-500">No authors found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {authors.map((author: any) => {
              // Note: using placeholder image if avatar is missing
              const avatarUrl = author.avatar?.url
                ? author.avatar.url
                : 'https://placehold.co/400x400/49648C/FFFFFF?text=Author';
              
              return (
                <div key={author.id} className="bg-white rounded-xl p-8 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow">
                  <div className="relative w-24 h-24 rounded-full overflow-hidden mb-4 bg-gray-100 flex-shrink-0">
                     <Image
                      src={avatarUrl}
                      alt={author.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <h3 className="text-2xl font-bold mb-1 text-[#0B1F3B]">{author.name}</h3>
                  {author.title && (
                    <p className="text-[#49648C] font-medium mb-4">{author.title}</p>
                  )}
                  {author.bio && (
                    <p className="text-gray-600 text-sm line-clamp-3 leading-relaxed">
                      {author.bio}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
