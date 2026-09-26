'use client';
import Link from 'next/link';
import { signIn, useSession } from 'next-auth/react';
import { ArrowUpRight, Github } from 'lucide-react';

export function LoginButton({ authReady }: { authReady: boolean }) {
  const { data: session } = useSession();
  if (session?.user || !authReady) return <Link className="hero-login" href="/explore">Explore people <ArrowUpRight size={16} /></Link>;
  return <button className="hero-login" type="button" onClick={() => signIn('github')}><Github size={17} /> Log in with GitHub</button>;
}
