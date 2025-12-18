import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/lib/models/User";
import { Workspace } from "@/lib/models/Workspace";
import { getAuthFromRequest } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const user = await User.findById(auth.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const workspace = auth.workspaceId ? await Workspace.findById(auth.workspaceId) : user.workspaceId ? await Workspace.findById(user.workspaceId) : null;

    return NextResponse.json({
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
    console.error("/api/auth/me error", err);
    return NextResponse.json({ error: "Failed to load account." }, { status: 500 });
  }
}
