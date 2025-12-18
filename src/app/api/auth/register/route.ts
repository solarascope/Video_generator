import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/lib/models/User";
import { Workspace } from "@/lib/models/Workspace";
import { signAuthToken } from "@/lib/auth";

interface RegisterBody {
  email?: string;
  password?: string;
  workspaceName?: string;
}

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await connectToDatabase();

    const body = (await request.json().catch(() => null)) as RegisterBody | null;
    const emailRaw = body?.email;
    const password: string | undefined = body?.password;
    const workspaceNameRaw = body?.workspaceName;

    if (typeof emailRaw !== "string" || !emailRaw.trim() || typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ error: "Email and password (min 6 chars) are required." }, { status: 400 });
    }

    const email = emailRaw.trim().toLowerCase();
    const existing = await User.findOne({ email }).lean();
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const workspaceName: string =
      typeof workspaceNameRaw === "string" && workspaceNameRaw.trim()
        ? workspaceNameRaw.trim()
        : `${email.split("@")[0]}'s Workspace`;

    const user = await User.create({
      email,
      passwordHash,
    });

    const workspace = await Workspace.create({
      ownerId: user._id,
      name: workspaceName,
      videoCount: 0,
    });

    user.workspaceId = workspace._id;
    await user.save();

    const token = signAuthToken({ userId: user._id.toString(), workspaceId: workspace._id.toString() });

    return NextResponse.json({
      token,
      user: { id: user._id.toString(), email: user.email },
      workspace: {
        id: workspace._id.toString(),
        name: workspace.name,
        logoUrl: workspace.logoUrl ?? null,
        primaryColor: workspace.primaryColor ?? null,
        secondaryColor: workspace.secondaryColor ?? null,
        defaultStyle: workspace.defaultStyle ?? null,
        defaultAspectRatio: workspace.defaultAspectRatio ?? null,
        defaultRecipe: workspace.defaultRecipe ?? null,
        videoCount: workspace.videoCount,
      },
    });
  } catch (err) {
    console.error("/api/auth/register error", err);
    return NextResponse.json({ error: "Failed to register. Please try again." }, { status: 500 });
  }
}
