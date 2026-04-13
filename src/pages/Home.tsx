import Hero from '../components/Hero';
import Marquee from '../components/Marquee';
import FeaturedProducts from '../components/FeaturedProducts';
import EditorialSpotlight from '../components/EditorialSpotlight';
import StoryGrid from '../components/StoryGrid';
import LookFeature from '../components/LookFeature';
import CommunitySection from '../components/CommunitySection';
import ClosingCta from '../components/ClosingCta';

export default function Home() {
  return (
    <main className="flex-grow">
      <Hero />
      <Marquee />
      <FeaturedProducts />
      <EditorialSpotlight />
      <StoryGrid />
      <LookFeature />
      <CommunitySection />
      <ClosingCta />
    </main>
  );
}
