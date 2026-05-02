import type { Request, Response, NextFunction } from "express";
import { normalizeLocale, type Locale } from "../locales/index.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      locale: Locale;
    }
  }
}

export function localeMiddleware(req: Request, _res: Response, next: NextFunction) {
  const explicit = req.header("x-language") ?? req.query["lang"]?.toString();
  const acceptLang = req.header("accept-language");
  req.locale = normalizeLocale(explicit ?? acceptLang ?? undefined);
  next();
}
