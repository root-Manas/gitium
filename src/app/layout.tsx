import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import SessionProvider from "@/components/SessionProvider";
import { getServerSession } from "next-auth";

export const metadata: Metadata = {
  title: "Gitium - GitHub Social Platform",
  description: "A social platform for GitHub repositories with premium analytics and community discussions",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession();

  return (
    <html lang="en" className="dark">
      <body className="bg-[#0d1117] text-[#c9d1d9] min-h-screen">
        <SessionProvider session={session}>
          <Header />
          <main className="min-h-[calc(100vh-64px)]">
            {children}
          </main>
        </SessionProvider>
      </body>
    </html>
  );
}
