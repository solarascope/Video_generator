import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/lib/models/User";

interface ResetPasswordBody {
  token?: string;
  password?: string;
}

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as ResetPasswordBody | null;
    const token = body?.token;
    const password = body?.password;

    if (typeof token !== "string" || !token.trim() || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "Token and new password (min 6 chars) are required." },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const now = new Date();
    const candidates = await User.find({
      resetTokenExpiresAt: { $gt: now },
      resetTokenHash: { $exists: true },
    });

    let matchedUser: (typeof candidates)[number] | null = null;

    for (const candidate of candidates) {
      if (candidate.resetTokenHash && (await bcrypt.compare(token, candidate.resetTokenHash))) {
        matchedUser = candidate;
        break;
      }
    }

    if (!matchedUser) {
      return NextResponse.json({ error: "Invalid or expired reset token." }, { status: 400 });
    }

    const newHash = await bcrypt.hash(password, 10);
    matchedUser.passwordHash = newHash;
    matchedUser.resetTokenHash = undefined;
    matchedUser.resetTokenExpiresAt = undefined;
    await matchedUser.save();

    return NextResponse.json({ message: "Password has been reset. You can now log in." });
  } catch (err) {
    console.error("/api/auth/reset-password error", err);
    return NextResponse.json({ error: "Failed to reset password." }, { status: 500 });
  }
}
