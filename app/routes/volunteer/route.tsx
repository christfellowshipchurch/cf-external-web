import { useEffect } from 'react';
import { useLocation } from 'react-router';

import { VolunteerHero } from './partials/volunteer-hero.partial';
import { VolunteerHowItWorks } from './partials/volunteer-how-it-works.partial';
import { VolunteerAtChurch } from './partials/volunteer-church.partial';
import { VolunteerCommunity } from './partials/volunteer-community.partial';
import { VolunteerGlobe } from './partials/volunteer-globe.partial';
import { VolunteerStats } from './partials/volunteer-stats.partial';
import { VolunteerTestimonials } from './partials/volunteer-testimonials.partial';
import { VolunteerReadyToMakeADifference } from './partials/volunteer-ready-to-make-a-difference.partial';

export { loader } from './loader';
export { meta } from './meta';

function VolunteerPage() {
  const location = useLocation();

  useEffect(() => {
    // If a user lands on /volunteer with any query (filters), jump to the community section.
    // Examples: /volunteer/?category=Hospitality, /volunteer/?location=...
    if (location.hash) return;

    const q = location.search;
    if (!q || q === '?') return;

    const scroll = () => {
      const el = document.getElementById('community');
      el?.scrollIntoView({ block: 'start' });
    };

    // Ensure sections have rendered before scrolling.
    requestAnimationFrame(() => requestAnimationFrame(scroll));
  }, [location.hash, location.search]);

  return (
    <div>
      <VolunteerHero />
      <VolunteerHowItWorks />
      <VolunteerAtChurch />
      <VolunteerCommunity />
      <VolunteerGlobe />
      <VolunteerStats />
      <VolunteerTestimonials />
      <VolunteerReadyToMakeADifference />
    </div>
  );
}

export default VolunteerPage;
