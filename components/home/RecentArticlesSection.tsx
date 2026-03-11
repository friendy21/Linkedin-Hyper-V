import React from 'react';
import { Container } from '@/components/ui/Container';
import { getAllArticles } from '@/lib/data-service';
import { ArticleFilterClient } from './ArticleFilterClient';

export async function RecentArticlesSection() {
    const articles = await getAllArticles().catch(() => []);

    return (
        <section className="relative bg-white overflow-hidden">
            <Container>
                <div className="py-20 md:py-28">
                    {/* Section Header */}
                    <div className="mb-8">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="h-px w-12 bg-[#49648C]"></div>
                            <span className="text-xs font-semibold tracking-[0.2em] uppercase text-[#49648C]">
                                Latest Content
                            </span>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-light text-[#0B1F3B] mb-8">
                            Recent Articles
                        </h2>
                    </div>

                    <ArticleFilterClient articles={articles} />
                </div>
            </Container>
        </section>
    );
}