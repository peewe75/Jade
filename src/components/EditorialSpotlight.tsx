import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

export default function EditorialSpotlight() {
  return (
    <section className="py-28 md:py-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div className="relative aspect-[4/5] overflow-hidden bg-gray-100">
            <img
              src="https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1200&auto=format&fit=crop"
              alt="Editorial Spotlight"
              className="w-full h-full object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <p className="text-[11px] uppercase tracking-[0.35em] text-gray-500 mb-5">Editorial Spotlight</p>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif mb-6 leading-[0.95]">
            A Softer Take on<br />
            <span className="italic">Modern Dressing</span>
          </h2>
          <p className="text-gray-600 text-sm md:text-[15px] leading-relaxed mb-8 max-w-md">
            Quiet silhouettes, refined movement and pieces designed to feel effortless from
            morning light to late plans. A wardrobe edited with confidence, never excess.
          </p>
          <Link
            to="/shop"
            className="inline-block border border-brand-black px-8 py-3 text-[11px] uppercase tracking-[0.28em] hover:bg-brand-black hover:text-white transition-colors"
          >
            Shop Collection
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
