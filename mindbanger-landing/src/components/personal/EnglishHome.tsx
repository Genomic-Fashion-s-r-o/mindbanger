import Image from 'next/image';
import type { BookingSettings } from '@/lib/booking/model';
import { serviceUrl, orderedServices } from '@/lib/booking/catalog';
import { PersonalShell } from './PersonalShell';
import './english-home.css';

const sessions: Record<string, [string, string]> = {
  'rychly-rozhovor': ['A first conversation', 'A short introduction, a chance to clarify what you need, or space to explore one current situation.'],
  'vypni-hlavu': ['Give your mind a break', 'Slow down, organise your thoughts and find a practical next step.'],
  'zvladaj-stres': ['Meet stress with more calm', 'Identify sources of pressure and explore practical ways to handle everyday situations.'],
  'znovu-si-ver': ['Believe in yourself again', 'Explore your strengths, boundaries and the resources you can draw on.'],
  'individualny-coaching': ['Find your next step', 'Bring clarity to a decision, a direction or a change you want to make.'],
  'teenager-pod-tlakom': ['A teenager under pressure', 'Support with expectations, pressure and everyday challenges, for ages 13–19. For anyone under 18, a legal guardian books, pays and confirms consent from their own account.'],
  'mentalny-trening': ['A mindset for performance', 'Work with focus, mental preparation and your own goals.'],
  'relaxacia': ['Deep relaxation', 'Guided relaxation, time to slow down and practice letting go of tension.'],
  'opora-pocas-liecby': ['Support alongside treatment', 'Non-medical coaching alongside medical care: space for worries, a calmer perspective and manageable everyday steps.'],
  'premiovy-mentalny-koucing': ['An extended coaching conversation', 'More time to explore your topic in depth and prepare a practical way forward.'],
};
const price = (amount: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(amount);
const duration = (minutes: number, slot?: number) => `${slot || minutes + 10} min booking · approximately ${minutes} min conversation`;

export default function EnglishHome({ settings }: { settings: BookingSettings }) {
  return <PersonalShell settings={settings}><main id="obsah" className="coaching-home">
    <section className="personal-hero coaching-hero home-hero"><div className="home-hero-content">
      <p className="personal-eyebrow">MINDBANGER · INDIVIDUAL ONLINE COACHING</p>
      <h1>More trust in yourself.<br/><em>More courage to change your life.</em></h1>
      <p className="personal-lead">Make decisions with confidence, express what you need and face pressure with more calm. Find the strength to make the changes that matter to you.</p>
      <div className="personal-actions"><a className="personal-button" href="#sluzby">Explore your possibilities ↓</a><a className="personal-text-link" href="#o-mne">Meet your coach ↗</a></div>
      <p className="home-hero-facts">Online via Zoom <span aria-hidden="true">·</span> Individual approach <span aria-hidden="true">·</span> No subscription</p>
    </div><aside className="home-guide" aria-label="Your guide"><figure className="coaching-portrait"><Image src="/miro-profile.jpg" alt="Miroslav Jobus" width={112} height={112} sizes="(max-width:760px) 80px,96px" priority/><figcaption>Mgr. Miroslav Jobus<span>Personally. Respectfully. At your pace.</span></figcaption></figure><h2>You bring your story.<br/><em>I will be there with you.</em></h2><p>You do not need to arrive with prepared questions or answers. We will start with what matters to you right now.</p>{settings.email && <p className="home-guide-contact"><a href={'mailto:' + settings.email}>Not sure whether coaching is right for you? Write to me.</a></p>}</aside></section>

    <section id="o-mne" className="personal-section home-collaboration"><p className="personal-eyebrow">YOUR SPACE FOR A CONVERSATION</p><h2>A different perspective.<br/><em>A next step of your own.</em></h2><p>Every person has their own story, and every journey can be different. Together we will explore your situation, name what matters to you and look for practical steps that make sense in your life.</p><div className="home-session-steps"><article><span>01</span><h3>Choose your conversation</h3><p>Pick a topic and the time you need. You can also bring a story of your own.</p></article><article><span>02</span><h3>Meet online</h3><p>We explore your topic in a calm, confidential conversation via Zoom.</p></article><article><span>03</span><h3>Find a next step</h3><p>We bring together what you have learned and the possibilities for moving forward.</p></article></div></section>

    <section id="sluzby" className="personal-section home-services"><div id="cennik" className="home-section-heading"><div><p className="personal-eyebrow">TOPICS, SESSIONS AND PRICES</p><h2>What would you<br/><em>like to explore?</em></h2></div><p>These topics are starting points. Choose what feels closest to you, or bring your own situation.</p></div><div className="english-session-grid">{orderedServices(settings.services).filter(s => s.active && sessions[s.id]).map(s => <article className="english-session-card" key={s.id}><h3>{sessions[s.id][0]}</h3><p>{sessions[s.id][1]}</p><p>{duration(s.minutes, s.slotMinutes)}</p><p><strong>{price(s.price)}</strong></p><a className="personal-text-link" href={'/en' + serviceUrl(s.id)}>Choose a time ↗</a></article>)}</div><p>Booking blocks include time between clients. A 30-minute booking contains approximately 25 minutes of conversation, a 60-minute booking approximately 50 minutes, and a 90-minute booking approximately 80 minutes.</p><p>For longer-term support, you can explore available <a href="/en/rezervacia">sessions and packages</a>. You will see the final price and terms before completing a booking.</p></section>

    <section className="personal-section personal-faq"><div><p className="personal-eyebrow">GOOD TO KNOW</p><h2>A few<br/><em>questions.</em></h2></div><div>
      <details><summary>Do I need to know exactly what to discuss?</summary><p>No. We can start with what is happening in your life and clarify what would be useful to you.</p></details>
      <details><summary>How do I book?</summary><p>Choose a session and an available time in the booking form. Review the price and your details before submitting. I personally confirm the appointment; your confirmation and Zoom instructions will be available in your email and account.</p></details>
      <details><summary>Is coaching healthcare?</summary><p>These services are non-medical. They are not diagnosis, medical treatment or psychotherapy and do not replace professional healthcare.</p></details>
    </div></section>
    <section id="kontakt" className="personal-contact"><h2>Change can begin<br/><em>with a conversation.</em></h2><div className="personal-actions"><a className="personal-button" href="/en/rezervacia">Find your time</a></div></section>
  </main></PersonalShell>;
}
