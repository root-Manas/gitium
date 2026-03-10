import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      githubLogin?: string | null;
    };
  }

  interface User {
    githubLogin?: string | null;
  }
}
