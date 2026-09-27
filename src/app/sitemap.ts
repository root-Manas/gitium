import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://gitium.vercel.app';
  return ['/', '/explore', '/code', '/insights', '/contribute', '/u/root-Manas'].map(path => ({ url: `${base}${path}`, changeFrequency: path === '/' ? 'daily' : 'weekly', priority: path === '/' ? 1 : .7 }));
}
