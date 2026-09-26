import type { Metadata } from 'next';
import { SessionProvider } from '@/components/SessionProvider';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Gitium — GitHub activity in one feed', template: '%s · Gitium' },
  description: 'Follow public GitHub activity, read your GitHub timeline, and save useful work in one web app.',
  openGraph: { title: 'Gitium', description: 'GitHub activity in one feed.', type: 'website' }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><SessionProvider>{children}</SessionProvider></body></html>;
}
