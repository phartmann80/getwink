import { Header } from '../components/Header';
import { Footer } from '../components/Footer';

export default function IntelligencePage() {
  return (
    <>
      <Header />
      <main className="legal-main">
        <header className="legal-hero">
          <span className="legal-kicker">Privacy-First AI</span>
          <h1>GetWink Intelligence</h1>
          <p className="legal-lead">
            Your taste is personal. Discovery should be too. GetWink's AI layer is built to assist, guide, and protect, never impersonate you.
          </p>
        </header>

        <section className="legal-card">
          <h2>Deterministic Safety & Eligibility Rules</h2>
          <p>
            Hard eligibility and safety rules stay 100% deterministic and server-side. AI never overrides your safety preferences, block lists, or boundary settings.
          </p>
        </section>

        <section className="legal-card">
          <h2>Your Approval Always Required</h2>
          <p>
            AI suggestions for icebreakers, profile edits, and conversation starters require your explicit approval before being sent. GetWink will never auto-message anyone on your behalf.
          </p>
        </section>

        <section className="legal-card">
          <h2>Private Chat Confidentiality</h2>
          <p>
            AI processing runs on isolated, secure routes. Private chat content is never logged, leaked, or used to train public LLM models.
          </p>
        </section>

        <section className="legal-card">
          <h2>Interest-Aware Discovery</h2>
          <p>
            GetWink learns from the profiles you choose to explore, prioritizing mutual compatibility without algorithmic traps or fake engagement tricks.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
