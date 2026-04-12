import Hero from '../components/Hero';
import Marquee from '../components/Marquee';
import FeaturedProducts from '../components/FeaturedProducts';

export default function Home() {
  return (
    <main className="flex-grow">
      <Hero />
      <Marquee />
      <FeaturedProducts />
    </main>
  );
}
