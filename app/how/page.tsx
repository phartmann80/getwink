import { Header } from '../components/Header';
import { Footer } from '../components/Footer';

export default function HowItWorksPage() {
  return (
    <>
      <Header />
      <main className="legal-main">
        <header className="legal-hero">
          <span className="legal-kicker">Simple & Intentional</span>
          <h1>How GetWink Works</h1>
          <p className="legal-lead">
            GetWink replaces endless swiping with intentional signals, deterministic safety rules, and mutual consent.
          </p>
        </header>

        <section className="how-steps-grid">
          <article className="how-step-card">
            <div className="how-step-badge">Step 01</div>
            <div className="how-step-image-wrapper">
              <img
                src="/how_step1_wink.jpg"
                alt="Send a Wink signal in GetWink"
                className="how-step-img"
              />
            </div>
            <h2>01 Wink</h2>
            <p>
              A playful, low-pressure signal when someone catches your interest. Sending a Wink lets another member know you are interested without public exposure or social friction.
            </p>
          </article>

          <article className="how-step-card">
            <div className="how-step-badge">Step 02</div>
            <div className="how-step-image-wrapper">
              <img
                src="/how_step2_mutual.jpg"
                alt="Mutual Consent Chat unlocked"
                className="how-step-img"
              />
            </div>
            <h2>02 Mutual Consent</h2>
            <p>
              Chat opens only when two people choose each other. Unsolicited messages and cold DMs are completely eliminated so every conversation starts with mutual interest.
            </p>
          </article>

          <article className="how-step-card">
            <div className="how-step-badge">Step 03</div>
            <div className="how-step-image-wrapper">
              <img
                src="/how_step3_learn.jpg"
                alt="AI-Assisted Discovery"
                className="how-step-img"
              />
            </div>
            <h2>03 Learn & Discover</h2>
            <p>
              With your permission, GetWink gradually improves which eligible profiles appear first based on the connections and profiles you choose to explore.
            </p>
          </article>
        </section>
      </main>
      <Footer />
    </>
  );
}
