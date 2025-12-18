import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.warn("[auth] JWT_SECRET is not set. Auth APIs will fail until it is configured.");
}

export interface AuthTokenPayload {
  userId: string;
  workspaceId?: string;
  iat?: number;
  exp?: number;
}

export function signAuthToken(payload: { userId: string; workspaceId?: string }): string {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  const decoded = jwt.verify(token, JWT_SECRET);
  if (typeof decoded === "string") {
    throw new Error("Invalid token payload");
  }
  return decoded as AuthTokenPayload;
}

export function getAuthFromRequest(request: Request): AuthTokenPayload | null {
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;

  try {
    return verifyAuthToken(token);
  } catch {
    return null;
  }
}
