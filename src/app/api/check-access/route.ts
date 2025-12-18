import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

type AccessState = "active" | "inactive" | "expired";

interface AccessKeyRecord {
  key: string;
  state: AccessState;
  expiresAt?: string;
}

interface CheckAccessResponse {
  valid: boolean;
  state: AccessState;
  error?: string;
}

function loadAccessKeys(): AccessKeyRecord[] {
  try {
    const filePath = path.join(process.cwd(), "data", "access-keys.json");
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => typeof item?.key === "string" && typeof item?.state === "string");
  } catch (err) {
    console.error("/api/check-access failed to read access-keys.json", err);
    return [];
  }
}

function evaluateKey(record: AccessKeyRecord | undefined): CheckAccessResponse {
  if (!record) {
    return { valid: false, state: "inactive" };
  }

  if (record.expiresAt) {
    const expires = new Date(record.expiresAt).getTime();
    if (!Number.isNaN(expires) && Date.now() > expires) {
      return { valid: false, state: "expired" };
    }
  }

  if (record.state !== "active") {
    return { valid: false, state: record.state };
  }

  return { valid: true, state: "active" };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { key?: string } | null;

    const key = body?.key?.trim();
    if (!key) {
      return NextResponse.json<CheckAccessResponse>(
        { valid: false, state: "inactive", error: "Access key is required." },
        { status: 400 },
      );
    }

    const keys = loadAccessKeys();
    const record = keys.find((item) => item.key === key);

    const result = evaluateKey(record);

    return NextResponse.json<CheckAccessResponse>(result);
  } catch (err: unknown) {
    console.error("/api/check-access error", err);

    return NextResponse.json<CheckAccessResponse>(
      {
        valid: false,
        state: "inactive",
        error: "Unable to validate access key at the moment. Please try again later.",
      },
      { status: 500 },
    );
  }
}
