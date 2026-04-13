import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

export default function LookFeature() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="order-2 lg:order-1"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-4">The Look</p>
          <h2 className="text-4xl md:text-5xl font-serif mb-6 leading-tight">
            Complete the<br />
            <span className="italic">Ensemble</span>
          </h2>
          <p className="text-gray-600 text-sm leading-relaxed mb-8 max-w-md">
            Crafted from the finest materials, each piece tells a story of quality 
            and attention to detail. Discover the look that defines the season.
          </p>
          <Link
            to="/shop"
            className="inline-block border border-brand-black px-8 py-3 text-xs uppercase tracking-widest hover:bg-brand-black hover:text-white transition-colors"
          >
            Shop The Look
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="order-1 lg:order-2"
        >
          <div className="relative aspect-[3/4] overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=1200&auto=format&fit=crop"
              alt="Look Feature"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}