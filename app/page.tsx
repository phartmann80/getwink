import { ArrowDown, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';

const apkUrl = process.env.NEXT_PUBLIC_ANDROID_APK_URL;
const apkReady = Boolean(
  apkUrl &&
    !apkUrl.includes('download/beta.apk') &&
    apkUrl !== '#beta-download-pending',
);

const profiles = [
  { name: 'Maya', age: 28, detail: 'Vienna · coffee walks', tone: 'coral' },
  { name: 'Sofia', age: 30, detail: 'Berlin · travel stories', tone: 'mint' },
  { name: 'Lea', age: 27, detail: 'Munich · indie films', tone: 'lilac' },
];

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <section className="editorial-hero" aria-labelledby="hero-title">
          <div className="hero-orbit hero-orbit-one" aria-hidden="true" />
          <div className="hero-orbit hero-orbit-two" aria-hidden="true" />
          <div className="hero-blob hero-blob-coral" aria-hidden="true" />
          <div className="hero-blob hero-blob-mint" aria-hidden="true" />

          <div className="hero-copy">
            <span className="hero-kicker"><Sparkles size={15} /> Android beta</span>
            <h1 id="hero-title">
              Meet the
              <span>interesting one</span>
              <em>😉</em>
            </h1>
            <p>
              GetWink learns what catches your interest—while you stay in control of every Wink, match, and message.
            </p>
          </div>

          <div className="hero-stage" aria-label="GetWink discovery experience preview">
            <div className="black-swell" aria-hidden="true" />
            <video
              className="hero-person"
              src="/getwink_.mp4"
              autoPlay
              loop
              muted
              playsInline
              aria-label="A demo video showing GetWink app discovery with swipe-right for Wink and swipe-left for Pass"
            />

            <div className="wink-bubble wink-bubble-one" aria-hidden="true">Wink</div>
            <div className="wink-bubble wink-bubble-two" aria-hidden="true">Hi!</div>
            <div className="wink-bubble wink-bubble-three" aria-hidden="true">😉</div>

            <article className="floating-profile profile-left">
              <div className="profile-photo profile-photo-coral">M</div>
              <div><small>New discovery</small><strong>Maya, 28</strong><span>Vienna · 3 shared interests</span></div>
              <button type="button" aria-label="Wink at Maya">Wink</button>
            </article>

            <article className="floating-message message-right">
              <div className="tiny-avatar">S</div>
              <div><strong>Sofia</strong><span>Rome or Florence? 😄</span></div>
              <span className="online-dot" aria-label="Online" />
            </article>

            <div className="match-meter" aria-hidden="true">
              <span>GetWink thinks</span>
              <strong>Worth a closer look</strong>
              <i><b /></i>
            </div>
          </div>

          <a className="scroll-cue" href="#how" aria-label="Scroll to how GetWink works">
            <ArrowDown size={18} />
          </a>
        </section>

        <section id="how" className="story-section">
          <div className="story-intro">
            <span className="section-label">More than another swipe app</span>
            <h2>A familiar gesture.<br />A smarter feeling.</h2>
            <p>
              Hard rules keep discovery safe and eligible. GetWink’s intelligence layer can then learn from the profiles you choose to explore—not just the ones you swipe past.
            </p>
          </div>

          <div className="signal-row">
            <article><span>01</span><h3>Wink</h3><p>A playful, low-pressure signal when someone catches your interest.</p></article>
            <article><span>02</span><h3>Mutual</h3><p>Chat opens only when two people choose each other.</p></article>
            <article><span>03</span><h3>Learn</h3><p>With permission, GetWink gradually improves which eligible profiles appear first.</p></article>
          </div>
        </section>

        <section id="ai" className="intelligence-section">
          <div className="intelligence-copy">
            <span className="section-label light">GetWink intelligence</span>
            <h2>Your taste is personal.<br />Discovery should be too.</h2>
            <p>
              Profile help, thoughtful conversation starters, and future interest-aware discovery—designed to assist, never impersonate.
            </p>
            <ul>
              <li><ShieldCheck size={18} /> Hard eligibility and safety rules stay deterministic.</li>
              <li><Sparkles size={18} /> AI suggestions require your approval.</li>
            </ul>
          </div>
          <div className="profile-stack" aria-label="Example discovery profiles">
            {profiles.map((profile, index) => (
              <article className={`stack-card stack-${index + 1} ${profile.tone}`} key={profile.name}>
                <div className="stack-portrait">{profile.name.charAt(0)}</div>
                <small>We think you may find</small>
                <h3>{profile.name}, {profile.age}</h3>
                <p>{profile.detail}</p>
                <span>View profile <ArrowRight size={15} /></span>
              </article>
            ))}
          </div>
        </section>

        <section className="beta-section">
          <div>
            <span className="section-label">Android first</span>
            <h2>Ready when the beta is.</h2>
            <p>We’re finishing the first Android build. Your 30-day trial will start only after your profile is complete.</p>
          </div>
          {apkReady ? (
            <a className="beta-cta" href={apkUrl}>Download Android APK <ArrowRight size={18} /></a>
          ) : (
            <span className="beta-cta beta-cta-disabled" aria-disabled="true">Android beta coming soon</span>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
