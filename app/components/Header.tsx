import Image from 'next/image';
import Link from 'next/link';
export function Header(){return <header className="container nav"><Link href="/" className="brand" aria-label="GetWink home"><Image src="/logo.png" alt="GetWink logo" width={44} height={44} priority/><span>GetWink</span></Link><nav className="nav-links" aria-label="Main navigation"><Link href="/#how">How it works</Link><Link href="/#ai">AI assistant</Link><Link href="/safety">Safety</Link><Link href="/privacy">Privacy</Link></nav></header>}
