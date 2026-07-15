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
    userNotFound: { fr: "Utilisateur non trouvé", en: "User not found" },
    webPushNotConfigured: { fr: "Web push n'est pas configuré sur ce serveur", en: "Web push is not configured on this server" },
    imageTooLarge5Mb: { fr: "L'image ne doit pas dépasser 5 MB", en: "Image must not exceed 5 MB" },
    noAvatar: { fr: "Pas d'avatar", en: "No avatar" },
    avatarNotFound: { fr: "Avatar introuvable", en: "Avatar not found" },
    avatarLoadError: { fr: "Erreur lors du chargement de l'avatar", en: "Error loading avatar" },
    noFileProvided: { fr: "Aucun fichier fourni", en: "No file provided" },
    photoUploadError: { fr: "Erreur lors de l'upload de la photo", en: "Error uploading photo" },
    noCoachLinked: { fr: "Aucun coach lié à ce compte", en: "No coach linked to this account" },
    providerNotRecognized: { fr: "Fournisseur non reconnu", en: "Unrecognized provider" },
    programNotFound: { fr: "Programme introuvable", en: "Program not found" },
    templateNotFound: { fr: "Modèle introuvable", en: "Template not found" },
    athleteNotLinkedCoach: { fr: "Athlète non lié à ce coach", en: "Athlete not linked to this coach" },
    startDateRequired: { fr: "startDate requis (YYYY-MM-DD)", en: "startDate required (YYYY-MM-DD)" },
    weekDayRequired: { fr: "weekNumber et dayNumber sont requis", en: "weekNumber and dayNumber are required" },
    programNotFoundOrUnauthorized: { fr: "Programme introuvable ou non autorisé", en: "Program not found or not authorized" },
    weekOutOfBounds: { fr: "Semaine hors limites du programme", en: "Week out of program bounds" },
    sessionNotFoundInProgram: { fr: "Séance introuvable dans ce programme", en: "Session not found in this program" },
    insertWeekOutOfBounds: { fr: "Impossible d'insérer une semaine à cette position", en: "Cannot insert a week at that position" },
    checkinAlreadyExists: { fr: "Tu as déjà fait ton check-in aujourd'hui", en: "You have already checked in today" },
    contentOrMediaRequired: { fr: "Contenu ou média requis", en: "Content or media required" },
    mediaUrlInvalid: { fr: "URL média invalide", en: "Invalid media URL" },
    mediaMustBeObjectStorage: { fr: "Le média doit être hébergé sur le stockage objet", en: "Media must be hosted on object storage" },
    fileExceeds10Mb: { fr: "Le fichier dépasse la limite de 10 Mo.", en: "File exceeds the 10 MB limit." },
    unsupportedDocFormat: { fr: "Format non supporté. Formats acceptés : PDF, Word, Excel, images (JPG, PNG, HEIC).", en: "Unsupported format. Accepted: PDF, Word, Excel, images (JPG, PNG, HEIC)." },
    objectStorageVerifyFailed: { fr: "Impossible de vérifier le fichier sur le stockage objet", en: "Unable to verify file on object storage" },
    mimeTypeRequired: { fr: "mimeType, fileSize et fileName sont requis", en: "mimeType, fileSize and fileName are required" },
    uploadUrlAudioError: { fr: "Impossible de générer l'URL d'upload audio", en: "Unable to generate audio upload URL" },
    uploadUrlVideoError: { fr: "Impossible de générer l'URL d'upload vidéo", en: "Unable to generate video upload URL" },
    uploadUrlError: { fr: "Impossible de générer l'URL d'upload", en: "Unable to generate upload URL" },
    uploadUrlDocumentError: { fr: "Impossible de générer l'URL d'upload document", en: "Unable to generate document upload URL" },
    inviteCodeInvalidFormat: { fr: "Code invalide (6 caractères requis)", en: "Invalid code (6 characters required)" },
    inviteCodeInvalid: { fr: "Code d'invitation invalide", en: "Invalid invite code" },
    athleteAlreadyLinked: { fr: "Cet athlète est déjà lié à un autre coach", en: "This athlete is already linked to another coach" },
    athleteIdInvalid: { fr: "athleteId invalide", en: "Invalid athleteId" },
    athleteNotFoundOrLinked: { fr: "Athlète non trouvé ou non lié", en: "Athlete not found or not linked" },
    clientNotFoundOrLinked: { fr: "Client non trouvé ou non lié", en: "Client not found or not linked" },
    testNotFound: { fr: "Test introuvable", en: "Test not found" },
    sessionLogNotFound: { fr: "Journal de séance introuvable", en: "Session log not found" },
    coachNotFound: { fr: "Coach introuvable", en: "Coach not found" },
    requestNotFound: { fr: "Demande introuvable", en: "Request not found" },
    exerciseNotFound: { fr: "Exercice introuvable", en: "Exercise not found" },
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
