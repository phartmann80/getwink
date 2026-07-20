import { Header } from '../components/Header';
import { Footer } from '../components/Footer';

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="legal-main">
        <header className="legal-hero">
          <span className="legal-kicker">Terms & Expectations</span>
          <h1>Terms of Use</h1>
          <p className="legal-lead">
            GetWink is a beta Android dating and social discovery service. These terms outline the ground rules for testing our service and keeping our community welcoming.
          </p>
        </header>

        <section className="legal-card">
          <h2>Beta status</h2>
          <p>
            GetWink is actively being tested and improved. The app features, interface, or availability may change as we gather feedback and optimize performance during testing.
          </p>
        </section>

        <section className="legal-card">
          <h2>User conduct</h2>
          <p>
            Community members must be respectful, honest, and legally eligible to use the service. Harassment, spam, scams, impersonation, explicit non-consensual content, and any unsafe behavior are strictly prohibited on GetWink.
          </p>
        </section>

        <section className="legal-card">
          <h2>AI assistant guidance</h2>
          <p>
            The GetWink AI assistant provides profile suggestions and icebreaker ideas to help start authentic conversations. The assistant does not send messages automatically. You remain responsible for all content and messages you send.
          </p>
        </section>

        <section className="legal-card">
          <h2>Future subscriptions</h2>
          <p>
            GetWink is currently free during the beta testing period. We may introduce optional premium features or paid subscriptions in the future with clear advance notice.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
