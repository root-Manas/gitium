import type { Metadata } from 'next';
import { SessionProvider } from '@/components/SessionProvider';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Gitium — Find the work worth following', template: '%s · Gitium' },
  description: 'Discover projects through people you trust. Explore code graphs, write posts, and talk in GitHub spaces.',
  openGraph: { title: 'Gitium', description: 'Find the work worth following.', type: 'website' }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: "try{document.documentElement.dataset.theme=localStorage.getItem('gitium-theme')||'light'}catch(e){}" }}/></head><body><SessionProvider>{children}</SessionProvider></body></html>;
}
