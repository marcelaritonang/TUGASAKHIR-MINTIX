import React from 'react';
import HeroSection from '../components/home/HeroSection';
import FeaturedConcertsSection from '../components/home/FeaturedConcertsSection';
import HowItWorksSection from '../components/home/HowItWorksSection';
import UpcomingConcertsSection from '../components/home/UpcomingConcertsSection';
import CTASection from '../components/home/CTASection';

const HomePage = () => {
    return (
        <div>
            <HeroSection />
            <FeaturedConcertsSection />
            <HowItWorksSection />
            <UpcomingConcertsSection />
            <CTASection />
        </div>
    );
};

export default HomePage;