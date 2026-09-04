import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, email, region, phone, bio } = body;

  if (!name || !email || !region) {
    return NextResponse.json(
      { error: "Name, email, and region are required" },
      { status: 400 }
    );
  }

  try {
    const director = await prisma.director.create({
      data: {
        name,
        email,
        region,
        phone: phone || null,
        bio: bio || null,
      },
    });
    return NextResponse.json({ director });
  } catch {
    return NextResponse.json(
      { error: "Couldn't create director -- that email may already be in use" },
      { status: 400 }
    );
  }
}
