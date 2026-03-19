import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthPayload {
  userId: string;
  role: "athlete" | "coach";
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

const JWT_SECRET = process.env["JWT_SECRET"] ?? "adapt_jwt_secret_dev_only";

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: { code: "AUTH_MISSING_TOKEN", message: "No token provided" } });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: { code: "AUTH_TOKEN_EXPIRED", message: "Token is invalid or expired" } });
    return;
  }
}

export function requireRole(role: "athlete" | "coach") {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: { code: "AUTH_MISSING_TOKEN", message: "Unauthorized" } });
      return;
    }
    if (req.user.role !== role) {
      res.status(403).json({ error: { code: "AUTH_FORBIDDEN", message: "Insufficient permissions" } });
      return;
    }
    next();
  };
}
