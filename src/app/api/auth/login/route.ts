import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/lib/models/User";
import { Workspace } from "@/lib/models/Workspace";
import { signAuthToken } from "@/lib/auth";

interface LoginBody {
  email?: string;
  password?: string;
}

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await connectToDatabase();

    const body = (await request.json().catch(() => null)) as LoginBody | null;
    const emailRaw = body?.email;
    const password: string | undefined = body?.password;

    if (typeof emailRaw !== "string" || !emailRaw.trim() || typeof password !== "string") {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const email = emailRaw.trim().toLowerCase();
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const workspace = user.workspaceId ? await Workspace.findById(user.workspaceId) : null;

    const token = signAuthToken({
      userId: user._id.toString(),
      workspaceId: workspace?._id?.toString(),
    });

    return NextResponse.json({
      token,
      user: { id: user._id.toString(), email: user.email },
      workspace: workspace
        ? {
            id: workspace._id.toString(),
            name: workspace.name,
            logoUrl: workspace.logoUrl ?? null,
            primaryColor: workspace.primaryColor ?? null,
            secondaryColor: workspace.secondaryColor ?? null,
            defaultStyle: workspace.defaultStyle ?? null,
            defaultAspectRatio: workspace.defaultAspectRatio ?? null,
            defaultRecipe: workspace.defaultRecipe ?? null,
            videoCount: workspace.videoCount,
          }
        : null,
    });
  } catch (err) {
    console.error("/api/auth/login error", err);
    return NextResponse.json({ error: "Failed to log in. Please try again." }, { status: 500 });
  }
}
