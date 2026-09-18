import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import './styles.css';

gsap.registerPlugin(ScrollTrigger);

const scenarios = [
  { role: 'Researcher', quote: 'Circle the claim, connect the evidence, keep the thought exactly where it started.' },
  { role: 'Designer', quote: 'Mark the interface in context without copying screenshots into another tool.' },
  { role: 'Student', quote: 'Turn explanations from an AI chat into a page you can actively think on.' },
];

function App() {
  const root = useRef<HTMLElement>(null);
  const desire = useRef<HTMLElement>(null);
  const [scenario, setScenario] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    const context = gsap.context(() => {
      const words = gsap.utils.toArray<HTMLElement>('.reveal-word');
      gsap.fromTo(words, { opacity: 0.12 }, { opacity: 1, stagger: 0.08, ease: 'none', scrollTrigger: { trigger: '.reveal-copy', start: 'top 78%', end: 'bottom 44%', scrub: 0.6 } });
      if (innerWidth > 900 && desire.current) {
        ScrollTrigger.create({ trigger: desire.current, start: 'top 96px', end: 'bottom bottom', pin: '.desire-heading', pinSpacing: false });
      }
      gsap.utils.toArray<HTMLElement>('.workflow-card').forEach((card) => {
        gsap.fromTo(card, { y: 70, scale: 0.94, opacity: 0.25 }, { y: 0, scale: 1, opacity: 1, scrollTrigger: { trigger: card, start: 'top 90%', end: 'top 54%', scrub: 0.5 } });
      });
    }, root);
    return () => context.revert();
  }, [reduceMotion]);

  const rotate = (direction: number) => setScenario((value) => (value + direction + scenarios.length) % scenarios.length);
  const reveal = 'Your ideas stay connected to the page that sparked them, while the web beneath remains fully usable.'.split(' ');

  return (
    <main ref={root} className="site-shell">
      <motion.nav className="nav" aria-label="Primary navigation" initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .65, ease: [0.22, 1, 0.36, 1] }}>
        <a className="brand" href="#top" aria-label="DrawMe home"><span className="brand-mark" />DrawMe</a>
        <div className="nav-links"><a href="#tools">Tools</a><a href="#workflow">Workflow</a></div>
        <a className="nav-cta" href="#start">Start drawing</a>
      </motion.nav>

      <section id="top" className="hero chapter">
        <motion.div className="hero-copy" initial={reduceMotion ? false : { y: 46, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: .9, ease: [0.16, 1, 0.3, 1] }}>
          <p className="eyebrow">The web becomes your notebook</p>
          <h1>Think directly on the page in front of you.</h1>
          <p className="hero-lede">Draw, highlight, shape, and explain across chats, articles, and everyday websites without breaking their natural flow.</p>
          <div className="hero-actions"><motion.a whileHover={reduceMotion ? undefined : { y: -3, scale: 1.02 }} whileTap={{ scale: .98 }} transition={{ type: 'spring', stiffness: 360, damping: 24 }} className="button primary" href="#start">See how it works</motion.a><motion.a whileHover={reduceMotion ? undefined : { y: -3, scale: 1.02 }} whileTap={{ scale: .98 }} transition={{ type: 'spring', stiffness: 360, damping: 24 }} className="button secondary" href="#tools">Explore the toolkit</motion.a></div>
        </motion.div>
        <motion.div className="hero-visual group" initial={reduceMotion ? false : { scale: .9, opacity: 0, rotate: 1.5 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} whileHover={reduceMotion ? undefined : { y: -6, scale: 1.01 }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}>
          <img src="/assets/gesture-field.svg" alt="Abstract annotation strokes layered over a dark digital canvas" />
          <div className="floating-toolbar" aria-hidden="true"><span /><span /><span className="active" /><span /><span /></div>
        </motion.div>
      </section>

      <div className="marquee" aria-label="Available annotation tools"><motion.div className="marquee-track" animate={reduceMotion ? undefined : { x: ['0vw', '-100vw'] }} transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}>{[0, 1, 2].map((copy) => <div className="marquee-row" key={copy} aria-hidden={copy > 0}><span>Pen</span><i /><span>Highlighter</span><i /><span>Shapes</span><i /><span>Text</span><i /><span>Select</span><i /><span>Export</span><i /></div>)}</motion.div></div>

      <section id="tools" className="interest chapter">
        <div className="section-intro"><h2>A considered toolkit, always within reach.</h2><p>Made for quick thoughts and precise review, without turning the browser into a design application.</p></div>
        <div className="bento">
          <motion.article className="bento-card bento-ink" initial={reduceMotion ? false : { y: 38, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true, amount: .2 }} whileHover={reduceMotion ? undefined : { y: -8, scale: 1.012 }} transition={{ type: 'spring', stiffness: 240, damping: 24 }}><div><h3>Ink that feels immediate</h3><p>Pressure-aware strokes stay fluid from mouse to stylus.</p></div><div className="ink-demo"><svg viewBox="0 0 500 260"><path d="M25 190C116 38 222 49 298 155C355 234 414 206 480 78"/><path className="accent" d="M39 218C146 150 266 164 438 104"/></svg></div></motion.article>
          <motion.article className="bento-card bento-page" initial={reduceMotion ? false : { y: 38, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true, amount: .25 }} whileHover={reduceMotion ? undefined : { y: -8, scale: 1.012 }} transition={{ type: 'spring', stiffness: 240, damping: 24, delay: .04 }}><h3>Anchored to the page</h3><p>Your notes travel with the content as you scroll.</p><div className="mini-page"><span /><span /><span /><b /></div></motion.article>
          <motion.article className="bento-card bento-small warm" initial={reduceMotion ? false : { y: 34, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} whileHover={reduceMotion ? undefined : { y: -8, scale: 1.018 }} transition={{ type: 'spring', stiffness: 260, damping: 22 }}><h3>Private by default</h3><p>Stored only in your browser profile.</p></motion.article>
          <motion.article className="bento-card bento-small green" initial={reduceMotion ? false : { y: 34, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} whileHover={reduceMotion ? undefined : { y: -8, scale: 1.018 }} transition={{ type: 'spring', stiffness: 260, damping: 22, delay: .04 }}><h3>Step aside instantly</h3><p>Hand mode returns every click to the website.</p></motion.article>
          <motion.article className="bento-card bento-wide" initial={reduceMotion ? false : { y: 36, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} whileHover={reduceMotion ? undefined : { y: -8, scale: 1.01 }} transition={{ type: 'spring', stiffness: 240, damping: 24 }}><div><h3>One view, ready to share</h3><p>Export the visible page and its annotations as a crisp PNG.</p></div><div className="export-frame"><span>Browser page</span><strong>+</strong><span>Your thinking</span><strong>=</strong><span>Annotated PNG</span></div></motion.article>
        </div>
      </section>

      <section className="statement chapter"><p className="reveal-copy">{reveal.map((word, index) => <span className="reveal-word" key={`${word}-${index}`}>{word} </span>)}</p></section>

      <section id="workflow" ref={desire} className="desire chapter">
        <div className="desire-heading"><p className="eyebrow">A calmer review loop</p><h2>Stay in context from first mark to final thought.</h2></div>
        <div className="workflow-list">
          <article className="workflow-card"><span>Activate</span><h3>Click once in the browser bar.</h3><p>DrawMe arrives only in the tab where you asked for it.</p></article>
          <article className="workflow-card"><span>Annotate</span><h3>Choose a tool and make the page yours.</h3><p>Switch to hand mode whenever you need the original site.</p></article>
          <article className="workflow-card"><span>Return</span><h3>Your page remembers the work.</h3><p>Open DrawMe on the same URL and continue exactly where you left off.</p></article>
        </div>
      </section>

      <section className="accordion-section chapter">
        <div className="section-intro"><h2>Built for the ways the web makes you think.</h2></div>
        <div className="accordion">
          {['AI conversations', 'Deep reading', 'Interface critique'].map((title, index) => <article key={title} tabIndex={0}><span>0{index + 1}</span><h3>{title}</h3><p>{['Map a response, underline the useful part, and sketch the missing connection.', 'Keep questions and reactions attached to the paragraph that caused them.', 'Point to friction, trace a better flow, and export the result in one pass.'][index]}</p></article>)}
        </div>
      </section>

      <section className="scenario chapter" aria-live="polite">
        <div className="scenario-portraits" aria-hidden="true"><span /><span /><span /></div>
        <div className="scenario-copy"><AnimatePresence mode="wait"><motion.div key={scenario} initial={reduceMotion ? false : { x: 28, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={reduceMotion ? undefined : { x: -22, opacity: 0 }} transition={{ duration: .35, ease: [0.22, 1, 0.36, 1] }}><p>For a {scenarios[scenario].role.toLowerCase()}</p><blockquote>“{scenarios[scenario].quote}”</blockquote></motion.div></AnimatePresence><div className="scenario-controls"><motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: .94 }} onClick={() => rotate(-1)} aria-label="Previous scenario">←</motion.button><motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: .94 }} onClick={() => rotate(1)} aria-label="Next scenario">→</motion.button></div></div>
      </section>

      <footer id="start" className="footer chapter">
        <h2>Open a page. Make the first mark.</h2>
        <p>Pin DrawMe to your browser bar, then click it whenever a page deserves more than passive reading.</p>
        <a className="button footer-button" href="#top">Return to the top</a>
        <div className="footer-line"><span>DrawMe</span><span>Local-first browser annotation</span></div>
      </footer>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
