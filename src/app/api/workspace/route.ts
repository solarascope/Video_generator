import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Workspace } from "@/lib/models/Workspace";
import { getAuthFromRequest } from "@/lib/auth";

export const runtime = "nodejs";

type WorkspaceUpdateBody = Partial<{
  name: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  defaultStyle: string;
  defaultAspectRatio: string;
  defaultRecipe: string;
}>;

export async function GET(request: Request) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth?.workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const workspace = await Workspace.findById(auth.workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: workspace._id.toString(),
      name: workspace.name,
      logoUrl: workspace.logoUrl ?? null,
      primaryColor: workspace.primaryColor ?? null,
      secondaryColor: workspace.secondaryColor ?? null,
      defaultStyle: workspace.defaultStyle ?? null,
      defaultAspectRatio: workspace.defaultAspectRatio ?? null,
      defaultRecipe: workspace.defaultRecipe ?? null,
      videoCount: workspace.videoCount,
    });
  } catch (err) {
    console.error("/api/workspace GET error", err);
    return NextResponse.json({ error: "Failed to load workspace." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth?.workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const body = (await request.json().catch(() => null)) as WorkspaceUpdateBody | null;

    const update: Record<string, unknown> = {};
    const updatableKeys: (keyof WorkspaceUpdateBody)[] = [
      "name",
      "logoUrl",
      "primaryColor",
      "secondaryColor",
      "defaultStyle",
      "defaultAspectRatio",
      "defaultRecipe",
    ];

    for (const key of updatableKeys) {
      const value = body?.[key];
      if (typeof value === "string") {
        update[key] = value.trim();
      }
    }

    const workspace = await Workspace.findByIdAndUpdate(auth.workspaceId, update, { new: true });
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: workspace._id.toString(),
      name: workspace.name,
      logoUrl: workspace.logoUrl ?? null,
      primaryColor: workspace.primaryColor ?? null,
      secondaryColor: workspace.secondaryColor ?? null,
      defaultStyle: workspace.defaultStyle ?? null,
      defaultAspectRatio: workspace.defaultAspectRatio ?? null,
      defaultRecipe: workspace.defaultRecipe ?? null,
      videoCount: workspace.videoCount,
    });
  } catch (err) {
    console.error("/api/workspace PATCH error", err);
    return NextResponse.json({ error: "Failed to update workspace." }, { status: 500 });
  }
}
