import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const repoOwner = searchParams.get("owner");
  const repoName = searchParams.get("repo");

  if (!repoOwner || !repoName) {
    return NextResponse.json({ error: "Missing owner or repo" }, { status: 400 });
  }

  const comments = await prisma.comment.findMany({
    where: { repoOwner, repoName },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
          githubLogin: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(comments);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { content, repoOwner, repoName } = body;

  if (!content || !repoOwner || !repoName) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: { email: session.user.email || "" },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const comment = await prisma.comment.create({
    data: {
      content,
      repoOwner,
      repoName,
      userId: user.id,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
          githubLogin: true,
        },
      },
    },
  });

  return NextResponse.json(comment);
}
