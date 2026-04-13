import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

export default function EditorialSpotlight() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div className="relative aspect-[4/5] overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1200&auto=format&fit=crop"
              alt="Editorial Spotlight"
              className="w-full h-full object-cover"
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
          <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-4">Editorial</p>
          <h2 className="text-4xl md:text-5xl font-serif mb-6 leading-tight">
            The Art of<br />
            <span className="italic">Effortless</span> Style
          </h2>
          <p className="text-gray-600 text-sm leading-relaxed mb-8 max-w-md">
            Discover our latest editorial featuring clean lines, timeless silhouettes, 
            and the quiet confidence that defines the modern wardrobe. 
            Where luxury meets simplicity.
          </p>
          <Link
            to="/shop"
            className="inline-block border border-brand-black px-8 py-3 text-xs uppercase tracking-widest hover:bg-brand-black hover:text-white transition-colors"
          >
            Shop Collection
          </Link>
        </motion.div>
      </div>
    </section>
  );
}