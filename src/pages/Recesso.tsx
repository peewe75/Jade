import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

type Copy = {
  hero: {
    eyebrow: string;
    title: string;
    intro: string;
    cta: string;
  };
  summary: {
    label: string;
    items: [string, string, string, string];
  };
  sections: {
    s1: {
      num: string;
      heading: string;
      p1: string;
      p2a: string;
      contactLink: string;
      p2b: string;
      p3: string;
    };
    s2: {
      num: string;
      heading: string;
      p1: string;
      p2a: string;
      days: string;
      p2b: string;
      p3: string;
    };
    s3: {
      num: string;
      heading: string;
      p1a: string;
      days: string;
      p1b: string;
      p2: string;
      p3: string;
    };
  };
  exceptions: {
    eyebrow: string;
    heading: string;
    intro: string;
    items: [string, string, string];
  };
  form: {
    eyebrow: string;
    heading: string;
    subtitle: string;
    recipientLabel: string;
    emailLabel: string;
    emailLink: string;
    declaration: string;
    orderedReceived: string;
    consumerName: string;
    consumerAddress: string;
    consumerSignature: string;
    date: string;
    footnote: string;
  };
  finalCta: {
    eyebrow: string;
    heading: string;
    contact: string;
    shipping: string;
  };
};

const COPY: Record<'it' | 'en', Copy> = {
  it: {
    hero: {
      eyebrow: 'Tutela del Consumatore',
      title: 'Diritto di Recesso',
      intro:
        'In conformità al D.Lgs. 206/2005 (Codice del Consumo), come modificato dal D.Lgs. 209/2025 in recepimento della Direttiva UE 2023/2673, hai il diritto di recedere dal contratto entro 14 giorni senza fornire alcuna motivazione.',
      cta: 'Recedere dal contratto qui',
    },
    summary: {
      label: 'In Sintesi',
      items: [
        '14 giorni per recedere',
        'Rimborso entro 14 giorni',
        'Reso a spese del consumatore',
        'Modulo standard disponibile',
      ],
    },
    sections: {
      s1: {
        num: '01',
        heading: 'Come Esercitare il Recesso',
        p1: 'Il termine di recesso scade dopo 14 giorni dal giorno in cui tu, o un terzo da te indicato diverso dal vettore, acquisisci il possesso fisico dei beni.',
        p2a: 'Per esercitare il recesso devi informarci con una dichiarazione esplicita (es. e-mail) prima della scadenza del termine. Puoi utilizzare il modulo tipo riportato in fondo a questa pagina oppure inviare una comunicazione scritta ai contatti presenti nella sezione ',
        contactLink: 'Contattaci',
        p2b: '.',
        p3: 'Puoi anche compilare e inviare il modulo di recesso per via elettronica tramite il sito. In tal caso ti trasmetteremo senza indugio una conferma di ricezione su supporto durevole.',
      },
      s2: {
        num: '02',
        heading: 'Effetti del Recesso',
        p1: 'In caso di recesso rimborseremo tutti i pagamenti ricevuti, compresi i costi di consegna (ad eccezione dei costi supplementari se hai scelto una modalità diversa da quella standard meno costosa da noi offerta).',
        p2a: 'Il rimborso sarà effettuato senza indebito ritardo e comunque entro ',
        days: '14 giorni',
        p2b: ' dal giorno in cui siamo informati della decisione di recedere, utilizzando lo stesso mezzo di pagamento usato per la transazione iniziale, salvo accordo diverso. Non ti sarà addebitato alcun costo per il rimborso.',
        p3: 'Possiamo trattenere il rimborso fino alla ricezione dei beni o finché non dimostri di averli rispediti.',
      },
      s3: {
        num: '03',
        heading: 'Restituzione dei Beni',
        p1a: 'Devi restituire i beni senza indebito ritardo e comunque entro ',
        days: '14 giorni',
        p1b: ' dal giorno in cui ci hai comunicato il recesso. Il termine è rispettato se rispedisci i beni prima della scadenza dei 14 giorni.',
        p2: 'I costi diretti della restituzione sono a tuo carico, salvo nostra diversa indicazione. I beni devono essere restituiti nelle stesse condizioni in cui sono stati ricevuti, con etichette e imballaggi originali intatti.',
        p3: 'Risponderai della diminuzione del valore dei beni risultante da una manipolazione diversa da quella necessaria per stabilirne natura, caratteristiche e funzionamento.',
      },
    },
    exceptions: {
      eyebrow: 'Eccezioni',
      heading: 'Esclusioni dal Diritto di Recesso',
      intro: "Ai sensi dell'art. 59 del Codice del Consumo, il diritto di recesso è escluso per:",
      items: [
        'Beni confezionati su misura o personalizzati;',
        'Beni che rischiano di deteriorarsi o scadere rapidamente;',
        'Beni sigillati che non si prestano alla restituzione per motivi igienici o connessi alla protezione della salute e sono stati aperti dopo la consegna (es. biancheria intima, costumi da bagno).',
      ],
    },
    form: {
      eyebrow: 'Allegato I — Parte B',
      heading: 'Modulo Tipo di Recesso',
      subtitle: '(Da compilare e restituire solo se si desidera recedere dal contratto)',
      recipientLabel: 'Destinatario:',
      emailLabel: 'E-mail: ',
      emailLink: 'vedi pagina Contatti',
      declaration:
        'Io/Noi (*) con la presente comunico/comunichiamo (*) che intendo/intendiamo (*) recedere dal mio/nostro (*) contratto di vendita dei seguenti beni (*):',
      orderedReceived: 'Ordinati il (*): _____________ / Ricevuti il (*): _____________',
      consumerName: 'Nome del/dei consumatore(i): _____________________________________',
      consumerAddress: 'Indirizzo del/dei consumatore(i): __________________________________',
      consumerSignature: 'Firma del/dei consumatore(i) (solo se notificato su carta): ____________',
      date: 'Data: _____________',
      footnote: '(*) Cancellare la voce che non interessa.',
    },
    finalCta: {
      eyebrow: 'Hai domande?',
      heading: 'Il nostro team è disponibile per guidarti in ogni fase del processo di reso.',
      contact: 'Contattaci',
      shipping: 'Spedizioni & Resi',
    },
  },
  en: {
    hero: {
      eyebrow: 'Consumer Protection',
      title: 'Right of Withdrawal',
      intro:
        'In accordance with Legislative Decree 206/2005 (Italian Consumer Code), as amended by Legislative Decree 209/2025 implementing Directive (EU) 2023/2673, you have the right to withdraw from the contract within 14 days without giving any reason.',
      cta: 'Withdraw from the contract here',
    },
    summary: {
      label: 'Summary',
      items: [
        '14 days to withdraw',
        'Refund within 14 days',
        'Return at the consumer’s expense',
        'Standard form available',
      ],
    },
    sections: {
      s1: {
        num: '01',
        heading: 'How to Exercise Withdrawal',
        p1: 'The withdrawal period expires 14 days from the day on which you, or a third party indicated by you other than the carrier, acquire physical possession of the goods.',
        p2a: 'To exercise the right of withdrawal you must inform us by means of an explicit statement (e.g. e-mail) before the deadline expires. You may use the model form provided at the bottom of this page or send a written communication to the contacts listed in the ',
        contactLink: 'Contact Us',
        p2b: ' section.',
        p3: 'You may also fill in and submit the withdrawal form electronically through the website. In that case we will promptly send you an acknowledgement of receipt on a durable medium.',
      },
      s2: {
        num: '02',
        heading: 'Effects of Withdrawal',
        p1: 'In the event of withdrawal, we will reimburse all payments received, including delivery costs (with the exception of supplementary costs if you chose a delivery type other than the least expensive standard option offered by us).',
        p2a: 'The refund will be made without undue delay and in any case within ',
        days: '14 days',
        p2b: ' from the day on which we are informed of your decision to withdraw, using the same means of payment used for the initial transaction, unless otherwise agreed. You will not incur any fees for the refund.',
        p3: 'We may withhold the refund until we have received the goods back or until you have supplied evidence of having sent them back.',
      },
      s3: {
        num: '03',
        heading: 'Return of the Goods',
        p1a: 'You must return the goods without undue delay and in any case within ',
        days: '14 days',
        p1b: ' from the day on which you communicated your withdrawal to us. The deadline is met if you send the goods back before the 14-day period has expired.',
        p2: 'The direct cost of returning the goods is borne by you, unless we indicate otherwise. The goods must be returned in the same condition in which they were received, with original labels and packaging intact.',
        p3: 'You will be liable for any diminished value of the goods resulting from handling other than what is necessary to establish their nature, characteristics and functioning.',
      },
    },
    exceptions: {
      eyebrow: 'Exceptions',
      heading: 'Exclusions from the Right of Withdrawal',
      intro:
        'Pursuant to art. 59 of the Italian Consumer Code, the right of withdrawal is excluded for:',
      items: [
        'Goods made to measure or clearly personalised;',
        'Goods which are liable to deteriorate or expire rapidly;',
        'Sealed goods which are not suitable for return for reasons of hygiene or health protection and which were unsealed after delivery (e.g. underwear, swimwear).',
      ],
    },
    form: {
      eyebrow: 'Annex I — Part B',
      heading: 'Model Withdrawal Form',
      subtitle: '(Complete and return this form only if you wish to withdraw from the contract)',
      recipientLabel: 'To:',
      emailLabel: 'E-mail: ',
      emailLink: 'see Contact page',
      declaration:
        'I/We (*) hereby give notice (*) that I/we (*) withdraw from my/our (*) contract of sale of the following goods (*):',
      orderedReceived: 'Ordered on (*): _____________ / Received on (*): _____________',
      consumerName: 'Name of consumer(s): _____________________________________',
      consumerAddress: 'Address of consumer(s): __________________________________',
      consumerSignature: 'Signature of consumer(s) (only if notified on paper): ____________',
      date: 'Date: _____________',
      footnote: '(*) Delete as appropriate.',
    },
    finalCta: {
      eyebrow: 'Questions?',
      heading: 'Our team is available to guide you through every step of the return process.',
      contact: 'Contact Us',
      shipping: 'Shipping & Returns',
    },
  },
};

export default function Recesso() {
  const { i18n } = useTranslation();
  const lang: 'it' | 'en' = i18n.language.startsWith('it') ? 'it' : 'en';
  const c = COPY[lang];

  return (
    <main className="flex-grow bg-brand-white pt-24">
      {/* Hero */}
      <section className="border-b border-black/5 bg-[linear-gradient(180deg,#faf7f1_0%,#ffffff_65%)] px-4 pb-16 pt-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mb-6 text-xs uppercase tracking-[0.35em] text-brand-gold"
          >
            {c.hero.eyebrow}
          </motion.p>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)] lg:items-end">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.08 }}
                className="max-w-4xl text-4xl leading-tight md:text-6xl lg:text-7xl"
              >
                {c.hero.title}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.16 }}
                className="mt-6 max-w-2xl text-base leading-8 text-brand-gray-dark md:text-lg"
              >
                {c.hero.intro}
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.24 }}
                className="mt-8"
              >
                <Link
                  to="/recesso/richiesta"
                  className="btn-premium inline-block border border-brand-black bg-brand-black px-10 py-4 text-xs font-medium uppercase tracking-[0.28em] text-white hover:opacity-90"
                >
                  {c.hero.cta}
                </Link>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55, delay: 0.2 }}
              className="rounded-sm border border-black/10 bg-brand-black p-8 text-white"
            >
              <p className="text-[10px] uppercase tracking-[0.35em] text-white/45">{c.summary.label}</p>
              <ul className="mt-6 space-y-4">
                {c.summary.items.map((item) => (
                  <li key={item} className="border-b border-white/10 pb-4 text-sm uppercase tracking-[0.22em] text-white/85 last:border-b-0 last:pb-0">
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Sections */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-3">

          {/* Section 1 */}
          <motion.article
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5 }}
            className="flex h-full flex-col rounded-sm border border-black/8 bg-[#fcfbf8] p-8"
          >
            <p className="mb-5 text-[10px] uppercase tracking-[0.32em] text-brand-gold">{c.sections.s1.num}</p>
            <h2 className="mb-4 text-3xl">{c.sections.s1.heading}</h2>
            <p className="text-sm leading-7 text-brand-gray-dark">
              {c.sections.s1.p1}
              <br /><br />
              {c.sections.s1.p2a}<Link to="/contact" className="underline underline-offset-2">{c.sections.s1.contactLink}</Link>{c.sections.s1.p2b}
              <br /><br />
              {c.sections.s1.p3}
            </p>
          </motion.article>

          {/* Section 2 */}
          <motion.article
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="flex h-full flex-col rounded-sm border border-black/8 bg-[#fcfbf8] p-8"
          >
            <p className="mb-5 text-[10px] uppercase tracking-[0.32em] text-brand-gold">{c.sections.s2.num}</p>
            <h2 className="mb-4 text-3xl">{c.sections.s2.heading}</h2>
            <p className="text-sm leading-7 text-brand-gray-dark">
              {c.sections.s2.p1}
              <br /><br />
              {c.sections.s2.p2a}<strong>{c.sections.s2.days}</strong>{c.sections.s2.p2b}
              <br /><br />
              {c.sections.s2.p3}
            </p>
          </motion.article>

          {/* Section 3 */}
          <motion.article
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: 0.16 }}
            className="flex h-full flex-col rounded-sm border border-black/8 bg-[#fcfbf8] p-8"
          >
            <p className="mb-5 text-[10px] uppercase tracking-[0.32em] text-brand-gold">{c.sections.s3.num}</p>
            <h2 className="mb-4 text-3xl">{c.sections.s3.heading}</h2>
            <p className="text-sm leading-7 text-brand-gray-dark">
              {c.sections.s3.p1a}<strong>{c.sections.s3.days}</strong>{c.sections.s3.p1b}
              <br /><br />
              {c.sections.s3.p2}
              <br /><br />
              {c.sections.s3.p3}
            </p>
          </motion.article>
        </div>
      </section>

      {/* Eccezioni */}
      <section className="border-t border-black/5 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5 }}
            className="rounded-sm border border-black/8 bg-[#fcfbf8] p-8"
          >
            <p className="mb-4 text-[10px] uppercase tracking-[0.32em] text-brand-gold">{c.exceptions.eyebrow}</p>
            <h2 className="mb-4 text-2xl">{c.exceptions.heading}</h2>
            <p className="mb-4 text-sm leading-7 text-brand-gray-dark">
              {c.exceptions.intro}
            </p>
            <ul className="list-disc pl-5 space-y-2 text-sm leading-7 text-brand-gray-dark">
              {c.exceptions.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* Modulo di Recesso */}
      <section className="border-t border-black/5 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5 }}
          >
            <p className="mb-4 text-[10px] uppercase tracking-[0.32em] text-brand-gold">{c.form.eyebrow}</p>
            <h2 className="mb-6 text-2xl md:text-3xl">{c.form.heading}</h2>
            <p className="mb-6 text-sm text-brand-gray-dark">{c.form.subtitle}</p>

            <div className="rounded-sm border border-black/10 bg-[#fcfbf8] p-8 font-mono text-sm leading-8 text-brand-gray-dark space-y-4 max-w-2xl">
              <p>{c.form.recipientLabel}<br />
              <strong>The Blondes Brand</strong><br />
              theblondesconcept.com<br />
              {c.form.emailLabel}<Link to="/contact" className="underline underline-offset-2">{c.form.emailLink}</Link></p>

              <p>— — —</p>

              <p>
                {c.form.declaration}
              </p>
              <p className="italic">____________________________________________</p>

              <p>{c.form.orderedReceived}</p>

              <p>{c.form.consumerName}</p>

              <p>{c.form.consumerAddress}</p>

              <p>{c.form.consumerSignature}</p>

              <p>{c.form.date}</p>

              <p className="text-[11px] text-brand-gray-dark/60 mt-4">{c.form.footnote}</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand-black px-4 py-16 text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <p className="mb-4 text-[10px] uppercase tracking-[0.35em] text-white/45">{c.finalCta.eyebrow}</p>
            <h2 className="text-3xl md:text-4xl">{c.finalCta.heading}</h2>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/contact"
              className="btn-premium border border-white/15 bg-white px-8 py-3 text-xs font-medium uppercase tracking-[0.28em] text-brand-black"
            >
              {c.finalCta.contact}
            </Link>
            <Link
              to="/shipping-returns"
              className="btn-premium border border-white/20 px-8 py-3 text-xs font-medium uppercase tracking-[0.28em] text-white"
            >
              {c.finalCta.shipping}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
