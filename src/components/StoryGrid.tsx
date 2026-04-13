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
    image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=800&auto=format&fit=crop'
  },
  {
    id: '2',
    label: 'Collection',
    title: 'Spring Edit',
    link: '/shop',
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=800&auto=format&fit=crop'
  },
  {
    id: '3',
    label: 'Journal',
    title: 'Style Notes',
    link: '/shop',
    image: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?q=80&w=800&auto=format&fit=crop'
  }
];

export default function StoryGrid() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
              <div className="relative aspect-[3/4] overflow-hidden mb-4">
                <img
                  src={story.image}
                  alt={story.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  referrerPolicy="no-referrer"
                />
              </div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-2">{story.label}</p>
              <h3 className="text-lg font-serif group-hover:underline underline-offset-4 decoration-1">
                {story.title}
              </h3>
            </Link>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
