import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Slider from "@react-native-community/slider";
import { Feather } from "@expo/vector-icons";
import { customFetch } from "@workspace/api-client-react";
import { COLORS, FONTS } from "@/constants/theme";
import { useFocusEffect } from "@react-navigation/native";
import { usePreferences, useT, useThemeColors } from "@/context/PreferencesContext";

type IntegrationStatus = {
  provider: string;
  isConnected: boolean;
  connectedAt: string | null;
  lastSyncAt: string | null;
};

type ExtendedProfileData = {
  completionPercent: number;
  primaryGoal: string | null;
  fitnessLevel: string | null;
  injuries: string | null;
  secondaryGoal: string | null;
  sessionDurationMin: number | null;
  sessionDurationMax: number | null;
  availableDays: string[];
  trainingLocations: string[];
  equipment: string[];
  avoidedExercises: string[];
  favoriteExercises: string[];
  language: string;
  theme: string;
  units: string;
  morningNotifHour: number;
  notificationPrefs: Record<string, boolean>;
  privacySettings: {
    shareWeight?: boolean;
    shareSleep?: boolean;
    shareHeartRate?: boolean;
    shareBodyFat?: boolean;
    shareContext?: boolean;
    profileVisibility?: "coach_only" | "private";
  };
  integrations: IntegrationStatus[];
};

const DAYS = [
  { key: "lun", label: "L" },
  { key: "mar", label: "M" },
  { key: "mer", label: "Me" },
  { key: "jeu", label: "J" },
  { key: "ven", label: "V" },
  { key: "sam", label: "S" },
  { key: "dim", label: "D" },
];

const LOCATIONS = [
  { key: "gym", label: "Salle", icon: "zap" as const },
  { key: "home", label: "Maison", icon: "home" as const },
  { key: "outdoor", label: "Extérieur", icon: "sun" as const },
];

const EQUIPMENT_OPTIONS = [
  { key: "barbell", label: "Barre" },
  { key: "dumbbell", label: "Haltères" },
  { key: "kettlebell", label: "Kettlebell" },
  { key: "machine", label: "Machines" },
  { key: "cable", label: "Poulie" },
  { key: "bodyweight", label: "Poids du corps" },
  { key: "bands", label: "Élastiques" },
  { key: "trx", label: "TRX" },
];

const PRIMARY_GOALS = [
  { key: "strength", label: "Force" },
  { key: "muscle", label: "Prise de masse" },
  { key: "fat_loss", label: "Perte de poids" },
  { key: "performance", label: "Performance" },
  { key: "health", label: "Santé" },
  { key: "aesthetic", label: "Esthétique" },
  { key: "fitness", label: "Forme générale" },
];

const FITNESS_LEVELS = [
  { key: "beginner", label: "Débutant" },
  { key: "intermediate", label: "Intermédiaire" },
  { key: "advanced", label: "Avancé" },
  { key: "expert", label: "Expert" },
];

const SECONDARY_GOALS = [
  { key: "mobility", label: "Mobilité" },
  { key: "endurance", label: "Endurance" },
  { key: "flexibility", label: "Souplesse" },
  { key: "power", label: "Explosivité" },
  { key: "balance", label: "Équilibre" },
  { key: "stress", label: "Bien-être" },
  { key: "sport", label: "Sport spécifique" },
];

const EXERCISE_LIBRARY = [
  { category: "Force", items: ["Squat", "Soulevé de terre", "Développé couché", "Tractions", "Dips", "Presse militaire", "Curl biceps", "Extension triceps", "Rowing barre", "Leg press"] },
  { category: "Cardio", items: ["Course à pied", "Vélo", "Corde à sauter", "Rameur", "Natation", "Elliptique"] },
  { category: "Polyvalent", items: ["Burpees", "Pompes", "Fentes", "Kettlebell swing", "Box jump", "Mountain climbers"] },
  { category: "Core", items: ["Gainage", "Crunch", "Russian twist", "Planche latérale", "Superman", "Relevé de jambes"] },
];

const HEALTH_APPS = [
  { key: "apple_health", label: "Apple Santé", icon: "❤️", color: "#FF2D55" },
  { key: "garmin", label: "Garmin Connect", icon: "⌚", color: "#009CDE" },
  { key: "strava", label: "Strava", icon: "🏃", color: "#FC4C02" },
  { key: "whoop", label: "Whoop", icon: "💪", color: "#00D1CA" },
  { key: "fitbit", label: "Fitbit", icon: "📊", color: "#00B0B9" },
];

const NOTIF_TYPE_KEYS = [
  { key: "check_in_reminder", tKey: "morning_notif", fallback: "Rappel check-in" },
  { key: "session_reminder", tKey: "session_reminder", fallback: "Rappel séance" },
  { key: "coach_message", tKey: "coach_messages", fallback: "Message coach" },
  { key: "achievement", tKey: "achievement", fallback: "Succès débloqué" },
  { key: "weekly_recap", tKey: "weekly_recap", fallback: "Récapitulatif hebdo" },
];

const NOTIF_HOURS = [5, 6, 7, 8, 9, 10, 11, 12];

function CompletionBar({ percent }: { percent: number }) {
  const animWidth = useRef(new Animated.Value(0)).current;
  const colors = useThemeColors();
  const t = useT();

  useEffect(() => {
    Animated.timing(animWidth, {
      toValue: percent,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [percent]);

  const color =
    percent >= 80 ? COLORS.cyan :
    percent >= 50 ? COLORS.violet :
    COLORS.amber;

  return (
    <View style={[cStyles.completionWrap, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      <View style={cStyles.completionRow}>
        <Text style={[cStyles.completionLabel, { fontFamily: FONTS.mono }]}>
          PROFIL COMPLÉTÉ
        </Text>
        <Text style={[cStyles.completionPct, { fontFamily: FONTS.bodyBold, color }]}>
          {percent}%
        </Text>
      </View>
      <View style={cStyles.completionTrack}>
        <Animated.View
          style={[
            cStyles.completionFill,
            {
              backgroundColor: color,
              width: animWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>
      {percent < 80 && (
        <Text style={[cStyles.completionHint, { fontFamily: FONTS.body }]}>
          {percent < 40
            ? t("completion_hint_low", "Complète ton profil pour personnaliser ton entraînement")
            : t("completion_hint_mid", "Quelques informations manquent encore")}
        </Text>
      )}
    </View>
  );
}

function SectionHeader({
  title,
  icon,
  editing,
  onToggleEdit,
  saving,
}: {
  title: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  editing: boolean;
  onToggleEdit: () => void;
  saving?: boolean;
}) {
  return (
    <View style={cStyles.sectionHeaderRow}>
      <View style={cStyles.sectionHeaderLeft}>
        <Feather name={icon} size={14} color={COLORS.cyan} />
        <Text style={[cStyles.sectionHeaderText, { fontFamily: FONTS.mono }]}>{title}</Text>
      </View>
      <TouchableOpacity onPress={onToggleEdit} activeOpacity={0.7} style={cStyles.editIconBtn}>
        {saving ? (
          <ActivityIndicator size="small" color={COLORS.cyan} />
        ) : editing ? (
          <Feather name="check" size={16} color={COLORS.cyan} />
        ) : (
          <Feather name="edit-2" size={14} color={COLORS.textMuted} />
        )}
      </TouchableOpacity>
    </View>
  );
}

function ToggleChip({
  label,
  selected,
  onPress,
  color,
  small,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  color?: string;
  small?: boolean;
}) {
  const accent = color ?? COLORS.cyan;
  const colors = useThemeColors();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        cStyles.chip,
        small && cStyles.chipSmall,
        { backgroundColor: colors.bgInput, borderColor: colors.border },
        selected && { borderColor: accent, backgroundColor: `${accent}20` },
      ]}
    >
      <Text
        style={[
          cStyles.chipText,
          { fontFamily: selected ? FONTS.bodyMedium : FONTS.body, color: selected ? accent : colors.textSecondary },
          small && { fontSize: 12 },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function ExtendedProfileSections({ onCompletionChange }: { onCompletionChange?: (pct: number) => void }) {
  const { setLanguage: ctxSetLanguage, setTheme: ctxSetTheme, setUnits: ctxSetUnits } = usePreferences();
  const t = useT();
  const colors = useThemeColors();

  const [profile, setProfile] = useState<ExtendedProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const [editingContext, setEditingContext] = useState(false);
  const [editingGoals, setEditingGoals] = useState(false);
  const [editingPrefs, setEditingPrefs] = useState(false);
  const [editingPrivacy, setEditingPrivacy] = useState(false);
  const [editingNotifs, setEditingNotifs] = useState(false);
  const [editingExercises, setEditingExercises] = useState(false);

  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [trainingLocations, setTrainingLocations] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [sessionDurationMin, setSessionDurationMin] = useState<number | null>(null);
  const [sessionDurationMax, setSessionDurationMax] = useState<number | null>(null);
  const [injuries, setInjuries] = useState<string>("");

  const [primaryGoal, setPrimaryGoal] = useState<string | null>(null);
  const [fitnessLevel, setFitnessLevel] = useState<string | null>(null);
  const [secondaryGoal, setSecondaryGoal] = useState<string | null>(null);

  const [avoidedExercises, setAvoidedExercises] = useState<string[]>([]);
  const [favoriteExercises, setFavoriteExercises] = useState<string[]>([]);
  const [avoidedInput, setAvoidedInput] = useState<string>("");
  const [favoriteInput, setFavoriteInput] = useState<string>("");

  const [units, setUnits] = useState<string>("metric");
  const [language, setLanguage] = useState<string>("fr");
  const [theme, setTheme] = useState<string>("dark");

  const [morningNotifHour, setMorningNotifHour] = useState<number>(7);
  const [notificationPrefs, setNotificationPrefs] = useState<Record<string, boolean>>({});

  const [privacy, setPrivacy] = useState<ExtendedProfileData["privacySettings"]>({});

  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);

  const [libraryVisible, setLibraryVisible] = useState(false);
  const [libraryTarget, setLibraryTarget] = useState<"avoided" | "favorite">("avoided");
  const [librarySelected, setLibrarySelected] = useState<string[]>([]);

  const fetchProfile = useCallback(async () => {
    try {
      const data = await customFetch<ExtendedProfileData>("/api/users/me/profile");
      setProfile(data);
      setAvailableDays(data.availableDays ?? []);
      setTrainingLocations(data.trainingLocations ?? []);
      setEquipment(data.equipment ?? []);
      setSessionDurationMin(data.sessionDurationMin);
      setSessionDurationMax(data.sessionDurationMax);
      setInjuries(data.injuries ?? "");
      setPrimaryGoal(data.primaryGoal ?? null);
      setFitnessLevel(data.fitnessLevel ?? null);
      setSecondaryGoal(data.secondaryGoal);
      setAvoidedExercises(data.avoidedExercises ?? []);
      setFavoriteExercises(data.favoriteExercises ?? []);
      setUnits(data.units ?? "metric");
      setLanguage(data.language ?? "fr");
      setTheme(data.theme ?? "dark");
      setMorningNotifHour(data.morningNotifHour ?? 7);
      setNotificationPrefs(data.notificationPrefs ?? {});
      setPrivacy(data.privacySettings ?? {});
      setIntegrations(data.integrations ?? []);
      onCompletionChange?.(data.completionPercent);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [onCompletionChange]);

  useFocusEffect(useCallback(() => {
    fetchProfile();
  }, [fetchProfile]));

  const saveSection = async (section: string, body: Record<string, unknown>) => {
    setSaving(s => ({ ...s, [section]: true }));
    try {
      const data = await customFetch<ExtendedProfileData>("/api/users/me/profile", {
        method: "PUT",
        body: JSON.stringify(body),
      });
      setProfile(data);
      onCompletionChange?.(data.completionPercent);
    } catch {
      Alert.alert("Erreur", "Impossible de sauvegarder les modifications");
    } finally {
      setSaving(s => ({ ...s, [section]: false }));
    }
  };

  const handleSaveContext = async () => {
    await saveSection("context", {
      availableDays,
      trainingLocations,
      equipment,
      sessionDurationMin,
      sessionDurationMax,
      injuries,
    });
    setEditingContext(false);
  };

  const handleSaveGoals = async () => {
    await saveSection("goals", { primaryGoal, fitnessLevel, secondaryGoal });
    setEditingGoals(false);
  };

  const handleSavePrefs = async () => {
    await saveSection("prefs", { units, language, theme });
    ctxSetUnits(units as "metric" | "imperial");
    ctxSetLanguage(language as "fr" | "en");
    ctxSetTheme(theme as "dark" | "light" | "system");
    setEditingPrefs(false);
  };

  const handleSavePrivacy = async () => {
    await saveSection("privacy", { privacySettings: privacy });
    setEditingPrivacy(false);
  };

  const handleSaveNotifs = async () => {
    await saveSection("notifs", { morningNotifHour, notificationPrefs });
    setEditingNotifs(false);
  };

  const handleSaveExercises = async () => {
    await saveSection("exercises", { avoidedExercises, favoriteExercises });
    setEditingExercises(false);
  };

  const handleToggleIntegration = async (provider: string, currentlyConnected: boolean) => {
    setConnectingProvider(provider);
    try {
      if (currentlyConnected) {
        await customFetch(`/api/users/me/integrations/${provider}`, { method: "DELETE" });
        setIntegrations(prev => prev.map(i => i.provider === provider ? { ...i, isConnected: false, connectedAt: null } : i));
      } else {
        await customFetch(`/api/users/me/integrations/${provider}/connect`, { method: "POST", body: "{}" });
        setIntegrations(prev => prev.map(i => i.provider === provider ? { ...i, isConnected: true, connectedAt: new Date().toISOString() } : i));
      }
    } catch {
    } finally {
      setConnectingProvider(null);
    }
  };

  const addAvoidedExercise = () => {
    const trimmed = avoidedInput.trim();
    if (trimmed && !avoidedExercises.includes(trimmed)) {
      setAvoidedExercises(prev => [...prev, trimmed]);
    }
    setAvoidedInput("");
  };

  const addFavoriteExercise = () => {
    const trimmed = favoriteInput.trim();
    if (trimmed && !favoriteExercises.includes(trimmed)) {
      setFavoriteExercises(prev => [...prev, trimmed]);
    }
    setFavoriteInput("");
  };

  const toggleDay = (key: string) => {
    setAvailableDays(prev => prev.includes(key) ? prev.filter(d => d !== key) : [...prev, key]);
  };
  const toggleLocation = (key: string) => {
    setTrainingLocations(prev => prev.includes(key) ? prev.filter(d => d !== key) : [...prev, key]);
  };
  const toggleEquipment = (key: string) => {
    setEquipment(prev => prev.includes(key) ? prev.filter(d => d !== key) : [...prev, key]);
  };

  if (loading) {
    return (
      <View style={{ alignItems: "center", paddingVertical: 20 }}>
        <ActivityIndicator size="small" color={COLORS.cyan} />
      </View>
    );
  }

  return (
    <>
      {profile && <CompletionBar percent={profile.completionPercent} />}

      {/* CONTEXTE D'ENTRAÎNEMENT */}
      <View style={[cStyles.section, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <SectionHeader
          title={t("training_context", "CONTEXTE D'ENTRAÎNEMENT").toUpperCase()}
          icon="activity"
          editing={editingContext}
          onToggleEdit={() => { if (editingContext) { handleSaveContext(); } else { setEditingContext(true); } }}
          saving={saving["context"]}
        />

        <Text style={[cStyles.fieldLabel, { fontFamily: FONTS.body, color: colors.textMuted }]}>{t("available_days", "Jours d'entraînement")}</Text>
        <View style={cStyles.daysRow}>
          {DAYS.map(d => (
            <TouchableOpacity
              key={d.key}
              onPress={() => editingContext && toggleDay(d.key)}
              activeOpacity={editingContext ? 0.7 : 1}
              style={[
                cStyles.dayChip,
                { backgroundColor: colors.bgInput, borderColor: colors.border },
                availableDays.includes(d.key) && cStyles.dayChipActive,
                !editingContext && { opacity: availableDays.includes(d.key) ? 1 : 0.4 },
              ]}
            >
              <Text style={[
                cStyles.dayChipText,
                { fontFamily: FONTS.bodyMedium, color: availableDays.includes(d.key) ? COLORS.cyan : COLORS.textMuted },
              ]}>
                {d.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[cStyles.fieldLabel, { fontFamily: FONTS.body, marginTop: 10, color: colors.textMuted }]}>{t("training_location", "Lieu d'entraînement")}</Text>
        <View style={cStyles.chipRow}>
          {LOCATIONS.map(loc => (
            <TouchableOpacity
              key={loc.key}
              onPress={() => editingContext && toggleLocation(loc.key)}
              activeOpacity={editingContext ? 0.7 : 1}
              style={[
                cStyles.locationChip,
                { backgroundColor: colors.bgInput, borderColor: colors.border },
                trainingLocations.includes(loc.key) && cStyles.locationChipActive,
                !editingContext && !trainingLocations.includes(loc.key) && { opacity: 0.4 },
              ]}
            >
              <Feather name={loc.icon} size={14} color={trainingLocations.includes(loc.key) ? COLORS.violet : COLORS.textMuted} />
              <Text style={[
                cStyles.locationChipText,
                { fontFamily: FONTS.bodyMedium, color: trainingLocations.includes(loc.key) ? COLORS.violet : COLORS.textMuted },
              ]}>
                {loc.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[cStyles.fieldLabel, { fontFamily: FONTS.body, marginTop: 10, color: colors.textMuted }]}>{t("equipment", "Équipement disponible")}</Text>
        <View style={cStyles.chipRow}>
          {EQUIPMENT_OPTIONS.map(eq => (
            <ToggleChip
              key={eq.key}
              label={eq.label}
              selected={equipment.includes(eq.key)}
              onPress={() => editingContext && toggleEquipment(eq.key)}
              small
            />
          ))}
        </View>

        <Text style={[cStyles.fieldLabel, { fontFamily: FONTS.body, marginTop: 10, color: colors.textMuted }]}>{t("session_duration", "Durée de séance")}</Text>
        {editingContext ? (
          <View style={{ gap: 4 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={[cStyles.subLabel, { fontFamily: FONTS.body }]}>{t("session_min", "Minimum")}</Text>
              <Text style={[cStyles.subLabel, { fontFamily: FONTS.bodyMedium, color: COLORS.cyan }]}>{sessionDurationMin ?? 30} min</Text>
            </View>
            <Slider
              minimumValue={15}
              maximumValue={180}
              step={15}
              value={sessionDurationMin ?? 30}
              onValueChange={(v) => setSessionDurationMin(Math.round(v))}
              minimumTrackTintColor={COLORS.cyan}
              maximumTrackTintColor={COLORS.border}
              thumbTintColor={COLORS.cyan}
            />
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
              <Text style={[cStyles.subLabel, { fontFamily: FONTS.body }]}>{t("session_max", "Maximum")}</Text>
              <Text style={[cStyles.subLabel, { fontFamily: FONTS.bodyMedium, color: COLORS.violet }]}>{sessionDurationMax ?? 90} min</Text>
            </View>
            <Slider
              minimumValue={15}
              maximumValue={180}
              step={15}
              value={sessionDurationMax ?? 90}
              onValueChange={(v) => setSessionDurationMax(Math.round(v))}
              minimumTrackTintColor={COLORS.violet}
              maximumTrackTintColor={COLORS.border}
              thumbTintColor={COLORS.violet}
            />
          </View>
        ) : (
          <Text style={[cStyles.valueText, { fontFamily: FONTS.bodyMedium, color: colors.textPrimary }]}>
            {sessionDurationMin && sessionDurationMax
              ? `${sessionDurationMin} – ${sessionDurationMax} min`
              : sessionDurationMin
              ? `${t("session_min", "Min")} ${sessionDurationMin} min`
              : sessionDurationMax
              ? `${t("session_max", "Max")} ${sessionDurationMax} min`
              : "—"}
          </Text>
        )}

        <Text style={[cStyles.fieldLabel, { fontFamily: FONTS.body, marginTop: 10, color: colors.textMuted }]}>{t("injuries", "Blessures / Restrictions permanentes")}</Text>
        {editingContext ? (
          <TextInput
            value={injuries}
            onChangeText={setInjuries}
            placeholder="Ex: douleur genou gauche, épaule fragile..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            numberOfLines={3}
            style={[cStyles.textArea, { fontFamily: FONTS.body, backgroundColor: colors.bgInput, color: colors.textPrimary, borderColor: colors.border }]}
          />
        ) : (
          <Text style={[cStyles.valueText, { fontFamily: FONTS.body, fontStyle: injuries ? "normal" : "italic", color: injuries ? colors.textPrimary : colors.textMuted }]}>
            {injuries || t("no_injury", "Aucune restriction renseignée")}
          </Text>
        )}
        {editingContext && (
          <TouchableOpacity
            onPress={handleSaveContext}
            disabled={saving["context"]}
            style={[cStyles.saveBtn, { opacity: saving["context"] ? 0.6 : 1 }]}
            activeOpacity={0.8}
          >
            {saving["context"] ? (
              <ActivityIndicator size="small" color={COLORS.bg} />
            ) : (
              <Text style={[cStyles.saveBtnText, { fontFamily: FONTS.bodyMedium }]}>Enregistrer</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* OBJECTIFS */}
      <View style={[cStyles.section, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <SectionHeader
          title={t("goals", "OBJECTIFS").toUpperCase()}
          icon="target"
          editing={editingGoals}
          onToggleEdit={() => { if (editingGoals) { handleSaveGoals(); } else { setEditingGoals(true); } }}
          saving={saving["goals"]}
        />

        <Text style={[cStyles.fieldLabel, { fontFamily: FONTS.body, color: colors.textMuted }]}>{t("primary_goal", "Objectif principal")}</Text>
        <View style={cStyles.chipRow}>
          {PRIMARY_GOALS.map(g => (
            <ToggleChip
              key={g.key}
              label={g.label}
              selected={primaryGoal === g.key}
              onPress={() => { if (!editingGoals) return; setPrimaryGoal(prev => prev === g.key ? null : g.key); }}
              color={COLORS.cyan}
              small
            />
          ))}
        </View>

        <Text style={[cStyles.fieldLabel, { fontFamily: FONTS.body, marginTop: 10, color: colors.textMuted }]}>{t("fitness_level", "Niveau de forme")}</Text>
        <View style={cStyles.chipRow}>
          {FITNESS_LEVELS.map(l => (
            <ToggleChip
              key={l.key}
              label={l.label}
              selected={fitnessLevel === l.key}
              onPress={() => { if (!editingGoals) return; setFitnessLevel(prev => prev === l.key ? null : l.key); }}
              color={COLORS.amber}
              small
            />
          ))}
        </View>

        <Text style={[cStyles.fieldLabel, { fontFamily: FONTS.body, marginTop: 10, color: colors.textMuted }]}>{t("secondary_goal", "Objectif secondaire")}</Text>
        <View style={cStyles.chipRow}>
          {SECONDARY_GOALS.map(g => (
            <ToggleChip
              key={g.key}
              label={g.label}
              selected={secondaryGoal === g.key}
              onPress={() => { if (!editingGoals) return; setSecondaryGoal(prev => prev === g.key ? null : g.key); }}
              color={COLORS.violet}
              small
            />
          ))}
        </View>
        {!editingGoals && !primaryGoal && !secondaryGoal && !fitnessLevel && (
          <Text style={[cStyles.emptyHint, { fontFamily: FONTS.body }]}>
            Appuie sur l'icône crayon pour modifier
          </Text>
        )}
        {editingGoals && (
          <TouchableOpacity
            onPress={handleSaveGoals}
            disabled={saving["goals"]}
            style={[cStyles.saveBtn, { opacity: saving["goals"] ? 0.6 : 1 }]}
            activeOpacity={0.8}
          >
            {saving["goals"] ? (
              <ActivityIndicator size="small" color={COLORS.bg} />
            ) : (
              <Text style={[cStyles.saveBtnText, { fontFamily: FONTS.bodyMedium }]}>Enregistrer</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* EXERCICES */}
      <View style={[cStyles.section, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <SectionHeader
          title={t("exercises", "EXERCICES").toUpperCase()}
          icon="list"
          editing={editingExercises}
          onToggleEdit={() => { if (editingExercises) { handleSaveExercises(); } else { setEditingExercises(true); } }}
          saving={saving["exercises"]}
        />

        {/* Exercices à éviter */}
        <Text style={[cStyles.fieldLabel, { fontFamily: FONTS.body, color: colors.textMuted }]}>{t("avoided_exercises", "Exercices à éviter")}</Text>
        {editingExercises && (
          <TouchableOpacity
            style={[cStyles.libraryBtn, { backgroundColor: colors.bgInput, borderColor: colors.border }]}
            onPress={() => {
              setLibraryTarget("avoided");
              setLibrarySelected([...avoidedExercises]);
              setLibraryVisible(true);
            }}
          >
            <Feather name="book-open" size={13} color={COLORS.red} />
            <Text style={[cStyles.libraryBtnText, { fontFamily: FONTS.bodyMedium, color: COLORS.red }]}>{t("from_library", "Depuis la bibliothèque")}</Text>
          </TouchableOpacity>
        )}
        {editingExercises ? (
          <View>
            <View style={cStyles.inputRow}>
              <TextInput
                value={avoidedInput}
                onChangeText={setAvoidedInput}
                placeholder={t("add_exercise", "Ajouter un exercice...")}
                placeholderTextColor={COLORS.textMuted}
                style={[cStyles.inlineInput, { fontFamily: FONTS.body, backgroundColor: colors.bgInput, color: colors.textPrimary, borderColor: colors.border }]}
                onSubmitEditing={addAvoidedExercise}
                returnKeyType="done"
              />
              <TouchableOpacity onPress={addAvoidedExercise} style={cStyles.addBtn}>
                <Feather name="plus" size={16} color={COLORS.red} />
              </TouchableOpacity>
            </View>
            <View style={[cStyles.chipRow, { marginTop: 8 }]}>
              {avoidedExercises.map(ex => (
                <TouchableOpacity
                  key={ex}
                  onPress={() => setAvoidedExercises(prev => prev.filter(e => e !== ex))}
                  style={[cStyles.chip, cStyles.chipSmall, { borderColor: COLORS.red, backgroundColor: `${COLORS.red}15`, flexDirection: "row", alignItems: "center", gap: 4 }]}
                >
                  <Text style={[cStyles.chipText, { fontSize: 12, fontFamily: FONTS.body, color: COLORS.red }]}>{ex}</Text>
                  <Feather name="x" size={10} color={COLORS.red} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <View style={cStyles.chipRow}>
            {avoidedExercises.length > 0
              ? avoidedExercises.map(ex => (
                  <View key={ex} style={[cStyles.chip, cStyles.chipSmall, { borderColor: COLORS.red, backgroundColor: `${COLORS.red}10` }]}>
                    <Text style={[cStyles.chipText, { fontSize: 12, fontFamily: FONTS.body, color: COLORS.red }]}>{ex}</Text>
                  </View>
                ))
              : <Text style={[cStyles.emptyHint, { fontFamily: FONTS.body }]}>{t("none", "Aucun")}</Text>
            }
          </View>
        )}

        {/* Exercices préférés */}
        <Text style={[cStyles.fieldLabel, { fontFamily: FONTS.body, marginTop: 10, color: colors.textMuted }]}>{t("favorite_exercises", "Exercices préférés")}</Text>
        {editingExercises && (
          <TouchableOpacity
            style={[cStyles.libraryBtn, { backgroundColor: colors.bgInput, borderColor: colors.border }]}
            onPress={() => {
              setLibraryTarget("favorite");
              setLibrarySelected([...favoriteExercises]);
              setLibraryVisible(true);
            }}
          >
            <Feather name="book-open" size={13} color={COLORS.cyan} />
            <Text style={[cStyles.libraryBtnText, { fontFamily: FONTS.bodyMedium, color: COLORS.cyan }]}>{t("from_library", "Depuis la bibliothèque")}</Text>
          </TouchableOpacity>
        )}
        {editingExercises ? (
          <View>
            <View style={cStyles.inputRow}>
              <TextInput
                value={favoriteInput}
                onChangeText={setFavoriteInput}
                placeholder={t("add_exercise", "Ajouter un exercice...")}
                placeholderTextColor={COLORS.textMuted}
                style={[cStyles.inlineInput, { fontFamily: FONTS.body, backgroundColor: colors.bgInput, color: colors.textPrimary, borderColor: colors.border }]}
                onSubmitEditing={addFavoriteExercise}
                returnKeyType="done"
              />
              <TouchableOpacity onPress={addFavoriteExercise} style={cStyles.addBtn}>
                <Feather name="plus" size={16} color={COLORS.cyan} />
              </TouchableOpacity>
            </View>
            <View style={[cStyles.chipRow, { marginTop: 8 }]}>
              {favoriteExercises.map(ex => (
                <TouchableOpacity
                  key={ex}
                  onPress={() => setFavoriteExercises(prev => prev.filter(e => e !== ex))}
                  style={[cStyles.chip, cStyles.chipSmall, { borderColor: COLORS.cyan, backgroundColor: COLORS.cyanDim, flexDirection: "row", alignItems: "center", gap: 4 }]}
                >
                  <Text style={[cStyles.chipText, { fontSize: 12, fontFamily: FONTS.body, color: COLORS.cyan }]}>{ex}</Text>
                  <Feather name="x" size={10} color={COLORS.cyan} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <View style={cStyles.chipRow}>
            {favoriteExercises.length > 0
              ? favoriteExercises.map(ex => (
                  <View key={ex} style={[cStyles.chip, cStyles.chipSmall, { borderColor: COLORS.cyan, backgroundColor: COLORS.cyanDim }]}>
                    <Text style={[cStyles.chipText, { fontSize: 12, fontFamily: FONTS.body, color: COLORS.cyan }]}>{ex}</Text>
                  </View>
                ))
              : <Text style={[cStyles.emptyHint, { fontFamily: FONTS.body }]}>{t("none", "Aucun")}</Text>
            }
          </View>
        )}
        {editingExercises && (
          <TouchableOpacity
            onPress={handleSaveExercises}
            disabled={saving["exercises"]}
            style={[cStyles.saveBtn, { opacity: saving["exercises"] ? 0.6 : 1 }]}
            activeOpacity={0.8}
          >
            {saving["exercises"] ? (
              <ActivityIndicator size="small" color={COLORS.bg} />
            ) : (
              <Text style={[cStyles.saveBtnText, { fontFamily: FONTS.bodyMedium }]}>Enregistrer</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* BIBLIOTHÈQUE D'EXERCICES MODAL */}
      <Modal
        visible={libraryVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLibraryVisible(false)}
      >
        <View style={cStyles.modalOverlay}>
          <View style={[cStyles.modalBox, { maxHeight: "80%", backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Text style={[cStyles.modalTitle, { fontFamily: FONTS.monoBold, marginBottom: 4 }]}>
              {t("select_exercises", "Sélectionner des exercices").toUpperCase()}
            </Text>
            <Text style={[cStyles.modalBody, { fontFamily: FONTS.body, marginBottom: 12, fontSize: 12 }]}>
              {libraryTarget === "avoided"
                ? t("avoided_exercises", "Exercices à éviter")
                : t("favorite_exercises", "Exercices préférés")}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {EXERCISE_LIBRARY.map(cat => (
                <View key={cat.category} style={{ marginBottom: 12 }}>
                  <Text style={[{ fontSize: 10, color: COLORS.textMuted, letterSpacing: 1.5, fontFamily: FONTS.monoBold, marginBottom: 6 }]}>
                    {cat.category.toUpperCase()}
                  </Text>
                  <View style={cStyles.chipRow}>
                    {cat.items.map(item => {
                      const selected = librarySelected.includes(item);
                      const color = libraryTarget === "avoided" ? COLORS.red : COLORS.cyan;
                      return (
                        <TouchableOpacity
                          key={item}
                          onPress={() => setLibrarySelected(prev => selected ? prev.filter(e => e !== item) : [...prev, item])}
                          style={[
                            cStyles.chip, cStyles.chipSmall,
                            { borderColor: selected ? color : COLORS.border, backgroundColor: selected ? `${color}20` : "transparent" },
                          ]}
                        >
                          <Text style={[cStyles.chipText, { fontSize: 12, fontFamily: FONTS.body, color: selected ? color : COLORS.textSecondary }]}>
                            {item}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[cStyles.modalBtn, { marginTop: 12 }]}
              onPress={() => {
                if (libraryTarget === "avoided") {
                  setAvoidedExercises(librarySelected);
                } else {
                  setFavoriteExercises(librarySelected);
                }
                setLibraryVisible(false);
              }}
            >
              <Text style={[cStyles.modalBtnText, { fontFamily: FONTS.bodyMedium }]}>{t("done", "Terminer")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* PRÉFÉRENCES */}
      <View style={[cStyles.section, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <SectionHeader
          title={t("preferences", "PRÉFÉRENCES").toUpperCase()}
          icon="sliders"
          editing={editingPrefs}
          onToggleEdit={() => { if (editingPrefs) { handleSavePrefs(); } else { setEditingPrefs(true); } }}
          saving={saving["prefs"]}
        />

        <View style={[cStyles.prefItem, { borderBottomColor: colors.border }]}>
          <View style={cStyles.prefLeft}>
            <Feather name="maximize" size={14} color={COLORS.textMuted} />
            <Text style={[cStyles.prefItemLabel, { fontFamily: FONTS.bodyMedium, color: colors.textPrimary }]}>{t("units_label", "Unités")}</Text>
          </View>
          {editingPrefs ? (
            <View style={cStyles.segRow}>
              {([
                { key: "metric", label: "Kg / Km" },
                { key: "imperial", label: "Lbs / Mi" },
              ] as const).map(u => (
                <TouchableOpacity
                  key={u.key}
                  onPress={() => setUnits(u.key)}
                  style={[cStyles.segBtn, { backgroundColor: colors.bgInput, borderColor: colors.border }, units === u.key && cStyles.segBtnActive]}
                >
                  <Text style={[cStyles.segBtnText, { fontFamily: FONTS.body, color: units === u.key ? COLORS.cyan : COLORS.textSecondary }]}>
                    {u.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={[cStyles.prefItemValue, { fontFamily: FONTS.body, color: colors.textSecondary }]}>
              {units === "imperial" ? t("units_imperial", "Lbs / Mi") : t("units_metric", "Kg / Km")}
            </Text>
          )}
        </View>

        <View style={[cStyles.prefItem, { borderBottomColor: colors.border }]}>
          <View style={cStyles.prefLeft}>
            <Feather name="globe" size={14} color={COLORS.textMuted} />
            <Text style={[cStyles.prefItemLabel, { fontFamily: FONTS.bodyMedium, color: colors.textPrimary }]}>{t("lang_label", "Langue")}</Text>
          </View>
          {editingPrefs ? (
            <View style={cStyles.segRow}>
              {([
                { key: "fr", label: "Français" },
                { key: "en", label: "English" },
              ] as const).map(l => (
                <TouchableOpacity
                  key={l.key}
                  onPress={() => setLanguage(l.key)}
                  style={[cStyles.segBtn, { backgroundColor: colors.bgInput, borderColor: colors.border }, language === l.key && cStyles.segBtnActive]}
                >
                  <Text style={[cStyles.segBtnText, { fontFamily: FONTS.body, color: language === l.key ? COLORS.cyan : COLORS.textSecondary }]}>
                    {l.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={[cStyles.prefItemValue, { fontFamily: FONTS.body, color: colors.textSecondary }]}>
              {language === "en" ? t("lang_en", "English") : t("lang_fr", "Français")}
            </Text>
          )}
        </View>

        <View style={[cStyles.prefItem, { borderBottomWidth: 0 }]}>
          <View style={cStyles.prefLeft}>
            <Feather name="moon" size={14} color={COLORS.textMuted} />
            <Text style={[cStyles.prefItemLabel, { fontFamily: FONTS.bodyMedium, color: colors.textPrimary }]}>{t("theme_label", "Thème")}</Text>
          </View>
          {editingPrefs ? (
            <View style={cStyles.segRow}>
              {([
                { key: "dark", label: "Sombre" },
                { key: "light", label: "Clair" },
                { key: "system", label: "Auto" },
              ] as const).map(t => (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => setTheme(t.key)}
                  style={[cStyles.segBtn, { backgroundColor: colors.bgInput, borderColor: colors.border }, theme === t.key && cStyles.segBtnActive]}
                >
                  <Text style={[cStyles.segBtnText, { fontFamily: FONTS.body, color: theme === t.key ? COLORS.cyan : COLORS.textSecondary }]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={[cStyles.prefItemValue, { fontFamily: FONTS.body, color: colors.textSecondary }]}>
              {theme === "light" ? t("theme_light", "Clair") : theme === "system" ? t("theme_system", "Automatique") : t("theme_dark", "Sombre")}
            </Text>
          )}
        </View>
        {editingPrefs && (
          <TouchableOpacity
            onPress={handleSavePrefs}
            disabled={saving["prefs"]}
            style={[cStyles.saveBtn, { opacity: saving["prefs"] ? 0.6 : 1 }]}
            activeOpacity={0.8}
          >
            {saving["prefs"] ? (
              <ActivityIndicator size="small" color={COLORS.bg} />
            ) : (
              <Text style={[cStyles.saveBtnText, { fontFamily: FONTS.bodyMedium }]}>Enregistrer</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* NOTIFICATIONS */}
      <View style={[cStyles.section, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <SectionHeader
          title={t("notifications", "NOTIFICATIONS").toUpperCase()}
          icon="bell"
          editing={editingNotifs}
          onToggleEdit={() => { if (editingNotifs) { handleSaveNotifs(); } else { setEditingNotifs(true); } }}
          saving={saving["notifs"]}
        />

        <Text style={[cStyles.fieldLabel, { fontFamily: FONTS.body, color: colors.textMuted }]}>{t("morning_notif_hour", "Heure de rappel matin")}</Text>
        {editingNotifs ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={cStyles.durationRow}>
            {NOTIF_HOURS.map(h => (
              <TouchableOpacity
                key={h}
                onPress={() => setMorningNotifHour(h)}
                style={[cStyles.durationChip, { backgroundColor: colors.bgInput, borderColor: colors.border }, morningNotifHour === h && cStyles.durationChipActive]}
              >
                <Text style={[
                  cStyles.durationChipText,
                  { fontFamily: FONTS.bodyMedium, color: morningNotifHour === h ? COLORS.cyan : COLORS.textMuted },
                ]}>
                  {h}h00
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <Text style={[cStyles.valueText, { fontFamily: FONTS.bodyMedium, color: colors.textPrimary }]}>{morningNotifHour}h00</Text>
        )}

        <Text style={[cStyles.fieldLabel, { fontFamily: FONTS.body, marginTop: 10, color: colors.textMuted }]}>{t("silent_mode_label", "Mode silencieux")}</Text>
        <View style={[cStyles.privacyRow, { borderBottomColor: colors.border }]}>
          <View style={cStyles.privacyLeft}>
            <Feather name="bell-off" size={14} color={COLORS.textMuted} />
            <Text style={[cStyles.privacyLabel, { fontFamily: FONTS.body, color: colors.textPrimary }]}>{t("silent_mode", "Désactiver toutes les notifications")}</Text>
          </View>
          <Switch
            value={notificationPrefs["silent_mode"] === true}
            onValueChange={v => {
              const next = { ...notificationPrefs, silent_mode: v };
              setNotificationPrefs(next);
              if (!editingNotifs) {
                saveSection("notifs_inline", { notificationPrefs: next }).catch(() => {});
              }
            }}
            trackColor={{ false: COLORS.border, true: "#EF4444" }}
            thumbColor={notificationPrefs["silent_mode"] === true ? "#EF4444" : COLORS.textMuted}
          />
        </View>

        <Text style={[cStyles.fieldLabel, { fontFamily: FONTS.body, marginTop: 6, color: colors.textMuted }]}>{t("notif_types_label", "Types de notifications")}</Text>
        {NOTIF_TYPE_KEYS.map(({ key, tKey, fallback }, idx, arr) => (
          <View
            key={key}
            style={[cStyles.privacyRow, { borderBottomColor: colors.border }, idx === arr.length - 1 && { borderBottomWidth: 0 }]}
          >
            <Text style={[cStyles.privacyLabel, { fontFamily: FONTS.body, color: colors.textPrimary }]}>{t(tKey, fallback)}</Text>
            <Switch
              value={notificationPrefs[key] !== false}
              onValueChange={v => {
                const next = { ...notificationPrefs, [key]: v };
                setNotificationPrefs(next);
                if (!editingNotifs) {
                  saveSection("notifs_inline", { notificationPrefs: next }).catch(() => {});
                }
              }}
              trackColor={{ false: COLORS.border, true: COLORS.cyanDim }}
              thumbColor={notificationPrefs[key] !== false ? COLORS.cyan : COLORS.textMuted}
            />
          </View>
        ))}
        {editingNotifs && (
          <TouchableOpacity
            onPress={handleSaveNotifs}
            disabled={saving["notifs"]}
            style={[cStyles.saveBtn, { opacity: saving["notifs"] ? 0.6 : 1 }]}
            activeOpacity={0.8}
          >
            {saving["notifs"] ? (
              <ActivityIndicator size="small" color={COLORS.bg} />
            ) : (
              <Text style={[cStyles.saveBtnText, { fontFamily: FONTS.bodyMedium }]}>Enregistrer</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* APPLICATIONS SANTÉ */}
      <View style={[cStyles.section, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <SectionHeader
            title={t("health_apps", "APPLICATIONS SANTÉ").toUpperCase()}
            icon="heart"
            editing={false}
            onToggleEdit={() => {}}
          />
          <View style={[cStyles.comingSoonBadge, { backgroundColor: `${COLORS.violet}20`, borderColor: `${COLORS.violet}60` }]}>
            <Text style={[cStyles.comingSoonText, { fontFamily: FONTS.mono, color: COLORS.violet }]}>BIENTÔT DISPONIBLE</Text>
          </View>
        </View>
        <Text style={[cStyles.privacyDesc, { fontFamily: FONTS.body, marginBottom: 4, color: colors.textSecondary }]}>
          {t("sync_health_data", "Synchronise tes données de santé avec ADAPT.")}
        </Text>
        <Text style={[cStyles.privacyDesc, { fontFamily: FONTS.body, marginBottom: 12, color: COLORS.textMuted, fontSize: 12 }]}>
          {t("health_coming_soon", "Intégration disponible prochainement.")}
        </Text>
        {HEALTH_APPS.map(app => {
          return (
            <View key={app.key} style={[cStyles.healthAppRow, { opacity: 0.45 }]}>
              <View style={[cStyles.healthAppIcon, { backgroundColor: `${app.color}22` }]}>
                <Text style={{ fontSize: 18 }}>{app.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[cStyles.healthAppName, { fontFamily: FONTS.bodyMedium }]}>{app.label}</Text>
              </View>
              <View
                style={[
                  cStyles.integrationBtn,
                  { backgroundColor: "transparent", borderColor: colors.border },
                ]}
              >
                <Text style={[cStyles.integrationBtnText, { fontFamily: FONTS.bodyMedium, color: COLORS.textMuted }]}>
                  {t("connect", "Connecter")}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* DONNÉES PARTAGÉES AVEC LE COACH */}
      <View style={[cStyles.section, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <SectionHeader
          title={t("privacy", "DONNÉES PARTAGÉES AVEC LE COACH").toUpperCase()}
          icon="eye"
          editing={editingPrivacy}
          onToggleEdit={() => { if (editingPrivacy) { handleSavePrivacy(); } else { setEditingPrivacy(true); } }}
          saving={saving["privacy"]}
        />
        <Text style={[cStyles.privacyDesc, { fontFamily: FONTS.body, color: colors.textSecondary }]}>
          {t("privacy_data_desc", "Ces données sont transmises à ton coach sur toutes ses vues. Désactiver un interrupteur masque la donnée partout.")}
        </Text>
        {([
          { key: "shareWeight" as const, tKey: "share_weight", label: "Poids corporel", icon: "trending-down" as const },
          { key: "shareSleep" as const, tKey: "share_sleep", label: "Qualité du sommeil", icon: "moon" as const },
          { key: "shareHeartRate" as const, tKey: "share_heart_rate", label: "Fréquence cardiaque", icon: "heart" as const },
          { key: "shareBodyFat" as const, tKey: "share_body_fat", label: "Masse grasse (%)", icon: "percent" as const },
          { key: "shareContext" as const, tKey: "share_context", label: "Contexte d'entraînement", icon: "layers" as const },
        ] as const).map(({ key, tKey, label, icon }, idx, arr) => (
          <View
            key={key}
            style={[
              cStyles.privacyRow,
              { borderBottomColor: colors.border },
              idx === arr.length - 1 && { borderBottomWidth: 0 },
            ]}
          >
            <View style={cStyles.privacyLeft}>
              <Feather name={icon} size={14} color={COLORS.textMuted} />
              <Text style={[cStyles.privacyLabel, { fontFamily: FONTS.body, color: colors.textPrimary }]}>{t(tKey, label)}</Text>
            </View>
            <Switch
              value={privacy[key] !== false}
              onValueChange={v => {
                setPrivacy(p => ({ ...p, [key]: v }));
                if (!editingPrivacy) {
                  saveSection("privacy_inline", { privacySettings: { ...privacy, [key]: v } });
                }
              }}
              trackColor={{ false: COLORS.border, true: COLORS.cyanDim }}
              thumbColor={privacy[key] !== false ? COLORS.cyan : COLORS.textMuted}
            />
          </View>
        ))}
      </View>

      {/* PARAMÈTRES DE CONFIDENTIALITÉ */}
      <View style={[cStyles.section, { marginBottom: 24 }]}>
        <SectionHeader
          title={t("privacy_settings", "PARAMÈTRES DE CONFIDENTIALITÉ").toUpperCase()}
          icon="shield"
          editing={editingPrivacy}
          onToggleEdit={() => { if (editingPrivacy) { handleSavePrivacy(); } else { setEditingPrivacy(true); } }}
          saving={saving["privacy"]}
        />
        <Text style={[cStyles.privacyDesc, { fontFamily: FONTS.body, color: colors.textSecondary }]}>
          {t("privacy_visibility_desc", "Ces paramètres contrôlent la visibilité globale de ton profil. Cumulatifs avec les données partagées ci-dessus.")}
        </Text>
        <View style={[cStyles.privacyRow, { borderBottomColor: colors.border }]}>
          <View style={cStyles.privacyLeft}>
            <Feather name="lock" size={14} color={COLORS.textMuted} />
            <Text style={[cStyles.privacyLabel, { fontFamily: FONTS.body, color: colors.textPrimary }]}>{t("coach_only", "Profil visible par le coach uniquement")}</Text>
          </View>
          <Switch
            value={(privacy.profileVisibility ?? "coach_only") === "coach_only"}
            onValueChange={v => {
              const next = { ...privacy, profileVisibility: (v ? "coach_only" : "private") as "coach_only" | "private" };
              setPrivacy(next);
              if (!editingPrivacy) {
                saveSection("privacy_inline", { privacySettings: next });
              }
            }}
            trackColor={{ false: COLORS.border, true: COLORS.cyanDim }}
            thumbColor={(privacy.profileVisibility ?? "coach_only") === "coach_only" ? COLORS.cyan : COLORS.textMuted}
          />
        </View>
        <View style={[cStyles.privacyRow, { borderBottomWidth: 0, borderBottomColor: colors.border }]}>
          <View style={cStyles.privacyLeft}>
            <Feather name="eye-off" size={14} color={COLORS.textMuted} />
            <Text style={[cStyles.privacyLabel, { fontFamily: FONTS.body, color: colors.textPrimary }]}>{t("profile_private", "Profil entièrement privé")}</Text>
          </View>
          <Switch
            value={(privacy.profileVisibility ?? "coach_only") === "private"}
            onValueChange={v => {
              const next = { ...privacy, profileVisibility: (v ? "private" : "coach_only") as "coach_only" | "private" };
              setPrivacy(next);
              if (!editingPrivacy) {
                saveSection("privacy_inline", { privacySettings: next });
              }
            }}
            trackColor={{ false: COLORS.border, true: "#EF4444" }}
            thumbColor={(privacy.profileVisibility ?? "coach_only") === "private" ? "#EF4444" : COLORS.textMuted}
          />
        </View>
      </View>

    </>
  );
}

const cStyles = StyleSheet.create({
  completionWrap: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 16,
    gap: 8,
  },
  completionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  completionLabel: { fontSize: 10, color: COLORS.textMuted, letterSpacing: 2 },
  completionPct: { fontSize: 18 },
  completionTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.border,
    overflow: "hidden",
  },
  completionFill: {
    height: 6,
    borderRadius: 3,
  },
  completionHint: { fontSize: 12, color: COLORS.textMuted, lineHeight: 17 },
  section: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 12,
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  sectionHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionHeaderText: { fontSize: 10, color: COLORS.cyan, letterSpacing: 2 },
  editIconBtn: { padding: 4 },
  fieldLabel: { fontSize: 12, color: COLORS.textMuted, marginBottom: 4 },
  subLabel: { fontSize: 11, color: COLORS.textMuted },
  valueText: { fontSize: 14, color: COLORS.textPrimary },
  emptyHint: { fontSize: 12, color: COLORS.textMuted, fontStyle: "italic" },
  daysRow: { flexDirection: "row", gap: 6 },
  dayChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgInput,
    alignItems: "center",
    justifyContent: "center",
  },
  dayChipActive: {
    borderColor: COLORS.cyan,
    backgroundColor: COLORS.cyanDim,
  },
  dayChipText: { fontSize: 12 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgInput,
  },
  chipSmall: { paddingHorizontal: 10, paddingVertical: 5 },
  chipText: { fontSize: 13, color: COLORS.textSecondary },
  locationChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgInput,
  },
  locationChipActive: {
    borderColor: COLORS.violet,
    backgroundColor: COLORS.violetDim,
  },
  locationChipText: { fontSize: 13 },
  durationRow: { gap: 8, paddingVertical: 4 },
  durationChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgInput,
  },
  durationChipActive: {
    borderColor: COLORS.cyan,
    backgroundColor: COLORS.cyanDim,
  },
  durationChipText: { fontSize: 13 },
  textArea: {
    backgroundColor: COLORS.bgInput,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    fontSize: 13,
    color: COLORS.textPrimary,
    minHeight: 72,
    textAlignVertical: "top",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inlineInput: {
    flex: 1,
    backgroundColor: COLORS.bgInput,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.cyanDim,
    borderWidth: 1,
    borderColor: COLORS.cyan,
    alignItems: "center",
    justifyContent: "center",
  },
  prefItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  prefLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  prefItemLabel: { fontSize: 14, color: COLORS.textPrimary },
  prefItemValue: { fontSize: 13, color: COLORS.textSecondary },
  segRow: { flexDirection: "row", gap: 6 },
  segBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgInput,
  },
  segBtnActive: {
    borderColor: COLORS.cyan,
    backgroundColor: COLORS.cyanDim,
  },
  segBtnText: { fontSize: 11 },
  healthAppRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  healthAppIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  healthAppName: { flex: 1, fontSize: 14, color: COLORS.textPrimary },
  comingSoonBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: COLORS.bgElevated,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  comingSoonText: { fontSize: 9, color: COLORS.textMuted, letterSpacing: 1 },
  integrationBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 90,
  },
  integrationBtnText: { fontSize: 12, letterSpacing: 0.3 },
  privacyDesc: { fontSize: 12, color: COLORS.textMuted, lineHeight: 17, marginBottom: 4 },
  privacyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  privacyLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  privacyLabel: { fontSize: 14, color: COLORS.textPrimary },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  modalBox: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 28,
    alignItems: "center",
    gap: 8,
    maxWidth: 320,
    width: "100%",
  },
  modalTitle: { fontSize: 12, color: COLORS.cyan, letterSpacing: 2, textAlign: "center" },
  modalBody: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 21, textAlign: "center" },
  modalBtn: {
    marginTop: 8,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.cyanDim,
    borderWidth: 1,
    borderColor: COLORS.cyan,
  },
  modalBtnText: { fontSize: 14, color: COLORS.cyan },
  libraryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgInput,
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  libraryBtnText: { fontSize: 12 },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.cyan,
    borderRadius: 12,
    paddingVertical: 13,
    marginTop: 4,
  },
  saveBtnText: {
    fontSize: 15,
    letterSpacing: 0.5,
    color: COLORS.bg,
  },
});
