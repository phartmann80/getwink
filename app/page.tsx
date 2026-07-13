import { Sparkles, ShieldCheck, MessageCircle, Download } from 'lucide-react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
const apkUrl = process.env.NEXT_PUBLIC_ANDROID_APK_URL || '';
const hasRealApk = apkUrl && 
  apkUrl !== 'https://getwink.app/download/beta.apk' && 
  apkUrl !== '#beta-download-pending' && 
  !apkUrl.startsWith('#');

export default function HomePage(){
  return (
    <>
      <Header/>
      <main>
        <section className="container hero">
          <div>
            <span className="badge"><Sparkles size={16}/> Android beta · friendly discovery</span>
            <h1>Meet people with a wink, not a verdict.</h1>
            <p className="lede">GetWink is a modern dating and social discovery beta for Android. Build a profile, browse people, send a playful Wink, politely Pass, and chat when the feeling is mutual.</p>
            <div className="ctas">
              {hasRealApk ? (
                <a className="btn primary" href={apkUrl}><Download size={18}/> Download Android APK</a>
              ) : (
                <button className="btn primary" disabled style={{ opacity: 0.6, cursor: 'not-allowed' }}>
                  <Download size={18}/> Android beta coming soon
                </button>
              )}
              <a className="btn secondary" href="#how">See how GetWink works</a>
            </div>
          </div>
          <div className="phone" aria-label="GetWink app preview">
            <div className="phone-card">
              <div>
                <div className="profile-art"/>
                <div className="card-name">Maya, 28</div>
                <div className="card-copy">Coffee walks, indie films, and someone who can make grocery shopping weirdly fun.</div>
              </div>
              <div className="actions">
                <div className="pill">Pass</div>
                <div className="pill wink">Wink</div>
              </div>
            </div>
          </div>
        </section>
        <section id="how" className="container section">
          <h2>Simple signals. Softer energy.</h2>
          <p className="lede">The beta keeps discovery familiar, but the language is intentionally lighter and kinder.</p>
          <div className="grid3">
            <article className="panel">
              <h3>Wink</h3>
              <p>Find someone interesting? Send a Wink. It is playful, low-pressure, and only becomes a match when it is mutual.</p>
            </article>
            <article className="panel">
              <h3>Pass</h3>
              <p>Not feeling it? Pass politely. GetWink keeps the interaction private and avoids harsh like/dislike framing.</p>
            </article>
            <article className="panel">
              <h3>Match & chat</h3>
              <p>When two people Wink at each other, a match opens and chat becomes available.</p>
            </article>
          </div>
        </section>
        <section id="ai" className="container section">
          <div className="ai-strip">
            <div>
              <span className="badge"><MessageCircle size={16}/> AI built in</span>
              <h2>Your friendly wingmate.</h2>
            </div>
            <p>GetWink includes an AI assistant for profile creation, bio polishing, respectful opener ideas, reply suggestions you approve before sending, onboarding guidance, and safety support.</p>
          </div>
        </section>
        <section className="container section">
          <h2>Beta access</h2>
          <div className="grid3">
            <article className="panel">
              <h3>30 days free</h3>
              <p>Your beta trial starts only after your profile is complete, so you do not lose days during onboarding.</p>
            </article>
            <article className="panel">
              <h3>Android first</h3>
              <p>The current target is an APK for direct beta distribution. Google Play launch can come later.</p>
            </article>
            <article className="panel">
              <h3><ShieldCheck size={20}/> Safety foundation</h3>
              <p>Blocking, reporting, account deletion, privacy, terms, and community guidelines are part of the MVP architecture.</p>
            </article>
          </div>
        </section>
      </main>
      <Footer/>
    </>
  );
}
