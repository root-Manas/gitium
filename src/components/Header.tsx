"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { useState } from "react";
import { Search, GitBranch, Bell, Menu, X } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function Header() {
  const { data: session } = useSession();
  const [query, setQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-[#161b22] border-b border-[#30363d]">
      <div className="max-w-screen-xl mx-auto px-4 h-16 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-white font-bold text-xl shrink-0">
          <GitBranch className="h-6 w-6 text-[#58a6ff]" />
          <span className="text-[#58a6ff]">Gitium</span>
        </Link>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-lg hidden md:flex">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8b949e]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search repositories..."
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-md pl-10 pr-4 py-1.5 text-sm text-[#c9d1d9] placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff]"
            />
          </div>
        </form>

        <div className="flex items-center gap-2 ml-auto">
          {session ? (
            <>
              <Bell className="h-5 w-5 text-[#8b949e] hidden md:block cursor-pointer hover:text-white" />
              <Link href={`/${session.user?.githubLogin || ""}`}>
                <Image
                  src={session.user?.image || "/default-avatar.png"}
                  alt="Profile"
                  width={32}
                  height={32}
                  className="rounded-full border border-[#30363d] cursor-pointer hover:border-[#58a6ff]"
                />
              </Link>
              <button
                onClick={() => signOut()}
                className="hidden md:block text-sm text-[#8b949e] hover:text-white px-3 py-1 border border-[#30363d] rounded-md hover:border-[#58a6ff]"
              >
                Sign out
              </button>
            </>
          ) : (
            <button
              onClick={() => signIn("github")}
              className="text-sm font-medium bg-[#238636] hover:bg-[#2ea043] text-white px-4 py-1.5 rounded-md transition-colors"
            >
              Sign in with GitHub
            </button>
          )}
          <button
            className="md:hidden text-[#8b949e] hover:text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#161b22] border-t border-[#30363d] px-4 py-3 space-y-3">
          <form onSubmit={handleSearch} className="flex">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8b949e]" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search repositories..."
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-md pl-10 pr-4 py-2 text-sm text-[#c9d1d9] placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff]"
              />
            </div>
          </form>
        </div>
      )}
    </header>
  );
}
