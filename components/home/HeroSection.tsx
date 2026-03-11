import React from 'react';
import { getAllArticles } from '@/lib/data-service';
import { Pillar, Article } from '@/types';
import { HeroCarousel } from './HeroCarousel';

export async function HeroSection() {
    // Fetch articles at the top level on the server
    const articles = await getAllArticles().catch(() => []);
    
    const pillars: Pillar[] = [
        'Compliance & Regulation',
        'Technology & Operations',
        'Practice Management',
        'Client Strategy',
        'Industry Insights',
    ];

    const featuredArticles = pillars
        .map(pillar => articles.find(article => article.pillar === pillar))
        .filter(article => article !== undefined) as Article[];

    if (featuredArticles.length === 0) {
        return null;
    }

    return <HeroCarousel articles={featuredArticles} />;
}