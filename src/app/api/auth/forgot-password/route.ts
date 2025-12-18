import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/lib/models/User";

interface ForgotPasswordBody {
  email?: string;
}

interface ForgotPasswordResponse {
  message: string;
  resetToken?: string;
}

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as ForgotPasswordBody | null;
    const emailRaw = body?.email;

    if (typeof emailRaw !== "string" || !emailRaw.trim()) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const email = emailRaw.trim().toLowerCase();

    await connectToDatabase();

    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json<ForgotPasswordResponse>({
        message: "If an account exists for this email, a reset link has been created.",
      });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = await bcrypt.hash(rawToken, 10);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    user.resetTokenHash = tokenHash;
    user.resetTokenExpiresAt = expiresAt;
    await user.save();

    return NextResponse.json<ForgotPasswordResponse>({
      message: "If an account exists for this email, a reset link has been created.",
      resetToken: rawToken,
    });
  } catch (err) {
    console.error("/api/auth/forgot-password error", err);
    return NextResponse.json({ error: "Failed to request password reset." }, { status: 500 });
  }
}
