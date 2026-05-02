export type Locale = "fr" | "en";

export const SUPPORTED_LOCALES: readonly Locale[] = ["fr", "en"] as const;
export const DEFAULT_LOCALE: Locale = "fr";

export function normalizeLocale(input: string | undefined | null): Locale {
  if (!input) return DEFAULT_LOCALE;
  const lower = input.toLowerCase().split(/[-_,;]/)[0];
  if (lower === "en") return "en";
  if (lower === "fr") return "fr";
  return DEFAULT_LOCALE;
}

const messages = {
  errors: {
    invalidCredentials: { fr: "Identifiants invalides", en: "Invalid credentials" },
    accessDenied: { fr: "Accès refusé", en: "Access denied" },
    unauthorized: { fr: "Non autorisé", en: "Unauthorized" },
    notFound: { fr: "Ressource introuvable", en: "Resource not found" },
    badRequest: { fr: "Requête invalide", en: "Invalid request" },
    serverError: { fr: "Erreur interne du serveur", en: "Internal server error" },
    validationFailed: { fr: "Validation échouée", en: "Validation failed" },
    emailInvalid: { fr: "Adresse email invalide", en: "Invalid email address" },
    emailRequired: { fr: "Email obligatoire", en: "Email required" },
    passwordTooShort: { fr: "Le mot de passe doit contenir au moins 8 caractères", en: "Password must be at least 8 characters" },
    passwordRequired: { fr: "Mot de passe obligatoire", en: "Password required" },
    emailAlreadyExists: { fr: "Un compte existe déjà avec cette adresse email", en: "An account with this email already exists" },
    invalidOrExpiredToken: { fr: "Lien invalide ou expiré. Demande un nouveau lien.", en: "Invalid or expired link. Request a new one." },
    sessionExpired: { fr: "Session expirée. Reconnecte-toi.", en: "Session expired. Please sign in again." },
    fileTooLarge: { fr: "Fichier trop volumineux", en: "File too large" },
    fileFormatInvalid: { fr: "Format de fichier non supporté", en: "Unsupported file format" },
    rateLimited: { fr: "Trop de tentatives. Réessaie dans un instant.", en: "Too many attempts. Try again shortly." },
    invalidProgramId: { fr: "Programme invalide", en: "Invalid program" },
    invalidClientId: { fr: "Athlète invalide", en: "Invalid athlete" },
    forbidden: { fr: "Action non autorisée", en: "Action not allowed" },
    missingField: { fr: "Champ obligatoire manquant", en: "Required field missing" },
    invalidDate: { fr: "Date invalide", en: "Invalid date" },
    coachOnly: { fr: "Réservé aux coachs", en: "Coaches only" },
    athleteOnly: { fr: "Réservé aux athlètes", en: "Athletes only" },
    duplicateEntry: { fr: "Doublon détecté", en: "Duplicate entry" },
    networkError: { fr: "Erreur réseau", en: "Network error" },
    requestFailed: { fr: "Requête échouée", en: "Request failed" },
  },
} as const;

type MessagePath = `errors.${keyof typeof messages.errors}`;

export function t(locale: Locale, key: MessagePath): string {
  const [namespace, name] = key.split(".") as [keyof typeof messages, string];
  const ns = messages[namespace] as Record<string, Record<Locale, string>> | undefined;
  if (!ns) return key;
  const entry = ns[name];
  if (!entry) return key;
  return entry[locale] ?? entry[DEFAULT_LOCALE] ?? key;
}

export { messages };
