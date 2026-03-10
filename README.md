# Gitium

A GitHub social platform with premium analytics and community discussions.

## Features

- **GitHub Authentication** - Sign in with your GitHub account
- **Repository Search** - Search all of GitHub's repositories
- **Premium Analytics** - Language breakdowns, contributor stats, commit history
- **Community Discussions** - Comment on any GitHub repository
- **User Profiles** - View developer profiles mirroring GitHub

## Tech Stack

- **Framework**: Next.js 16 (App Router) with TypeScript
- **Styling**: Tailwind CSS with system font stack
- **Auth**: NextAuth.js v4 with GitHub OAuth
- **Database**: SQLite via libsql + Prisma 7 (for comments)
- **GitHub API**: Octokit REST

## Getting Started

### Prerequisites

- Node.js 18+
- A GitHub OAuth App (for authentication)

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Fill in your GitHub OAuth credentials:
   - `GITHUB_ID`: Your GitHub OAuth App Client ID
   - `GITHUB_SECRET`: Your GitHub OAuth App Client Secret
   - `NEXTAUTH_SECRET`: A random secret string
   - `NEXTAUTH_URL`: Your app URL (http://localhost:3000 for dev)
   - `DATABASE_URL`: SQLite file path (e.g. `file:./prisma/dev.db`)

4. Initialize the database:
   ```bash
   DATABASE_URL="file:./prisma/dev.db" npx prisma db push
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

### Creating a GitHub OAuth App

1. Go to GitHub Settings → Developer Settings → OAuth Apps
2. Click "New OAuth App"
3. Set Homepage URL: `http://localhost:3000`
4. Set Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
5. Copy the Client ID and generate a Client Secret

## License

MIT
