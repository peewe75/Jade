import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

interface Artisan {
  name: string;
  bio: string;
  photoUrl?: string;
}

interface Material {
  label: string;
  origin?: string;
  description?: string;
}

interface MediaItem {
  type: 'image' | 'video';
  url: string;
  caption?: string;
}

export interface Story {
  craft?: string;
  artisan?: Artisan;
  materials?: Material[];
  makingMedia?: MediaItem[];
}

interface Props {
  story: Story;
}

const fadeIn = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.7 },
};

export default function ProductStory({ story }: Props) {
  const { t } = useTranslation();
  const { craft, artisan, materials, makingMedia } = story;

  const hasContent = craft || artisan || (materials && materials.length > 0) || (makingMedia && makingMedia.length > 0);
  if (!hasContent) return null;

  return (
    <section className="mt-24 border-t border-gray-100 pt-20 space-y-24">

      {/* Craft */}
      {craft && (
        <motion.div {...fadeIn} className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-gray-400 mb-4">{t('product.craft')}</p>
            <p className="text-gray-600 text-sm md:text-[15px] leading-relaxed max-w-md">{craft}</p>
          </div>
          <div className="h-[1px] bg-gray-100 lg:hidden" />
        </motion.div>
      )}

      {/* Artisan */}
      {artisan && (
        <motion.div {...fadeIn} className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
          {artisan.photoUrl && (
            <div className="relative aspect-[4/5] overflow-hidden bg-gray-100 order-last lg:order-first">
              <img
                src={artisan.photoUrl}
                alt={artisan.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          )}
          <div className={artisan.photoUrl ? '' : 'lg:col-span-2 max-w-2xl'}>
            <p className="text-[11px] uppercase tracking-[0.35em] text-gray-400 mb-4">{t('product.artisan')}</p>
            <h3 className="text-3xl font-serif mb-4">{artisan.name}</h3>
            <p className="text-gray-600 text-sm md:text-[15px] leading-relaxed">{artisan.bio}</p>
          </div>
        </motion.div>
      )}

      {/* Materials */}
      {materials && materials.length > 0 && (
        <motion.div {...fadeIn}>
          <p className="text-[11px] uppercase tracking-[0.35em] text-gray-400 mb-8">{t('product.materials')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {materials.map((m, i) => (
              <div key={i} className="border border-gray-100 p-6">
                <p className="text-sm font-medium uppercase tracking-widest mb-1">{m.label}</p>
                {m.origin && <p className="text-[11px] text-gray-400 uppercase tracking-widest mb-2">{m.origin}</p>}
                {m.description && <p className="text-xs text-gray-500 leading-relaxed">{m.description}</p>}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Making Media */}
      {makingMedia && makingMedia.length > 0 && (
        <motion.div {...fadeIn}>
          <p className="text-[11px] uppercase tracking-[0.35em] text-gray-400 mb-8">{t('product.story')}</p>
          <div className={`grid gap-4 ${makingMedia.length === 1 ? 'grid-cols-1' : makingMedia.length === 2 ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-3'}`}>
            {makingMedia.map((m, i) => (
              <div key={i} className="overflow-hidden bg-gray-100 aspect-[4/5]">
                {m.type === 'video' ? (
                  <video
                    src={m.url}
                    className="w-full h-full object-cover"
                    autoPlay
                    loop
                    muted
                    playsInline
                  />
                ) : (
                  <img
                    src={m.url}
                    alt={m.caption ?? ''}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </section>
  );
}
