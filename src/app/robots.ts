import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/spaces', '/saved', '/search'] }, sitemap: 'https://gitium.vercel.app/sitemap.xml', host: 'https://gitium.vercel.app' };
}
