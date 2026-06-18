import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

export default function Recesso() {
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
            Tutela del Consumatore
          </motion.p>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)] lg:items-end">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.08 }}
                className="max-w-4xl text-4xl leading-tight md:text-6xl lg:text-7xl"
              >
                Diritto di Recesso
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.16 }}
                className="mt-6 max-w-2xl text-base leading-8 text-brand-gray-dark md:text-lg"
              >
                In conformità al D.Lgs. 206/2005 (Codice del Consumo), come modificato dal D.Lgs. 209/2025 in recepimento della Direttiva UE 2023/2673, hai il diritto di recedere dal contratto entro 14 giorni senza fornire alcuna motivazione.
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
                  Recedere dal contratto qui
                </Link>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55, delay: 0.2 }}
              className="rounded-sm border border-black/10 bg-brand-black p-8 text-white"
            >
              <p className="text-[10px] uppercase tracking-[0.35em] text-white/45">In Sintesi</p>
              <ul className="mt-6 space-y-4">
                {['14 giorni per recedere', 'Rimborso entro 14 giorni', 'Reso a spese del consumatore', 'Modulo standard disponibile'].map((item) => (
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
            <p className="mb-5 text-[10px] uppercase tracking-[0.32em] text-brand-gold">01</p>
            <h2 className="mb-4 text-3xl">Come Esercitare il Recesso</h2>
            <p className="text-sm leading-7 text-brand-gray-dark">
              Il termine di recesso scade dopo 14 giorni dal giorno in cui tu, o un terzo da te indicato diverso dal vettore, acquisisci il possesso fisico dei beni.
              <br /><br />
              Per esercitare il recesso devi informarci con una dichiarazione esplicita (es. e-mail) prima della scadenza del termine. Puoi utilizzare il modulo tipo riportato in fondo a questa pagina oppure inviare una comunicazione scritta ai contatti presenti nella sezione <Link to="/contact" className="underline underline-offset-2">Contattaci</Link>.
              <br /><br />
              Puoi anche compilare e inviare il modulo di recesso per via elettronica tramite il sito. In tal caso ti trasmetteremo senza indugio una conferma di ricezione su supporto durevole.
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
            <p className="mb-5 text-[10px] uppercase tracking-[0.32em] text-brand-gold">02</p>
            <h2 className="mb-4 text-3xl">Effetti del Recesso</h2>
            <p className="text-sm leading-7 text-brand-gray-dark">
              In caso di recesso rimborseremo tutti i pagamenti ricevuti, compresi i costi di consegna (ad eccezione dei costi supplementari se hai scelto una modalità diversa da quella standard meno costosa da noi offerta).
              <br /><br />
              Il rimborso sarà effettuato senza indebito ritardo e comunque entro <strong>14 giorni</strong> dal giorno in cui siamo informati della decisione di recedere, utilizzando lo stesso mezzo di pagamento usato per la transazione iniziale, salvo accordo diverso. Non ti sarà addebitato alcun costo per il rimborso.
              <br /><br />
              Possiamo trattenere il rimborso fino alla ricezione dei beni o finché non dimostri di averli rispediti.
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
            <p className="mb-5 text-[10px] uppercase tracking-[0.32em] text-brand-gold">03</p>
            <h2 className="mb-4 text-3xl">Restituzione dei Beni</h2>
            <p className="text-sm leading-7 text-brand-gray-dark">
              Devi restituire i beni senza indebito ritardo e comunque entro <strong>14 giorni</strong> dal giorno in cui ci hai comunicato il recesso. Il termine è rispettato se rispedisci i beni prima della scadenza dei 14 giorni.
              <br /><br />
              I costi diretti della restituzione sono a tuo carico, salvo nostra diversa indicazione. I beni devono essere restituiti nelle stesse condizioni in cui sono stati ricevuti, con etichette e imballaggi originali intatti.
              <br /><br />
              Risponderai della diminuzione del valore dei beni risultante da una manipolazione diversa da quella necessaria per stabilirne natura, caratteristiche e funzionamento.
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
            <p className="mb-4 text-[10px] uppercase tracking-[0.32em] text-brand-gold">Eccezioni</p>
            <h2 className="mb-4 text-2xl">Esclusioni dal Diritto di Recesso</h2>
            <p className="mb-4 text-sm leading-7 text-brand-gray-dark">
              Ai sensi dell'art. 59 del Codice del Consumo, il diritto di recesso è escluso per:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-sm leading-7 text-brand-gray-dark">
              <li>Beni confezionati su misura o personalizzati;</li>
              <li>Beni che rischiano di deteriorarsi o scadere rapidamente;</li>
              <li>Beni sigillati che non si prestano alla restituzione per motivi igienici o connessi alla protezione della salute e sono stati aperti dopo la consegna (es. biancheria intima, costumi da bagno).</li>
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
            <p className="mb-4 text-[10px] uppercase tracking-[0.32em] text-brand-gold">Allegato I — Parte B</p>
            <h2 className="mb-6 text-2xl md:text-3xl">Modulo Tipo di Recesso</h2>
            <p className="mb-6 text-sm text-brand-gray-dark">(Da compilare e restituire solo se si desidera recedere dal contratto)</p>

            <div className="rounded-sm border border-black/10 bg-[#fcfbf8] p-8 font-mono text-sm leading-8 text-brand-gray-dark space-y-4 max-w-2xl">
              <p>Destinatario:<br />
              <strong>The Blondes Brand</strong><br />
              theblondesconcept.com<br />
              E-mail: <Link to="/contact" className="underline underline-offset-2">vedi pagina Contatti</Link></p>

              <p>— — —</p>

              <p>
                Io/Noi (*) con la presente comunico/comunichiamo (*) che intendo/intendiamo (*) recedere dal mio/nostro (*) contratto di vendita dei seguenti beni (*):
              </p>
              <p className="italic">____________________________________________</p>

              <p>Ordinati il (*): _____________ / Ricevuti il (*): _____________</p>

              <p>Nome del/dei consumatore(i): _____________________________________</p>

              <p>Indirizzo del/dei consumatore(i): __________________________________</p>

              <p>Firma del/dei consumatore(i) (solo se notificato su carta): ____________</p>

              <p>Data: _____________</p>

              <p className="text-[11px] text-brand-gray-dark/60 mt-4">(*) Cancellare la voce che non interessa.</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand-black px-4 py-16 text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <p className="mb-4 text-[10px] uppercase tracking-[0.35em] text-white/45">Hai domande?</p>
            <h2 className="text-3xl md:text-4xl">Il nostro team è disponibile per guidarti in ogni fase del processo di reso.</h2>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/contact"
              className="btn-premium border border-white/15 bg-white px-8 py-3 text-xs font-medium uppercase tracking-[0.28em] text-brand-black"
            >
              Contattaci
            </Link>
            <Link
              to="/shipping-returns"
              className="btn-premium border border-white/20 px-8 py-3 text-xs font-medium uppercase tracking-[0.28em] text-white"
            >
              Spedizioni & Resi
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
