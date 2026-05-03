import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useColorScheme } from "react-native";
import { customFetch } from "@workspace/api-client-react";
import { useAuth } from "./AuthContext";
import { DARK_COLORS, LIGHT_COLORS } from "@/constants/theme";

type Language = "fr" | "en";
type Theme = "dark" | "light" | "system";
type Units = "metric" | "imperial";

interface Preferences {
  language: Language;
  theme: Theme;
  units: Units;
}

interface PreferencesContextValue extends Preferences {
  resolvedTheme: "dark" | "light";
  setLanguage: (lang: Language) => void;
  setTheme: (theme: Theme) => void;
  setUnits: (units: Units) => void;
  persist: (partial: Partial<Preferences>) => Promise<void>;
  formatWeight: (kg: number | null | undefined) => string;
  formatDistance: (km: number | null | undefined) => string;
}

const PreferencesContext = createContext<PreferencesContextValue>({
  language: "fr",
  theme: "dark",
  units: "metric",
  resolvedTheme: "dark",
  setLanguage: () => {},
  setTheme: () => {},
  setUnits: () => {},
  persist: async () => {},
  formatWeight: (kg) => (kg != null ? `${kg} kg` : "—"),
  formatDistance: (km) => (km != null ? `${km} km` : "—"),
});

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const systemColorScheme = useColorScheme();
  const [language, setLanguageState] = useState<Language>("fr");
  const [theme, setThemeState] = useState<Theme>("dark");
  const [units, setUnitsState] = useState<Units>("metric");

  const resolvedTheme: "dark" | "light" =
    theme === "system"
      ? (systemColorScheme === "light" ? "light" : "dark")
      : theme;

  useEffect(() => {
    if (!isAuthenticated) return;
    customFetch<{ language?: string; theme?: string; units?: string }>(
      "/api/users/me/profile"
    )
      .then((data) => {
        if (data.language === "en") setLanguageState("en");
        else setLanguageState("fr");
        if (data.theme === "light") setThemeState("light");
        else if (data.theme === "system") setThemeState("system");
        else setThemeState("dark");
        if (data.units === "imperial") setUnitsState("imperial");
        else setUnitsState("metric");
      })
      .catch(() => {});
  }, [isAuthenticated]);

  const persist = useCallback(async (partial: Partial<Preferences>) => {
    await customFetch("/api/users/me/profile", {
      method: "PUT",
      body: JSON.stringify(partial),
    });
  }, []);

  const setLanguage = useCallback(
    (lang: Language) => {
      setLanguageState(lang);
      persist({ language: lang }).catch(() => {});
    },
    [persist]
  );

  const setTheme = useCallback(
    (t: Theme) => {
      setThemeState(t);
      persist({ theme: t }).catch(() => {});
    },
    [persist]
  );

  const setUnits = useCallback(
    (u: Units) => {
      setUnitsState(u);
      persist({ units: u }).catch(() => {});
    },
    [persist]
  );

  const formatWeight = useCallback(
    (kg: number | null | undefined): string => {
      if (kg == null) return "—";
      if (units === "imperial") {
        return `${(kg * 2.20462).toFixed(1)} lbs`;
      }
      return `${kg} kg`;
    },
    [units]
  );

  const formatDistance = useCallback(
    (km: number | null | undefined): string => {
      if (km == null) return "—";
      if (units === "imperial") {
        return `${(km * 0.621371).toFixed(2)} mi`;
      }
      return `${km} km`;
    },
    [units]
  );

  return (
    <PreferencesContext.Provider
      value={{
        language,
        theme,
        units,
        resolvedTheme,
        setLanguage,
        setTheme,
        setUnits,
        persist,
        formatWeight,
        formatDistance,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  return useContext(PreferencesContext);
}

export function useResolvedTheme(): "dark" | "light" {
  return useContext(PreferencesContext).resolvedTheme;
}

export function useFormatWeight() {
  return useContext(PreferencesContext).formatWeight;
}

export function useFormatDistance() {
  return useContext(PreferencesContext).formatDistance;
}

const TRANSLATIONS: Record<Language, Record<string, string>> = {
  fr: {
    kg: "kg", km: "km", lbs: "lbs", mi: "mi",
    weight: "Poids", height: "Taille",
    primary_goal: "Objectif principal", secondary_goal: "Objectif secondaire",
    fitness_level: "Niveau de forme",
    training_context: "Contexte d'entraînement",
    available_days: "Jours d'entraînement",
    training_location: "Lieu d'entraînement",
    equipment: "Équipement disponible",
    session_duration: "Durée de séance",
    session_min: "Minimum", session_max: "Maximum",
    injuries: "Blessures / Restrictions permanentes",
    no_restrictions: "Aucune restriction renseignée",
    exercises: "Exercices", avoided_exercises: "Exercices à éviter",
    favorite_exercises: "Exercices préférés",
    add_exercise: "Ajouter un exercice...",
    from_library: "Depuis la bibliothèque",
    select_exercises: "Sélectionner des exercices",
    done: "Terminer", none: "Aucun",
    preferences: "Préférences",
    language_label: "Langue", theme_label: "Thème", units_label: "Unités",
    health_apps: "Applications santé",
    sync_health_data: "Synchronise tes données de santé avec ADAPT.",
    privacy: "Confidentialité",
    privacy_desc: "Contrôle ce que ton coach peut voir de ton profil.",
    share_weight: "Partager le poids",
    share_sleep: "Partager le sommeil",
    share_heart_rate: "Partager la fréquence cardiaque",
    share_body_fat: "Partager la masse grasse",
    share_context: "Partager le contexte d'entraînement",
    coach_only: "Profil visible par le coach uniquement",
    profile_private: "Profil entièrement privé",
    notifications: "Notifications",
    silent_mode: "Désactiver toutes les notifications",
    morning_notif: "Notification check-in matin",
    session_reminder: "Rappel de séance",
    progress_update: "Mise à jour de progression",
    coach_messages: "Messages du coach",
    save: "Enregistrer", cancel: "Annuler", edit: "Modifier",
    connect: "Connecter", disconnect: "Déconnecter",
    connected: "Connecté", not_connected: "Non connecté",
    achievement: "Succès débloqué",
    weekly_recap: "Récapitulatif hebdo",
    soon: "Bientôt disponible",
    soon_msg: "sera disponible dans une prochaine mise à jour.",
    privacy_visibility: "Visibilité du profil",
    shared_data: "Données partagées avec le coach",
    completion_hint_low: "Complète ton profil pour personnaliser ton entraînement",
    completion_hint_mid: "Quelques informations manquent encore",
    no_injury: "Aucune restriction renseignée",
    units_metric: "Kg / Km",
    units_imperial: "Lbs / Mi",
    lang_fr: "Français",
    lang_en: "English",
    theme_dark: "Sombre",
    theme_light: "Clair",
    theme_system: "Automatique",
    goals: "Objectifs",
    privacy_settings: "Paramètres de confidentialité",
    lang_label: "Langue",
    morning_notif_hour: "Heure de rappel matin",
    notif_types_label: "Types de notifications",
    silent_mode_label: "Mode silencieux",
    privacy_data_desc: "Ces données sont transmises à ton coach sur toutes ses vues. Désactiver un interrupteur masque la donnée partout.",
    privacy_visibility_desc: "Ces paramètres contrôlent la visibilité globale de ton profil. Cumulatifs avec les données partagées ci-dessus.",
    health_coming_soon: "Bientôt disponible",
    error: "Erreur",
    success: "Succès",
    warning: "Attention",
    info: "Information",
    confirm: "Confirmer",
    yes: "Oui",
    no: "Non",
    ok: "OK",
    back: "Retour",
    next: "Suivant",
    previous: "Précédent",
    continue: "Continuer",
    close: "Fermer",
    delete: "Supprimer",
    add: "Ajouter",
    remove: "Retirer",
    update: "Mettre à jour",
    loading: "Chargement…",
    retry: "Réessayer",
    refresh: "Actualiser",
    search: "Rechercher",
    filter: "Filtrer",
    all: "Tous",
    today: "Aujourd'hui",
    yesterday: "Hier",
    tomorrow: "Demain",
    week: "Semaine",
    month: "Mois",
    year: "Année",
    day: "Jour",
    hour: "Heure",
    minute: "Minute",
    second: "Seconde",
    minutes: "minutes",
    seconds: "secondes",
    hours: "heures",
    days: "jours",
    weeks: "semaines",
    months: "mois",
    home: "Accueil",
    session_tab: "Séance",
    stats_tab: "Stats",
    messages_tab: "Messages",
    profile_tab: "Profil",
    welcome: "Bienvenue",
    hello: "Bonjour",
    good_morning: "Bonjour",
    good_afternoon: "Bon après-midi",
    good_evening: "Bonsoir",
    start_session: "Démarrer la séance",
    start: "C'est parti !",
    resume: "Reprendre",
    pause: "Pause",
    stop: "Arrêter",
    finish: "Terminer",
    skip: "Passer",
    rest: "Repos",
    sets: "Séries",
    reps: "Répétitions",
    set: "Série",
    rep: "Rep",
    duration: "Durée",
    rpe: "RPE",
    notes: "Notes",
    note: "Note",
    feedback: "Feedback",
    difficulty: "Difficulté",
    easy: "Facile",
    medium: "Moyen",
    hard: "Difficile",
    too_easy: "Trop facile",
    just_right: "Parfait",
    too_hard: "Trop difficile",
    cannot_start_session: "Impossible de démarrer cette séance. Réessaie.",
    cannot_start_program: "Impossible de démarrer le programme. Réessaie.",
    cannot_log_exercise: "Impossible d'enregistrer l'exercice.",
    cannot_save: "Impossible d'enregistrer. Réessaie.",
    cannot_load: "Impossible de charger les données.",
    network_error: "Erreur réseau. Vérifie ta connexion.",
    session_completed: "Séance terminée !",
    great_job: "Bien joué !",
    keep_going: "Continue comme ça !",
    no_session_today: "Pas de séance aujourd'hui",
    next_session: "Prochaine séance",
    upcoming_sessions: "Séances à venir",
    history: "Historique",
    library: "Bibliothèque",
    programs: "Programmes",
    challenges: "Défis",
    badges: "Badges",
    guides: "Guides",
    nutrition: "Nutrition",
    sleep: "Sommeil",
    steps: "Pas",
    heart_rate: "Fréquence cardiaque",
    body_fat: "Masse grasse",
    bmi: "IMC",
    calories: "Calories",
    protein: "Protéines",
    carbs: "Glucides",
    fat: "Lipides",
    water: "Eau",
    checkin: "Check-in",
    morning_checkin: "Check-in du matin",
    daily_checkin: "Check-in quotidien",
    mood: "Humeur",
    energy: "Énergie",
    motivation: "Motivation",
    soreness: "Courbatures",
    stress: "Stress",
    coach: "Coach",
    athlete: "Athlète",
    message_placeholder: "Écris un message…",
    send: "Envoyer",
    no_messages: "Aucun message",
    new_message: "Nouveau message",
    login: "Connexion",
    register: "Inscription",
    logout: "Déconnexion",
    email: "Email",
    password: "Mot de passe",
    confirm_password: "Confirmer le mot de passe",
    forgot_password: "Mot de passe oublié ?",
    reset_password: "Réinitialiser le mot de passe",
    sign_in: "Se connecter",
    sign_up: "S'inscrire",
    invalid_credentials: "Identifiants invalides",
    required_field: "Champ requis",
    invalid_email: "Email invalide",
    password_too_short: "Mot de passe trop court",
    passwords_dont_match: "Les mots de passe ne correspondent pas",
    onboarding_welcome: "Bienvenue sur ADAPT",
    onboarding_goal: "Quel est ton objectif ?",
    onboarding_fitness: "Quel est ton niveau ?",
    onboarding_profile: "Ton profil",
    onboarding_invite: "Code d'invitation",
    enter_invite_code: "Entrer le code",
    skip_for_now: "Passer pour l'instant",
    name: "Nom",
    first_name: "Prénom",
    last_name: "Nom",
    age: "Âge",
    gender: "Genre",
    male: "Homme",
    female: "Femme",
    other: "Autre",
    birthdate: "Date de naissance",
    no_data: "Aucune donnée",
    empty_state: "Rien à afficher pour le moment",
    coming_soon: "Bientôt disponible",
    about: "À propos",
    version: "Version",
    terms: "Conditions d'utilisation",
    privacy_policy: "Politique de confidentialité",
    contact: "Contact",
    help: "Aide",
    settings: "Paramètres",
    account: "Compte",
    delete_account: "Supprimer le compte",
    confirm_logout: "Veux-tu vraiment te déconnecter ?",
    confirm_delete: "Cette action est irréversible. Continuer ?",
    saved: "Enregistré",
    updated: "Mis à jour",
    deleted: "Supprimé",
    sent: "Envoyé",
    copied: "Copié",
  },
  en: {
    kg: "kg", km: "km", lbs: "lbs", mi: "mi",
    weight: "Weight", height: "Height",
    primary_goal: "Primary goal", secondary_goal: "Secondary goal",
    fitness_level: "Fitness level",
    training_context: "Training context",
    available_days: "Training days",
    training_location: "Training location",
    equipment: "Available equipment",
    session_duration: "Session duration",
    session_min: "Minimum", session_max: "Maximum",
    injuries: "Injuries / Permanent restrictions",
    no_restrictions: "No restrictions provided",
    exercises: "Exercises", avoided_exercises: "Exercises to avoid",
    favorite_exercises: "Favorite exercises",
    add_exercise: "Add an exercise...",
    from_library: "From library",
    select_exercises: "Select exercises",
    done: "Done", none: "None",
    preferences: "Preferences",
    language_label: "Language", theme_label: "Theme", units_label: "Units",
    health_apps: "Health apps",
    sync_health_data: "Sync your health data with ADAPT.",
    privacy: "Privacy",
    privacy_desc: "Control what your coach can see from your profile.",
    share_weight: "Share weight",
    share_sleep: "Share sleep",
    share_heart_rate: "Share heart rate",
    share_body_fat: "Share body fat",
    share_context: "Share training context",
    coach_only: "Coach-only profile",
    profile_private: "Fully private profile",
    notifications: "Notifications",
    silent_mode: "Disable all notifications",
    morning_notif: "Morning check-in notification",
    session_reminder: "Session reminder",
    progress_update: "Progress update",
    coach_messages: "Coach messages",
    save: "Save", cancel: "Cancel", edit: "Edit",
    connect: "Connect", disconnect: "Disconnect",
    connected: "Connected", not_connected: "Not connected",
    achievement: "Achievement unlocked",
    weekly_recap: "Weekly summary",
    soon: "Coming soon",
    soon_msg: "will be available in a future update.",
    privacy_visibility: "Profile visibility",
    shared_data: "Data shared with coach",
    completion_hint_low: "Complete your profile to personalize your training",
    completion_hint_mid: "Some information is still missing",
    no_injury: "No restrictions noted",
    units_metric: "Kg / Km",
    units_imperial: "Lbs / Mi",
    lang_fr: "Français",
    lang_en: "English",
    theme_dark: "Dark",
    theme_light: "Light",
    theme_system: "Auto",
    goals: "Goals",
    privacy_settings: "Privacy settings",
    lang_label: "Language",
    morning_notif_hour: "Morning reminder time",
    notif_types_label: "Notification types",
    silent_mode_label: "Silent mode",
    privacy_data_desc: "This data is shared with your coach across all views. Disabling a toggle hides the data everywhere.",
    privacy_visibility_desc: "These settings control the global visibility of your profile. Cumulative with the shared data above.",
    health_coming_soon: "Coming soon",
    error: "Error",
    success: "Success",
    warning: "Warning",
    info: "Info",
    confirm: "Confirm",
    yes: "Yes",
    no: "No",
    ok: "OK",
    back: "Back",
    next: "Next",
    previous: "Previous",
    continue: "Continue",
    close: "Close",
    delete: "Delete",
    add: "Add",
    remove: "Remove",
    update: "Update",
    loading: "Loading…",
    retry: "Retry",
    refresh: "Refresh",
    search: "Search",
    filter: "Filter",
    all: "All",
    today: "Today",
    yesterday: "Yesterday",
    tomorrow: "Tomorrow",
    week: "Week",
    month: "Month",
    year: "Year",
    day: "Day",
    hour: "Hour",
    minute: "Minute",
    second: "Second",
    minutes: "minutes",
    seconds: "seconds",
    hours: "hours",
    days: "days",
    weeks: "weeks",
    months: "months",
    home: "Home",
    session_tab: "Session",
    stats_tab: "Stats",
    messages_tab: "Messages",
    profile_tab: "Profile",
    welcome: "Welcome",
    hello: "Hello",
    good_morning: "Good morning",
    good_afternoon: "Good afternoon",
    good_evening: "Good evening",
    start_session: "Start session",
    start: "Let's go!",
    resume: "Resume",
    pause: "Pause",
    stop: "Stop",
    finish: "Finish",
    skip: "Skip",
    rest: "Rest",
    sets: "Sets",
    reps: "Reps",
    set: "Set",
    rep: "Rep",
    duration: "Duration",
    rpe: "RPE",
    notes: "Notes",
    note: "Note",
    feedback: "Feedback",
    difficulty: "Difficulty",
    easy: "Easy",
    medium: "Medium",
    hard: "Hard",
    too_easy: "Too easy",
    just_right: "Just right",
    too_hard: "Too hard",
    cannot_start_session: "Couldn't start this session. Try again.",
    cannot_start_program: "Couldn't start the program. Try again.",
    cannot_log_exercise: "Couldn't log the exercise.",
    cannot_save: "Couldn't save. Try again.",
    cannot_load: "Couldn't load data.",
    network_error: "Network error. Check your connection.",
    session_completed: "Session completed!",
    great_job: "Great job!",
    keep_going: "Keep it up!",
    no_session_today: "No session today",
    next_session: "Next session",
    upcoming_sessions: "Upcoming sessions",
    history: "History",
    library: "Library",
    programs: "Programs",
    challenges: "Challenges",
    badges: "Badges",
    guides: "Guides",
    nutrition: "Nutrition",
    sleep: "Sleep",
    steps: "Steps",
    heart_rate: "Heart rate",
    body_fat: "Body fat",
    bmi: "BMI",
    calories: "Calories",
    protein: "Protein",
    carbs: "Carbs",
    fat: "Fat",
    water: "Water",
    checkin: "Check-in",
    morning_checkin: "Morning check-in",
    daily_checkin: "Daily check-in",
    mood: "Mood",
    energy: "Energy",
    motivation: "Motivation",
    soreness: "Soreness",
    stress: "Stress",
    coach: "Coach",
    athlete: "Athlete",
    message_placeholder: "Write a message…",
    send: "Send",
    no_messages: "No messages",
    new_message: "New message",
    login: "Sign in",
    register: "Sign up",
    logout: "Log out",
    email: "Email",
    password: "Password",
    confirm_password: "Confirm password",
    forgot_password: "Forgot password?",
    reset_password: "Reset password",
    sign_in: "Sign in",
    sign_up: "Sign up",
    invalid_credentials: "Invalid credentials",
    required_field: "Required field",
    invalid_email: "Invalid email",
    password_too_short: "Password too short",
    passwords_dont_match: "Passwords don't match",
    onboarding_welcome: "Welcome to ADAPT",
    onboarding_goal: "What's your goal?",
    onboarding_fitness: "What's your level?",
    onboarding_profile: "Your profile",
    onboarding_invite: "Invite code",
    enter_invite_code: "Enter code",
    skip_for_now: "Skip for now",
    name: "Name",
    first_name: "First name",
    last_name: "Last name",
    age: "Age",
    gender: "Gender",
    male: "Male",
    female: "Female",
    other: "Other",
    birthdate: "Date of birth",
    no_data: "No data",
    empty_state: "Nothing to show yet",
    coming_soon: "Coming soon",
    about: "About",
    version: "Version",
    terms: "Terms of use",
    privacy_policy: "Privacy policy",
    contact: "Contact",
    help: "Help",
    settings: "Settings",
    account: "Account",
    delete_account: "Delete account",
    confirm_logout: "Do you really want to log out?",
    confirm_delete: "This action cannot be undone. Continue?",
    saved: "Saved",
    updated: "Updated",
    deleted: "Deleted",
    sent: "Sent",
    copied: "Copied",
  },
};

export function useT() {
  const { language } = usePreferences();
  return useCallback(
    (key: string, fallback?: string): string => {
      const dict = TRANSLATIONS[language] ?? TRANSLATIONS.fr;
      return dict[key] ?? fallback ?? key;
    },
    [language]
  );
}

export function useUnitsLabel() {
  const { units } = usePreferences();
  return {
    weight: units === "imperial" ? "lbs" : "kg",
    distance: units === "imperial" ? "mi" : "km",
    isImperial: units === "imperial",
  };
}

export function useThemeColors() {
  const { resolvedTheme } = usePreferences();
  return resolvedTheme === "light" ? LIGHT_COLORS : DARK_COLORS;
}
