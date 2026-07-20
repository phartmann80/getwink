import { Header } from '../components/Header';
import { Footer } from '../components/Footer';

export default function SafetyPage() {
  return (
    <>
      <Header />
      <main className="legal-main">
        <header className="legal-hero">
          <span className="legal-kicker">Community & Safety</span>
          <h1>Safety Guidelines</h1>
          <p className="legal-lead">
            GetWink is designed around friendly discovery, mutual consent, and respectful conversation. We build tools to ensure everyone feels comfortable and safe.
          </p>
        </header>

        <section className="legal-card">
          <h2>Be clear and kind</h2>
          <p>
            Authentic connections start with honesty and respect:
          </p>
          <ul>
            <li>Use accurate, honest profile information and photos.</li>
            <li>Respect personal boundaries and decisions.</li>
            <li>Do not pressure anyone to reply, meet, or share personal information.</li>
          </ul>
        </section>

        <section className="legal-card">
          <h2>Use Block and Report tools</h2>
          <p>
            You are always in control of your interactions. Block users immediately if you do not wish to have further contact. Report users for harassment, spam, fake profiles, inappropriate content, underage concerns, scams, or safety issues.
          </p>
        </section>

        <section className="legal-card">
          <h2>AI safety support</h2>
          <p>
            The GetWink assistant is available to help you draft reports, understand safety options, and navigate conversations respectfully. The assistant is not a replacement for professional guidance or emergency services.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
