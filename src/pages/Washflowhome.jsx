import React from "react";
import {
  Zap,
  ArrowRight,
  Clock,
  Car,
  BarChart3,
  Timer,
  MapPin,
  Users,
  CreditCard,
  Globe,
  Camera,
  Video,
} from "lucide-react";
import "./WashFlowHome.css";

// 1. HERE IS THE NEW LOGO COMPONENT
const LogoMark = ({ height = 55 }) => (
  <img 
    src="/assets/logo.png" 
    alt="WashFlow Logo" 
    style={{ height: height, width: 'auto', objectFit: 'contain' }} 
  />
);

const NAV_LINKS = ["Home", "Join Queue", "Track Queue", "Services", "About"];

const FEATURES = [
  { icon: Timer, title: "Join in Seconds", text: "Create an account and get in the queue." },
  { icon: MapPin, title: "Track in Real-Time", text: "See your position anytime, anywhere." },
  { icon: Car, title: "Choose Your Service", text: "Exterior, Interior or Full Wash." },
  { icon: Users, title: "Live Queue Status", text: "See exactly how many cars are ahead of you." },
  { icon: CreditCard, title: "Pay After Service", text: "Pay easily once your car is washed." },
];

export default function WashFlowHome({
  queueNumber = 2,
  waitMinutes = 8,
  carsAhead = 1,
  onJoinQueue = () => {},
  onTrackQueue = () => {},
  onSignIn = () => {},
  onCreateAccount = () => {},
}) {
  return (
    <div className="wf">
      <header className="wf-header">
        <a href="/" className="wf-brand" aria-label="WashFlow home">
          {/* 2. HEADER LOGO UPDATED */}
          <span className="wf-brand__mark">
            <LogoMark height={55} />
          </span>
        </a>

        <nav className="wf-nav" aria-label="Main">
          {NAV_LINKS.map((link, i) => (
            <a
              key={link}
              href={`#${link.toLowerCase().replace(/\s+/g, "-")}`}
              className={`wf-nav__link ${i === 0 ? "is-active" : ""}`}
            >
              {link}
            </a>
          ))}
        </nav>

        <div className="wf-auth">
          <button className="wf-btn wf-btn--outline" onClick={onSignIn}>
            Sign In
          </button>
          <button className="wf-btn wf-btn--primary" onClick={onCreateAccount}>
            Create Account
          </button>
        </div>
      </header>

      <section className="wf-hero">
        <div className="wf-hero__overlay" />

        <div className="wf-hero__content">
          <span className="wf-pill">
            <Zap size={16} className="wf-pill__icon" />
            Smart Car Wash Queue System
          </span>

          <h1 className="wf-hero__title">
            Know Your Turn.
            <br />
            <span className="wf-hero__accent">Skip</span> the Wait.
          </h1>

          <p className="wf-hero__sub">
            Join the car wash queue, track your position in real-time, and
            drive when it&apos;s your turn!
          </p>

          <button className="wf-btn wf-btn--primary wf-btn--lg" onClick={onJoinQueue}>
            Join the Queue <ArrowRight size={20} />
          </button>
        </div>

        <aside className="wf-status" aria-label="Live queue status">
          <div className="wf-status__head">
            <div className="wf-status__title">
              <span className="wf-status__icon">
                <BarChart3 size={20} />
              </span>
              Live Queue Status
            </div>
            <span className="wf-live">
              <span className="wf-live__dot" /> Live
            </span>
          </div>

          <div className="wf-status__number">
            <span className="wf-status__label">Your Queue Number</span>
            <span className="wf-status__big">#{queueNumber}</span>
          </div>

          <div className="wf-status__block">
            <span className="wf-status__label">Estimated Wait Time</span>
            <span className="wf-status__value">
              <Clock size={30} className="wf-blue" /> ~ {waitMinutes} min
            </span>
          </div>

          <div className="wf-status__block wf-status__block--divided">
            <span className="wf-status__label">
              <Car size={20} className="wf-blue" /> Cars Ahead of You
            </span>
            <span className="wf-status__value">
              <Car size={30} className="wf-blue" /> {carsAhead}
            </span>
          </div>

          <button className="wf-btn wf-btn--primary wf-btn--block" onClick={onTrackQueue}>
            Track Your Queue <ArrowRight size={18} />
          </button>
        </aside>
      </section>

      <section className="wf-features">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <article className="wf-feature" key={title}>
            <Icon size={36} className="wf-feature__icon" strokeWidth={2.2} />
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </section>

      <footer className="wf-footer">
        <a href="/" className="wf-brand wf-brand--small" aria-label="WashFlow home">
          {/* 3. FOOTER LOGO UPDATED */}
          <span className="wf-brand__mark">
            <LogoMark height={40} />
          </span>
        </a>

        <p className="wf-footer__tagline">
          A smarter way to manage your car wash experience.
        </p>

        <div className="wf-footer__right">
          <div className="wf-social">
            <a href="#facebook" aria-label="Facebook"><Globe size={22} /></a>
            <a href="#instagram" aria-label="Instagram"><Camera size={22} /></a>
            <a href="#tiktok" aria-label="TikTok"><Video size={22} /></a>
          </div>
          <div className="wf-powered">
            <span>Powered by</span>
            <strong>Samsung Innovation Internship</strong>
          </div>
        </div>
      </footer>
    </div>
  );
}