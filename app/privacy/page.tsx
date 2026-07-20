import { Header } from '../components/Header';
import { Footer } from '../components/Footer';

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="legal-main">
        <header className="legal-hero">
          <span className="legal-kicker">Privacy & Data Trust</span>
          <h1>Privacy Policy</h1>
          <p className="legal-lead">
            GetWink is currently in beta testing. We built our privacy principles to ensure your personal information is protected, transparently managed, and handled with full respect for your control.
          </p>
        </header>

        <section className="legal-card">
          <h2>Information we collect</h2>
          <p>
            To provide a safe and personal social discovery experience, GetWink processes only essential data points:
          </p>
          <ul>
            <li>Account details used for registration and secure login.</li>
            <li>Profile details such as display name, bio, gender, preferences, and photos.</li>
            <li>Discovery actions such as Winks and Passes to refine your recommendations.</li>
            <li>Match and chat data required to deliver real-time messaging between mutual connections.</li>
            <li>Safety data such as block lists, user reports, and account deletion requests.</li>
            <li>Usage metadata such as features accessed, latency, and system performance metrics.</li>
          </ul>
        </section>

        <section className="legal-card">
          <h2>AI Privacy & Assistant Security</h2>
          <p>
            All AI assistant features are processed through secure server-side routes. GetWink does not log or store private chat contents for model training. The assistant only processes information necessary to generate requested profile tips or icebreakers.
          </p>
        </section>

        <section className="legal-card">
          <h2>Your Choices & Data Control</h2>
          <p>
            You have full control over your data. You can edit your profile information at any time, block or report users directly from any conversation, and request permanent account and data deletion directly inside the app settings.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
