import React from 'react';
import Header from '../components/layout/Header';
import Hero from '../components/layout/Hero';
import Features from '../components/layout/Features';
import HowItWorks from '../components/layout/HowItWorks';
import Testimonials from '../components/layout/Testimonials';
import Footer from '../components/layout/Footer';
import SEOHead from '../components/seo/SEOHead';

const LandingPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-dark-900">
            <SEOHead
                title="BattleXGround — India's #1 Esports Tournament Platform | Compete. Win. Earn."
                description="Join BattleXGround, India's premier competitive gaming platform. Compete in daily PUBG, Free Fire, Valorant & COD tournaments and win real cash prizes. Register free today!"
                path="/"
                jsonLd={[
                    {
                        '@context': 'https://schema.org',
                        '@type': 'Organization',
                        name: 'BattleXGround',
                        url: 'https://battlexground.com',
                        logo: 'https://battlexground.com/images/battlexground-logo.png',
                        description: 'India\'s premier competitive gaming & esports tournament platform.',
                        foundingDate: '2025',
                        contactPoint: {
                            '@type': 'ContactPoint',
                            contactType: 'customer support',
                            url: 'https://battlexground.com/contact',
                        },
                    },
                    {
                        '@context': 'https://schema.org',
                        '@type': 'WebSite',
                        name: 'BattleXGround',
                        url: 'https://battlexground.com',
                        potentialAction: {
                            '@type': 'SearchAction',
                            target: 'https://battlexground.com/tournaments?q={search_term_string}',
                            'query-input': 'required name=search_term_string',
                        },
                    },
                ]}
            />
            <Header />
            <Hero />
            <Features />
            <HowItWorks />
            <Testimonials />
            <Footer />
        </div>
    );
};

export default LandingPage;
