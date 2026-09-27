import type { Metadata } from 'next';
import { SessionProvider } from '@/components/SessionProvider';
import { SiteAnalytics } from '@/components/Analytics';
import './globals.css';
import './theme.css';
import './search.css';

const site = 'https://gitium.vercel.app';
const description = 'Find top GitHub projects and organizations by language and topic. Browse essential open source tools, explore code graphs, and find issues to contribute to.';

export const metadata: Metadata = {
  metadataBase: new URL(site),
  applicationName: 'Gitium',
  title: { default: 'Gitium — Find useful GitHub projects', template: '%s · Gitium' },
  description,
  keywords: ['GitHub project discovery', 'top GitHub repositories', 'GitHub organizations', 'open source tools', 'good first issues', 'open source discovery', 'GitHub code graph', 'GitHub stars', 'developer communities', 'repository chat', 'GitHub account score'],
  authors: [{ name: 'Manas Raj', url: 'https://manasraj.vercel.app' }],
  creator: 'Manas Raj',
  category: 'developer tools',
  alternates: { canonical: site },
  openGraph: { title: 'Gitium — Find useful GitHub projects', description, url: site, siteName: 'Gitium', type: 'website', locale: 'en_US', images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Gitium — find useful GitHub projects' }] },
  twitter: { card: 'summary_large_image', title: 'Gitium — Find useful GitHub projects', description, images: ['/opengraph-image'] }
};

const structuredData = {
  '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Gitium', url: site,
  description, applicationCategory: 'DeveloperApplication', operatingSystem: 'Web',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  author: { '@type': 'Person', name: 'Manas Raj', url: 'https://manasraj.vercel.app' },
  sameAs: ['https://github.com/root-Manas/gitium']
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: "try{document.documentElement.dataset.theme=localStorage.getItem('gitium-theme')||'light'}catch(e){}" }}/><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}/></head><body><SessionProvider>{children}</SessionProvider><SiteAnalytics /></body></html>;
}
