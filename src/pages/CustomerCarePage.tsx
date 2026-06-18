import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

type CustomerCareVariant =
  | 'contact'
  | 'shipping'
  | 'size-guide'
  | 'privacy'
  | 'terms'
  | 'cookies'
  | 'accessibility';

type CustomerCarePageProps = {
  variant: CustomerCareVariant;
};

const pageContent: Record<CustomerCareVariant, {
  eyebrow: string;
  title: string;
  intro: string;
  sections: Array<{ heading: string; body: string }>;
  highlights: string[];
}> = {
  contact: {
    eyebrow: 'Customer Care',
    title: 'Contact Us',
    intro:
      'Our team is here to support questions about collections, sizing, orders, and post-purchase assistance with the same considered tone as the brand.',
    sections: [
      {
        heading: 'General Assistance',
        body:
          'For product details, styling suggestions, and order support, reach out through the official social channels listed in the footer or reply to your order communications. We review requests carefully and answer with a boutique-level approach.'
      },
      {
        heading: 'Order Updates',
        body:
          'If you are waiting for a shipment or need help after purchase, include your order number and the name used at checkout so the request can be handled faster and with the right context.'
      },
      {
        heading: 'Press & Partnerships',
        body:
          'Editorial requests, collaborations, and retail opportunities should include a short introduction, timeline, and any relevant campaign notes so the team can route the enquiry internally.'
      }
    ],
    highlights: ['Styling advice', 'Order support', 'Editorial enquiries']
  },
  shipping: {
    eyebrow: 'Customer Care',
    title: 'Spedizioni & Resi',
    intro:
      'Ogni ordine è preparato con cura. Di seguito una panoramica chiara su spedizione, consegna e resi — incluso il tuo diritto legale di recesso ai sensi del D.Lgs. 206/2005.',
    sections: [
      {
        heading: 'Tempi di Preparazione',
        body:
          'Gli ordini sono solitamente preparati entro 1–3 giorni lavorativi. Durante i lanci, i periodi festivi o i drop limitati, i tempi possono prolungarsi leggermente per garantire gli standard di qualità e confezionamento.'
      },
      {
        heading: 'Spedizione e Tracking',
        body:
          'I tempi di consegna dipendono dalla destinazione e dalle condizioni del corriere. Una volta spedito l\'ordine, i dettagli di tracking vengono condivisi tramite i recapiti forniti al checkout.'
      },
      {
        heading: 'Resi e Diritto di Recesso',
        body:
          'Hai diritto di recedere dal contratto entro 14 giorni dalla ricezione dei beni, senza fornire alcuna motivazione (D.Lgs. 206/2005). I capi devono essere non indossati, non lavati, con etichette e imballaggi originali intatti. Per il modulo di recesso e tutti i dettagli, consulta la pagina Diritto di Recesso.'
      }
    ],
    highlights: ['Preparazione 1–3 gg lavorativi', 'Tracking spedizione', 'Recesso 14 giorni (D.Lgs. 206/2005)']
  },
  'size-guide': {
    eyebrow: 'Customer Care',
    title: 'Size Guide',
    intro:
      'The Blondes silhouettes are designed to feel elegant and confident. Use this guide as a quick reference before purchase, especially for fitted or structured pieces.',
    sections: [
      {
        heading: 'How To Measure',
        body:
          'Measure bust at the fullest point, waist at the narrowest point, and hips at the fullest point while standing naturally. Use a soft measuring tape and keep it close to the body without pulling tight.'
      },
      {
        heading: 'Fit Notes',
        body:
          'Pieces with tailoring, corsetry, or body-skimming construction are intended for a more defined fit. If you prefer a softer silhouette, consider the next size up and compare your measurements before ordering.'
      },
      {
        heading: 'Need Help Choosing',
        body:
          'If you are between sizes, use the contact page before ordering and mention the product you are considering. This helps the team guide you based on the intended cut of the garment.'
      }
    ],
    highlights: ['Bust, waist, hips reference', 'Tailored fit guidance', 'Support before purchase']
  },
  privacy: {
    eyebrow: 'Customer Care',
    title: 'Privacy Policy',
    intro:
      'We treat customer data with discretion. This page offers a practical summary of how information is collected and used within the current online experience.',
    sections: [
      {
        heading: 'Information We Collect',
        body:
          'We may collect personal details you submit directly, such as newsletter signups, account information, favorites activity, and order-related data needed to operate the store experience.'
      },
      {
        heading: 'How It Is Used',
        body:
          'Information is used to support purchases, improve the browsing experience, remember preferences, and communicate relevant updates related to the brand or your interactions with the site.'
      },
      {
        heading: 'Your Control',
        body:
          'You can choose not to subscribe to marketing updates, and you may request support regarding your stored information through the customer care channels shared on this website.'
      }
    ],
    highlights: ['Essential order data only', 'Experience and account support', 'Control over marketing updates']
  },
  terms: {
    eyebrow: 'Legale',
    title: 'Termini e Condizioni',
    intro:
      'Questi termini definiscono il quadro generale per la navigazione, l\'acquisto e l\'interazione con il negozio online The Blondes. Per il diritto di recesso si rimanda alla pagina dedicata.',
    sections: [
      {
        heading: 'Uso del Sito',
        body:
          'Continuando a navigare il sito, i visitatori accettano di utilizzarne contenuti, immagini e servizi in modo lecito, senza interferire con le prestazioni, la sicurezza o la presentazione della piattaforma.'
      },
      {
        heading: 'Informazioni sui Prodotti',
        body:
          'Ci impegniamo a presentare prodotti, prezzi e descrizioni nel modo più accurato possibile. Lievi differenze di colore, finitura o resa visiva possono verificarsi a causa di schermi, illuminazione e presentazione editoriale.'
      },
      {
        heading: 'Accettazione degli Ordini e Recesso',
        body:
          'Un ordine è soggetto a verifica e disponibilità. Ci riserviamo di rifiutare, annullare o rettificare ordini se necessario. Il consumatore ha diritto di recedere dal contratto entro 14 giorni dalla ricezione dei beni ai sensi del D.Lgs. 206/2005. Per dettagli completi consulta la pagina Diritto di Recesso.'
      }
    ],
    highlights: ['Uso lecito del sito', 'Accuratezza editoriale', 'Recesso 14 giorni garantito']
  },
  cookies: {
    eyebrow: 'Legal',
    title: 'Cookie Policy',
    intro:
      'Cookies help the boutique feel smoother and more personal. This page explains, at a practical level, how they support navigation, preferences, and performance.',
    sections: [
      {
        heading: 'Essential Cookies',
        body:
          'Some cookies are used to keep core parts of the site functioning correctly, such as page navigation, session continuity, and important user interactions tied to browsing and account flows.'
      },
      {
        heading: 'Preference Cookies',
        body:
          'Preference-related cookies may remember choices such as saved interactions, repeat visits, or browsing context so the experience feels more consistent across sessions.'
      },
      {
        heading: 'Managing Cookies',
        body:
          'Visitors can manage or disable cookies through browser settings. Limiting cookies may affect certain convenience features or make some sections of the experience less fluid.'
      }
    ],
    highlights: ['Essential browsing support', 'Remembered preferences', 'Browser-level control']
  },
  accessibility: {
    eyebrow: 'Legal',
    title: 'Accessibility',
    intro:
      'We want the online experience to feel elegant, clear, and usable for as many visitors as possible, with ongoing attention to readability, navigation, and interaction comfort.',
    sections: [
      {
        heading: 'Design Intent',
        body:
          'Layouts, typography, spacing, and navigation patterns are designed to support clarity across desktop and mobile while preserving the visual identity of the brand.'
      },
      {
        heading: 'Continuous Improvement',
        body:
          'Accessibility is treated as an ongoing process. We review interactions, contrast, structure, and responsiveness to improve the experience as the site evolves.'
      },
      {
        heading: 'Need Support',
        body:
          'If any page, interaction, or content creates difficulty, please use the customer care contact route so the issue can be reviewed and improved with real user context.'
      }
    ],
    highlights: ['Readable interfaces', 'Ongoing improvements', 'Feedback-led support']
  }
};

export default function CustomerCarePage({ variant }: CustomerCarePageProps) {
  const content = pageContent[variant];

  return (
    <main className="flex-grow bg-brand-white pt-24">
      <section className="border-b border-black/5 bg-[linear-gradient(180deg,#faf7f1_0%,#ffffff_65%)] px-4 pb-16 pt-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mb-6 text-xs uppercase tracking-[0.35em] text-brand-gold"
          >
            {content.eyebrow}
          </motion.p>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)] lg:items-end">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.08 }}
                className="max-w-4xl text-4xl leading-tight md:text-6xl lg:text-7xl"
              >
                {content.title}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.16 }}
                className="mt-6 max-w-2xl text-base leading-8 text-brand-gray-dark md:text-lg"
              >
                {content.intro}
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55, delay: 0.2 }}
              className="rounded-sm border border-black/10 bg-brand-black p-8 text-white"
            >
              <p className="text-[10px] uppercase tracking-[0.35em] text-white/45">At a Glance</p>
              <ul className="mt-6 space-y-4">
                {content.highlights.map((highlight) => (
                  <li key={highlight} className="border-b border-white/10 pb-4 text-sm uppercase tracking-[0.22em] text-white/85 last:border-b-0 last:pb-0">
                    {highlight}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-3">
          {content.sections.map((section, index) => (
            <motion.article
              key={section.heading}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              className="flex h-full flex-col rounded-sm border border-black/8 bg-[#fcfbf8] p-8"
            >
              <p className="mb-5 text-[10px] uppercase tracking-[0.32em] text-brand-gold">
                0{index + 1}
              </p>
              <h2 className="mb-4 text-3xl">{section.heading}</h2>
              <p className="text-sm leading-7 text-brand-gray-dark">{section.body}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="bg-brand-black px-4 py-16 text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <p className="mb-4 text-[10px] uppercase tracking-[0.35em] text-white/45">Next Step</p>
            <h2 className="text-3xl md:text-4xl">Keep exploring the collection while customer care stays one click away.</h2>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/shop"
              className="btn-premium border border-white/15 bg-white px-8 py-3 text-xs font-medium uppercase tracking-[0.28em] text-brand-black"
            >
              Explore Shop
            </Link>
            <Link
              to="/contact"
              className="btn-premium border border-white/20 px-8 py-3 text-xs font-medium uppercase tracking-[0.28em] text-white"
            >
              Contact Care
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
