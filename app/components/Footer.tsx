import Link from 'next/link';

export function Footer() {
  return (
    <footer className="site-footer">
      <div>
        <img src="/logo.png" alt="GetWink Logo" className="footer-logo" />
        <span>Interesting is personal.</span>
      </div>
      <nav aria-label="Footer navigation">
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/safety">Safety</Link>
      </nav>
      <small>© {new Date().getFullYear()} GetWink</small>
    </footer>
  );
}
