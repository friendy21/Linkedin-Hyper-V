'use client';

import React, { useState } from 'react';
import { Container } from '@/components/ui/Container';
import { ArticleCard } from '@/components/article/ArticleCard';
import { Pillar, Article } from '@/types';

interface ArticleFilterClientProps {
    articles: Article[];
}

export const ArticleFilterClient: React.FC<ArticleFilterClientProps> = ({ articles }) => {
    const [selectedPillar, setSelectedPillar] = useState<Pillar | 'All'>('All');

    const pillars: Array<Pillar | 'All'> = [
        'All',
        'Compliance & Regulation',
        'Technology & Operations',
        'Practice Management',
        'Client Strategy',
        'Industry Insights',
    ];

    // Filter articles based on selected pillar
    const filteredArticles = selectedPillar === 'All'
        ? articles
        : articles.filter(article => article.pillar === selectedPillar);

    // Show only first 9 articles (or all if less than 9)
    const displayedArticles = filteredArticles.slice(0, 9);

    return (
        <>
            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-3 mb-12">
                {pillars.map((pillar) => (
                    <button
                        key={pillar}
                        onClick={() => setSelectedPillar(pillar)}
                        className={`px-4 py-2 text-sm font-medium transition-all duration-300 ${selectedPillar === pillar
                            ? 'bg-[#0B1F3B] text-white'
                            : 'bg-white text-[#0B1F3B] border border-gray-200 hover:border-[#49648C] hover:text-[#49648C]'
                            }`}
                        style={{ borderRadius: '2px' }}
                    >
                        {pillar}
                    </button>
                ))}
            </div>

            {/* Articles Grid */}
            {displayedArticles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {displayedArticles.map((article) => (
                        <ArticleCard key={article.id} article={article} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-12">
                    <p className="text-gray-500 text-lg">No articles found for this topic.</p>
                </div>
            )}

            {/* Article Count Indicator */}
            <div className="mt-8 text-center">
                <p className="text-sm text-gray-500">
                    Showing {displayedArticles.length} of {filteredArticles.length} articles
                    {selectedPillar !== 'All' && ` in ${selectedPillar}`}
                </p>
            </div>
        </>
    );
};
