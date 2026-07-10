import type { Metadata } from 'next';
import './styles/globals.css';

export const metadata: Metadata = {
  title: 'GetWink — Beta dating discovery for Android',
  description: 'A friendly beta dating and social discovery app built around Wink, Pass, mutual matches, chat, and helpful AI guidance.',
  metadataBase: new URL('https://www.getwink.app'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
