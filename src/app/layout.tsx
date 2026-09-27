import type { Metadata } from 'next';
import { SessionProvider } from '@/components/SessionProvider';
import './globals.css';

const site = 'https://gitium.vercel.app';
const description = 'Discover GitHub repositories through people you follow. Explore commit graphs, compare playful account scores, import your stars, and talk in private rooms.';

export const metadata: Metadata = {
  metadataBase: new URL(site),
  applicationName: 'Gitium',
  title: { default: 'Gitium — Find the work worth following', template: '%s · Gitium' },
  description,
  keywords: ['GitHub project discovery', 'open source discovery', 'GitHub code graph', 'GitHub stars', 'developer communities', 'repository chat', 'GitHub account score'],
  authors: [{ name: 'Manas Raj', url: 'https://manasraj.vercel.app' }],
  creator: 'Manas Raj',
  category: 'developer tools',
  alternates: { canonical: site },
  openGraph: { title: 'Gitium — Find the work worth following', description, url: site, siteName: 'Gitium', type: 'website', locale: 'en_US', images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Gitium — discover the work worth following' }] },
  twitter: { card: 'summary_large_image', title: 'Gitium — Find the work worth following', description, images: ['/opengraph-image'] }
};

const structuredData = {
  '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Gitium', url: site,
  description, applicationCategory: 'DeveloperApplication', operatingSystem: 'Web',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  author: { '@type': 'Person', name: 'Manas Raj', url: 'https://manasraj.vercel.app' },
  sameAs: ['https://github.com/root-Manas/gitium']
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: "try{document.documentElement.dataset.theme=localStorage.getItem('gitium-theme')||'light'}catch(e){}" }}/><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}/></head><body><SessionProvider>{children}</SessionProvider></body></html>;
}
