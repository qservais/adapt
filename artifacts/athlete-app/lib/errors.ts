function isHttpError(err: unknown): err is { status: number } {
  return (
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    typeof (err as Record<string, unknown>).status === "number"
  );
}

export function getApiErrorMessage(
  err: unknown,
  statusMessages: Partial<Record<number, string>>,
  defaultMessage: string
): string {
  if (isHttpError(err)) {
    const specific = statusMessages[err.status];
    if (specific) return specific;
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
    "Connexion impossible. Réessaie."
  );
}

export function getGenericErrorMessage(err: unknown, defaultMessage: string): string {
  return getApiErrorMessage(err, {}, defaultMessage);
}
