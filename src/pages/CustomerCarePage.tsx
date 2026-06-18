import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

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

type CustomerCareContent = {
  eyebrow: string;
  title: string;
  intro: string;
  sections: Array<{ heading: string; body: string }>;
  highlights: string[];
};

const pageContent: Record<CustomerCareVariant, Record<'it' | 'en', CustomerCareContent>> = {
  contact: {
    it: {
      eyebrow: 'Customer Care',
      title: 'Contattaci',
      intro:
        'Il nostro team è a disposizione per domande su collezioni, taglie, ordini e assistenza post-acquisto, con la stessa cura e lo stesso tono che contraddistinguono il brand.',
      sections: [
        {
          heading: 'Assistenza Generale',
          body:
            'Per dettagli sui prodotti, suggerimenti di stile e supporto sugli ordini, contattaci attraverso i canali social ufficiali indicati nel footer oppure rispondi alle comunicazioni relative al tuo ordine. Esaminiamo ogni richiesta con attenzione e rispondiamo con un approccio da boutique.'
        },
        {
          heading: 'Aggiornamenti sugli Ordini',
          body:
            'Se sei in attesa di una spedizione o hai bisogno di assistenza dopo l\'acquisto, indica il numero d\'ordine e il nome utilizzato al checkout, così da gestire la richiesta più rapidamente e con il giusto contesto.'
        },
        {
          heading: 'Stampa & Collaborazioni',
          body:
            'Le richieste editoriali, le collaborazioni e le opportunità retail dovrebbero includere una breve presentazione, le tempistiche ed eventuali note di campagna pertinenti, così da permettere al team di indirizzare internamente la richiesta.'
        }
      ],
      highlights: ['Consigli di stile', 'Supporto sugli ordini', 'Richieste editoriali']
    },
    en: {
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
    }
  },
  shipping: {
    it: {
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
    en: {
      eyebrow: 'Customer Care',
      title: 'Shipping & Returns',
      intro:
        'Every order is prepared with care. Below is a clear overview of shipping, delivery, and returns — including your legal right of withdrawal under Legislative Decree 206/2005 (Italian Consumer Code).',
      sections: [
        {
          heading: 'Preparation Times',
          body:
            'Orders are usually prepared within 1–3 business days. During launches, holiday periods, or limited drops, timing may extend slightly to ensure our quality and packaging standards.'
        },
        {
          heading: 'Shipping and Tracking',
          body:
            'Delivery times depend on the destination and on the carrier\'s conditions. Once your order has shipped, tracking details are shared through the contact information provided at checkout.'
        },
        {
          heading: 'Returns and Right of Withdrawal',
          body:
            'You have the right to withdraw from the contract within 14 days of receiving the goods, without giving any reason (Legislative Decree 206/2005, Italian Consumer Code). Items must be unworn, unwashed, with original tags and packaging intact. For the withdrawal form and full details, see the Right of Withdrawal page.'
        }
      ],
      highlights: ['Preparation 1–3 business days', 'Shipment tracking', 'Withdrawal 14 days (Legislative Decree 206/2005)']
    }
  },
  'size-guide': {
    it: {
      eyebrow: 'Customer Care',
      title: 'Guida alle Taglie',
      intro:
        'Le silhouette The Blondes sono pensate per trasmettere eleganza e sicurezza. Usa questa guida come riferimento rapido prima dell\'acquisto, soprattutto per i capi aderenti o strutturati.',
      sections: [
        {
          heading: 'Come Prendere le Misure',
          body:
            'Misura il busto nel punto più ampio, il punto vita nel punto più stretto e i fianchi nel punto più ampio, mantenendo una postura naturale. Usa un metro morbido e tienilo aderente al corpo senza stringerlo.'
        },
        {
          heading: 'Note sulla Vestibilità',
          body:
            'I capi con sartorialità, struttura a corsetto o costruzione aderente sono pensati per una vestibilità più definita. Se preferisci una silhouette più morbida, valuta la taglia successiva e confronta le tue misure prima di ordinare.'
        },
        {
          heading: 'Hai Bisogno di Aiuto',
          body:
            'Se sei tra due taglie, utilizza la pagina contatti prima di ordinare e indica il prodotto che stai valutando. Questo aiuta il team a guidarti in base al taglio previsto del capo.'
        }
      ],
      highlights: ['Riferimento busto, vita, fianchi', 'Indicazioni per vestibilità sartoriale', 'Supporto prima dell\'acquisto']
    },
    en: {
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
    }
  },
  privacy: {
    it: {
      eyebrow: 'Customer Care',
      title: 'Informativa sulla Privacy',
      intro:
        'Trattiamo i dati dei clienti con discrezione. Questa pagina offre una sintesi pratica di come le informazioni vengono raccolte e utilizzate all\'interno dell\'attuale esperienza online.',
      sections: [
        {
          heading: 'Informazioni che Raccogliamo',
          body:
            'Possiamo raccogliere i dati personali che fornisci direttamente, come iscrizioni alla newsletter, informazioni dell\'account, attività sui preferiti e dati relativi agli ordini necessari per gestire l\'esperienza del negozio.'
        },
        {
          heading: 'Come Vengono Utilizzati',
          body:
            'Le informazioni sono utilizzate per supportare gli acquisti, migliorare l\'esperienza di navigazione, ricordare le preferenze e comunicare aggiornamenti pertinenti relativi al brand o alle tue interazioni con il sito.'
        },
        {
          heading: 'Il Tuo Controllo',
          body:
            'Puoi scegliere di non iscriverti agli aggiornamenti marketing e puoi richiedere assistenza riguardo alle informazioni memorizzate tramite i canali di customer care indicati su questo sito.'
        }
      ],
      highlights: ['Solo dati essenziali per gli ordini', 'Supporto a esperienza e account', 'Controllo sugli aggiornamenti marketing']
    },
    en: {
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
    }
  },
  terms: {
    it: {
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
    en: {
      eyebrow: 'Legal',
      title: 'Terms and Conditions',
      intro:
        'These terms set out the general framework for browsing, purchasing, and interacting with The Blondes online store. For the right of withdrawal, please refer to the dedicated page.',
      sections: [
        {
          heading: 'Use of the Site',
          body:
            'By continuing to browse the site, visitors agree to use its content, images, and services in a lawful manner, without interfering with the performance, security, or presentation of the platform.'
        },
        {
          heading: 'Product Information',
          body:
            'We strive to present products, prices, and descriptions as accurately as possible. Slight differences in colour, finish, or visual rendering may occur due to screens, lighting, and editorial presentation.'
        },
        {
          heading: 'Order Acceptance and Withdrawal',
          body:
            'An order is subject to verification and availability. We reserve the right to refuse, cancel, or adjust orders where necessary. The consumer has the right to withdraw from the contract within 14 days of receiving the goods pursuant to Legislative Decree 206/2005 (Italian Consumer Code). For full details, see the Right of Withdrawal page.'
        }
      ],
      highlights: ['Lawful use of the site', 'Editorial accuracy', 'Guaranteed 14-day withdrawal']
    }
  },
  cookies: {
    it: {
      eyebrow: 'Legale',
      title: 'Cookie Policy',
      intro:
        'I cookie aiutano la boutique a risultare più fluida e personale. Questa pagina spiega, a livello pratico, come supportano la navigazione, le preferenze e le prestazioni.',
      sections: [
        {
          heading: 'Cookie Essenziali',
          body:
            'Alcuni cookie sono utilizzati per mantenere il corretto funzionamento delle parti fondamentali del sito, come la navigazione tra le pagine, la continuità della sessione e le interazioni importanti legate alla navigazione e ai flussi dell\'account.'
        },
        {
          heading: 'Cookie di Preferenza',
          body:
            'I cookie legati alle preferenze possono ricordare scelte come interazioni salvate, visite ripetute o contesto di navigazione, così da rendere l\'esperienza più coerente tra le sessioni.'
        },
        {
          heading: 'Gestione dei Cookie',
          body:
            'I visitatori possono gestire o disabilitare i cookie tramite le impostazioni del browser. Limitare i cookie può influire su alcune funzioni di comodità o rendere meno fluide alcune sezioni dell\'esperienza.'
        }
      ],
      highlights: ['Supporto essenziale alla navigazione', 'Preferenze memorizzate', 'Controllo a livello di browser']
    },
    en: {
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
    }
  },
  accessibility: {
    it: {
      eyebrow: 'Legale',
      title: 'Accessibilità',
      intro:
        'Vogliamo che l\'esperienza online risulti elegante, chiara e fruibile per il maggior numero possibile di visitatori, con un\'attenzione costante a leggibilità, navigazione e comfort di interazione.',
      sections: [
        {
          heading: 'Intento di Design',
          body:
            'Layout, tipografia, spaziature e schemi di navigazione sono progettati per favorire la chiarezza su desktop e mobile, preservando al contempo l\'identità visiva del brand.'
        },
        {
          heading: 'Miglioramento Continuo',
          body:
            'L\'accessibilità è trattata come un processo continuo. Esaminiamo interazioni, contrasto, struttura e responsività per migliorare l\'esperienza man mano che il sito evolve.'
        },
        {
          heading: 'Hai Bisogno di Supporto',
          body:
            'Se una pagina, un\'interazione o un contenuto crea difficoltà, ti invitiamo a utilizzare il canale di customer care, così da poter esaminare e migliorare il problema con un contesto d\'uso reale.'
        }
      ],
      highlights: ['Interfacce leggibili', 'Miglioramenti continui', 'Supporto guidato dai feedback']
    },
    en: {
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
  }
};

const layoutCopy: Record<'it' | 'en', {
  atAGlance: string;
  nextStep: string;
  ctaTitle: string;
  exploreShop: string;
  contactCare: string;
}> = {
  it: {
    atAGlance: 'In Sintesi',
    nextStep: 'Prossimo Passo',
    ctaTitle: 'Continua a esplorare la collezione mentre il customer care resta a un solo clic di distanza.',
    exploreShop: 'Esplora lo Shop',
    contactCare: 'Contattaci'
  },
  en: {
    atAGlance: 'At a Glance',
    nextStep: 'Next Step',
    ctaTitle: 'Keep exploring the collection while customer care stays one click away.',
    exploreShop: 'Explore Shop',
    contactCare: 'Contact Care'
  }
};

export default function CustomerCarePage({ variant }: CustomerCarePageProps) {
  const { i18n } = useTranslation();
  const lang: 'it' | 'en' = i18n.language.startsWith('it') ? 'it' : 'en';
  const content = pageContent[variant][lang];
  const l = layoutCopy[lang];

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
              <p className="text-[10px] uppercase tracking-[0.35em] text-white/45">{l.atAGlance}</p>
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
            <p className="mb-4 text-[10px] uppercase tracking-[0.35em] text-white/45">{l.nextStep}</p>
            <h2 className="text-3xl md:text-4xl">{l.ctaTitle}</h2>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/shop"
              className="btn-premium border border-white/15 bg-white px-8 py-3 text-xs font-medium uppercase tracking-[0.28em] text-brand-black"
            >
              {l.exploreShop}
            </Link>
            <Link
              to="/contact"
              className="btn-premium border border-white/20 px-8 py-3 text-xs font-medium uppercase tracking-[0.28em] text-white"
            >
              {l.contactCare}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
