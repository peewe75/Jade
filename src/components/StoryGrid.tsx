import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

interface StoryItem {
  id: string;
  label: string;
  title: string;
  link: string;
  image: string;
}

const stories: StoryItem[] = [
  {
    id: '1',
    label: 'The Brand',
    title: 'Our Heritage',
    link: '/about',
    image: '/images/18.jpeg'
  },
  {
    id: '2',
    label: 'Collection',
    title: 'Spring Edit',
    link: '/shop',
    image: '/images/20.jpeg'
  },
  {
    id: '3',
    label: 'Journal',
    title: 'Style Notes',
    link: '/shop',
    image: '/images/21.jpeg'
  }
];

export default function StoryGrid() {
  return (
    <section className="py-28 md:py-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="text-center max-w-2xl mx-auto mb-14 md:mb-16">
        <p className="text-[11px] uppercase tracking-[0.35em] text-gray-500 mb-4">Editorial Notes</p>
        <h2 className="text-3xl md:text-4xl font-serif mb-4">A Wardrobe With A Point of View</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          Brand stories, seasonal edits and style ideas designed to keep the page feeling
          curated rather than crowded.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
        {stories.map((story, index) => (
          <motion.article
            key={story.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: index * 0.15 }}
            className="group cursor-pointer"
          >
            <Link to={story.link}>
              <div className="relative aspect-[3/4] overflow-hidden mb-5 bg-gray-100">
                <img
                  src={story.image}
                  alt={story.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              </div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-gray-400 mb-2">{story.label}</p>
              <h3 className="text-xl font-serif group-hover:underline underline-offset-4 decoration-1">
                {story.title}
              </h3>
            </Link>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
