import React from 'react';
import Header from '../components/layout/Header';
import Hero from '../components/layout/Hero';
import Features from '../components/layout/Features';
import HowItWorks from '../components/layout/HowItWorks';
import Testimonials from '../components/layout/Testimonials';
import Footer from '../components/layout/Footer';

const LandingPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-dark-900">
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
