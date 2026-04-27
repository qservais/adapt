type HttpError = { status: number; data?: unknown };

function isHttpError(err: unknown): err is HttpError {
  return (
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    typeof (err as Record<string, unknown>).status === "number"
  );
}

function isNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes("network request failed") ||
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("net::err") ||
    msg.includes("load failed")
  );
}

function getErrorCode(err: HttpError): string | undefined {
  const data = err.data as { error?: { code?: string } } | null | undefined;
  return data?.error?.code;
}

export function getApiErrorMessage(
  err: unknown,
  statusMessages: Partial<Record<number, string>>,
  codeMessages: Partial<Record<string, string>>,
  defaultMessage: string
): string {
  if (isHttpError(err)) {
    const code = getErrorCode(err);
    if (code && codeMessages[code]) return codeMessages[code]!;
    const byStatus = statusMessages[err.status];
    if (byStatus) return byStatus;
  }
  return defaultMessage;
}

export function getRegisterErrorMessage(err: unknown): string {
  return getApiErrorMessage(
    err,
    {
      409: "Cette adresse email est déjà utilisée.",
      400: "Données invalides. Vérifie tes informations.",
      429: "Trop de tentatives. Réessaie dans quelques minutes.",
    },
    {
      EMAIL_IN_USE: "Cette adresse email est déjà utilisée.",
      VALIDATION_ERROR: "Données invalides. Vérifie tes informations.",
    },
    "Échec de l'inscription. Réessaie."
  );
}

export function getLoginErrorMessage(err: unknown): string {
  return getApiErrorMessage(
    err,
    {
      401: "Email ou mot de passe incorrect.",
      403: "Accès refusé.",
      429: "Trop de tentatives. Réessaie dans quelques minutes.",
    },
    {
      INVALID_CREDENTIALS: "Email ou mot de passe incorrect.",
      ACCOUNT_DISABLED: "Ce compte a été désactivé. Contacte ton coach.",
    },
    "Connexion impossible. Réessaie."
  );
}

export function getGenericErrorMessage(err: unknown, defaultMessage: string): string {
  if (isNetworkError(err)) return "Pas de connexion. Réessaie.";
  return getApiErrorMessage(
    err,
    { 503: "Pas de connexion. Réessaie." },
    {},
    defaultMessage
  );
}
