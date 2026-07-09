import Link from 'next/link';
export function Footer(){return <footer className="container footer"><span>© {new Date().getFullYear()} GetWink. Beta access for Android.</span><span className="nav-links"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/safety">Safety guidelines</Link></span></footer>}
