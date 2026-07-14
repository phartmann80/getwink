import Image from 'next/image';
import Link from 'next/link';

export function Header() {
  return (
    <header className="site-header">
      <Link href="/" className="brand" aria-label="GetWink home">
        <Image src="/logo.png" alt="GetWink" width={44} height={44} priority />
        <span>GetWink</span>
      </Link>
      <nav className="site-nav" aria-label="Main navigation">
        <Link href="/#how">How it works</Link>
        <Link href="/#ai">Intelligence</Link>
        <Link href="/safety">Safety</Link>
        <Link href="/privacy">Privacy</Link>
      </nav>
      <a className="header-cta" href="#beta">Get the beta</a>
    </header>
  );
}
