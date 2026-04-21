import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { customFetch } from "@workspace/api-client-react";
import { COLORS, FONTS } from "@/constants/theme";
import { useFocusEffect } from "@react-navigation/native";
import { usePreferences } from "@/context/PreferencesContext";

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

const DURATION_OPTIONS = [30, 45, 60, 75, 90, 105, 120];

const HEALTH_APPS = [
  { key: "apple_health", label: "Apple Santé", icon: "❤️", color: "#FF2D55" },
  { key: "garmin", label: "Garmin Connect", icon: "⌚", color: "#009CDE" },
  { key: "strava", label: "Strava", icon: "🏃", color: "#FC4C02" },
  { key: "whoop", label: "Whoop", icon: "💪", color: "#00D1CA" },
  { key: "fitbit", label: "Fitbit", icon: "📊", color: "#00B0B9" },
];

const NOTIF_TYPES = [
  { key: "check_in_reminder", label: "Rappel check-in" },
  { key: "session_reminder", label: "Rappel séance" },
  { key: "coach_message", label: "Message coach" },
  { key: "achievement", label: "Succès débloqué" },
  { key: "weekly_recap", label: "Récapitulatif hebdo" },
];

const NOTIF_HOURS = [5, 6, 7, 8, 9, 10, 11, 12];

function CompletionBar({ percent }: { percent: number }) {
  const animWidth = useRef(new Animated.Value(0)).current;

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
    <View style={cStyles.completionWrap}>
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
            ? "Complète ton profil pour personnaliser ton entraînement"
            : "Quelques informations manquent encore"}
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
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        cStyles.chip,
        small && cStyles.chipSmall,
        selected && { borderColor: accent, backgroundColor: `${accent}20` },
      ]}
    >
      <Text
        style={[
          cStyles.chipText,
          { fontFamily: selected ? FONTS.bodyMedium : FONTS.body, color: selected ? accent : COLORS.textSecondary },
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
      <View style={cStyles.section}>
        <SectionHeader
          title="CONTEXTE D'ENTRAÎNEMENT"
          icon="activity"
          editing={editingContext}
          onToggleEdit={() => { if (editingContext) { handleSaveContext(); } else { setEditingContext(true); } }}
          saving={saving["context"]}
        />

        <Text style={[cStyles.fieldLabel, { fontFamily: FONTS.body }]}>Jours disponibles</Text>
        <View style={cStyles.daysRow}>
          {DAYS.map(d => (
            <TouchableOpacity
              key={d.key}
              onPress={() => editingContext && toggleDay(d.key)}
              activeOpacity={editingContext ? 0.7 : 1}
              style={[
                cStyles.dayChip,
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

        <Text style={[cStyles.fieldLabel, { fontFamily: FONTS.body, marginTop: 10 }]}>Lieu d'entraînement</Text>
        <View style={cStyles.chipRow}>
          {LOCATIONS.map(loc => (
            <TouchableOpacity
              key={loc.key}
              onPress={() => editingContext && toggleLocation(loc.key)}
              activeOpacity={editingContext ? 0.7 : 1}
              style={[
                cStyles.locationChip,
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

        <Text style={[cStyles.fieldLabel, { fontFamily: FONTS.body, marginTop: 10 }]}>Équipement disponible</Text>
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

        <Text style={[cStyles.fieldLabel, { fontFamily: FONTS.body, marginTop: 10 }]}>Durée de séance</Text>
        {editingContext ? (
          <View>
            <Text style={[cStyles.subLabel, { fontFamily: FONTS.body }]}>Minimum</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={cStyles.durationRow}>
              {DURATION_OPTIONS.map(d => (
                <TouchableOpacity
                  key={d}
                  onPress={() => setSessionDurationMin(d)}
                  style={[cStyles.durationChip, sessionDurationMin === d && cStyles.durationChipActive]}
                >
                  <Text style={[
                    cStyles.durationChipText,
                    { fontFamily: FONTS.bodyMedium, color: sessionDurationMin === d ? COLORS.cyan : COLORS.textMuted },
                  ]}>
                    {d}min
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={[cStyles.subLabel, { fontFamily: FONTS.body, marginTop: 6 }]}>Maximum</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={cStyles.durationRow}>
              {DURATION_OPTIONS.map(d => (
                <TouchableOpacity
                  key={d}
                  onPress={() => setSessionDurationMax(d)}
                  style={[cStyles.durationChip, sessionDurationMax === d && cStyles.durationChipActive]}
                >
                  <Text style={[
                    cStyles.durationChipText,
                    { fontFamily: FONTS.bodyMedium, color: sessionDurationMax === d ? COLORS.cyan : COLORS.textMuted },
                  ]}>
                    {d}min
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : (
          <Text style={[cStyles.valueText, { fontFamily: FONTS.bodyMedium }]}>
            {sessionDurationMin && sessionDurationMax
              ? `${sessionDurationMin} – ${sessionDurationMax} min`
              : sessionDurationMin
              ? `À partir de ${sessionDurationMin} min`
              : sessionDurationMax
              ? `Jusqu'à ${sessionDurationMax} min`
              : "Non renseigné"}
          </Text>
        )}

        <Text style={[cStyles.fieldLabel, { fontFamily: FONTS.body, marginTop: 10 }]}>Blessures / Restrictions permanentes</Text>
        {editingContext ? (
          <TextInput
            value={injuries}
            onChangeText={setInjuries}
            placeholder="Ex: douleur genou gauche, épaule fragile..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            numberOfLines={3}
            style={[cStyles.textArea, { fontFamily: FONTS.body }]}
          />
        ) : (
          <Text style={[cStyles.valueText, { fontFamily: FONTS.body, fontStyle: injuries ? "normal" : "italic", color: injuries ? COLORS.textPrimary : COLORS.textMuted }]}>
            {injuries || "Aucune restriction renseignée"}
          </Text>
        )}
      </View>

      {/* OBJECTIFS */}
      <View style={cStyles.section}>
        <SectionHeader
          title="OBJECTIFS"
          icon="target"
          editing={editingGoals}
          onToggleEdit={() => { if (editingGoals) { handleSaveGoals(); } else { setEditingGoals(true); } }}
          saving={saving["goals"]}
        />

        <Text style={[cStyles.fieldLabel, { fontFamily: FONTS.body }]}>Objectif principal</Text>
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

        <Text style={[cStyles.fieldLabel, { fontFamily: FONTS.body, marginTop: 10 }]}>Niveau</Text>
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

        <Text style={[cStyles.fieldLabel, { fontFamily: FONTS.body, marginTop: 10 }]}>Objectif secondaire</Text>
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
      </View>

      {/* EXERCICES */}
      <View style={cStyles.section}>
        <SectionHeader
          title="EXERCICES"
          icon="list"
          editing={editingExercises}
          onToggleEdit={() => { if (editingExercises) { handleSaveExercises(); } else { setEditingExercises(true); } }}
          saving={saving["exercises"]}
        />

        <Text style={[cStyles.fieldLabel, { fontFamily: FONTS.body }]}>Exercices à éviter</Text>
        {editingExercises ? (
          <View>
            <View style={cStyles.inputRow}>
              <TextInput
                value={avoidedInput}
                onChangeText={setAvoidedInput}
                placeholder="Ajouter un exercice..."
                placeholderTextColor={COLORS.textMuted}
                style={[cStyles.inlineInput, { fontFamily: FONTS.body }]}
                onSubmitEditing={addAvoidedExercise}
                returnKeyType="done"
              />
              <TouchableOpacity onPress={addAvoidedExercise} style={cStyles.addBtn}>
                <Feather name="plus" size={16} color={COLORS.cyan} />
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
              : <Text style={[cStyles.emptyHint, { fontFamily: FONTS.body }]}>Aucun</Text>
            }
          </View>
        )}

        <Text style={[cStyles.fieldLabel, { fontFamily: FONTS.body, marginTop: 10 }]}>Exercices préférés</Text>
        {editingExercises ? (
          <View>
            <View style={cStyles.inputRow}>
              <TextInput
                value={favoriteInput}
                onChangeText={setFavoriteInput}
                placeholder="Ajouter un exercice..."
                placeholderTextColor={COLORS.textMuted}
                style={[cStyles.inlineInput, { fontFamily: FONTS.body }]}
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
              : <Text style={[cStyles.emptyHint, { fontFamily: FONTS.body }]}>Aucun</Text>
            }
          </View>
        )}
      </View>

      {/* PRÉFÉRENCES */}
      <View style={cStyles.section}>
        <SectionHeader
          title="PRÉFÉRENCES"
          icon="sliders"
          editing={editingPrefs}
          onToggleEdit={() => { if (editingPrefs) { handleSavePrefs(); } else { setEditingPrefs(true); } }}
          saving={saving["prefs"]}
        />

        <View style={cStyles.prefItem}>
          <View style={cStyles.prefLeft}>
            <Feather name="maximize" size={14} color={COLORS.textMuted} />
            <Text style={[cStyles.prefItemLabel, { fontFamily: FONTS.bodyMedium }]}>Unités</Text>
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
                  style={[cStyles.segBtn, units === u.key && cStyles.segBtnActive]}
                >
                  <Text style={[cStyles.segBtnText, { fontFamily: FONTS.body, color: units === u.key ? COLORS.cyan : COLORS.textSecondary }]}>
                    {u.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={[cStyles.prefItemValue, { fontFamily: FONTS.body }]}>
              {units === "imperial" ? "Lbs / Mi" : "Kg / Km"}
            </Text>
          )}
        </View>

        <View style={cStyles.prefItem}>
          <View style={cStyles.prefLeft}>
            <Feather name="globe" size={14} color={COLORS.textMuted} />
            <Text style={[cStyles.prefItemLabel, { fontFamily: FONTS.bodyMedium }]}>Langue</Text>
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
                  style={[cStyles.segBtn, language === l.key && cStyles.segBtnActive]}
                >
                  <Text style={[cStyles.segBtnText, { fontFamily: FONTS.body, color: language === l.key ? COLORS.cyan : COLORS.textSecondary }]}>
                    {l.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={[cStyles.prefItemValue, { fontFamily: FONTS.body }]}>
              {language === "en" ? "English" : "Français"}
            </Text>
          )}
        </View>

        <View style={[cStyles.prefItem, { borderBottomWidth: 0 }]}>
          <View style={cStyles.prefLeft}>
            <Feather name="moon" size={14} color={COLORS.textMuted} />
            <Text style={[cStyles.prefItemLabel, { fontFamily: FONTS.bodyMedium }]}>Thème</Text>
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
                  style={[cStyles.segBtn, theme === t.key && cStyles.segBtnActive]}
                >
                  <Text style={[cStyles.segBtnText, { fontFamily: FONTS.body, color: theme === t.key ? COLORS.cyan : COLORS.textSecondary }]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={[cStyles.prefItemValue, { fontFamily: FONTS.body }]}>
              {theme === "light" ? "Clair" : theme === "system" ? "Automatique" : "Sombre"}
            </Text>
          )}
        </View>
      </View>

      {/* NOTIFICATIONS */}
      <View style={cStyles.section}>
        <SectionHeader
          title="NOTIFICATIONS"
          icon="bell"
          editing={editingNotifs}
          onToggleEdit={() => { if (editingNotifs) { handleSaveNotifs(); } else { setEditingNotifs(true); } }}
          saving={saving["notifs"]}
        />

        <Text style={[cStyles.fieldLabel, { fontFamily: FONTS.body }]}>Heure de rappel matin</Text>
        {editingNotifs ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={cStyles.durationRow}>
            {NOTIF_HOURS.map(h => (
              <TouchableOpacity
                key={h}
                onPress={() => setMorningNotifHour(h)}
                style={[cStyles.durationChip, morningNotifHour === h && cStyles.durationChipActive]}
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
          <Text style={[cStyles.valueText, { fontFamily: FONTS.bodyMedium }]}>{morningNotifHour}h00</Text>
        )}

        <Text style={[cStyles.fieldLabel, { fontFamily: FONTS.body, marginTop: 10 }]}>Types de notifications</Text>
        {NOTIF_TYPES.map(({ key, label }, idx, arr) => (
          <View
            key={key}
            style={[cStyles.privacyRow, idx === arr.length - 1 && { borderBottomWidth: 0 }]}
          >
            <Text style={[cStyles.privacyLabel, { fontFamily: FONTS.body }]}>{label}</Text>
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
      </View>

      {/* APPLICATIONS SANTÉ */}
      <View style={cStyles.section}>
        <SectionHeader
          title="APPLICATIONS SANTÉ"
          icon="heart"
          editing={false}
          onToggleEdit={() => {}}
        />
        <Text style={[cStyles.privacyDesc, { fontFamily: FONTS.body, marginBottom: 8 }]}>
          Synchronise tes données de santé avec ADAPT.
        </Text>
        {HEALTH_APPS.map(app => {
          const integrationStatus = integrations.find(i => i.provider === app.key);
          const isConnected = integrationStatus?.isConnected ?? false;
          const isLoading = connectingProvider === app.key;
          return (
            <View key={app.key} style={cStyles.healthAppRow}>
              <View style={[cStyles.healthAppIcon, { backgroundColor: `${app.color}22` }]}>
                <Text style={{ fontSize: 18 }}>{app.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[cStyles.healthAppName, { fontFamily: FONTS.bodyMedium }]}>{app.label}</Text>
                {isConnected && integrationStatus?.connectedAt && (
                  <Text style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.body }}>
                    Connecté le {new Date(integrationStatus.connectedAt).toLocaleDateString("fr-FR")}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={[
                  cStyles.integrationBtn,
                  { backgroundColor: isConnected ? "transparent" : COLORS.violet, borderColor: isConnected ? COLORS.border : "transparent" },
                ]}
                activeOpacity={0.75}
                disabled={isLoading}
                onPress={() => handleToggleIntegration(app.key, isConnected)}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={isConnected ? COLORS.textMuted : "#fff"} />
                ) : (
                  <Text style={[cStyles.integrationBtnText, { fontFamily: FONTS.bodyMedium, color: isConnected ? COLORS.textMuted : "#fff" }]}>
                    {isConnected ? "Déconnecter" : "Connecter"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {/* DONNÉES PARTAGÉES AVEC LE COACH */}
      <View style={cStyles.section}>
        <SectionHeader
          title="DONNÉES PARTAGÉES AVEC LE COACH"
          icon="eye"
          editing={editingPrivacy}
          onToggleEdit={() => { if (editingPrivacy) { handleSavePrivacy(); } else { setEditingPrivacy(true); } }}
          saving={saving["privacy"]}
        />
        <Text style={[cStyles.privacyDesc, { fontFamily: FONTS.body }]}>
          Ces données sont transmises à ton coach sur toutes ses vues (liste, détail, historique de check-ins). Désactiver un interrupteur masque la donnée partout.
        </Text>
        {([
          { key: "shareWeight" as const, label: "Poids corporel", icon: "trending-down" as const },
          { key: "shareSleep" as const, label: "Qualité du sommeil", icon: "moon" as const },
          { key: "shareHeartRate" as const, label: "Fréquence cardiaque", icon: "heart" as const },
          { key: "shareBodyFat" as const, label: "Masse grasse (%)", icon: "percent" as const },
        ] as const).map(({ key, label, icon }, idx, arr) => (
          <View
            key={key}
            style={[
              cStyles.privacyRow,
              idx === arr.length - 1 && { borderBottomWidth: 0 },
            ]}
          >
            <View style={cStyles.privacyLeft}>
              <Feather name={icon} size={14} color={COLORS.textMuted} />
              <Text style={[cStyles.privacyLabel, { fontFamily: FONTS.body }]}>{label}</Text>
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
          title="PARAMÈTRES DE CONFIDENTIALITÉ"
          icon="shield"
          editing={false}
          onToggleEdit={() => {}}
        />
        <Text style={[cStyles.privacyDesc, { fontFamily: FONTS.body }]}>
          Ces paramètres contrôlent la visibilité globale de ton profil et l'accès à tes données personnelles.
        </Text>
        <View style={[cStyles.privacyRow, { borderBottomWidth: 0 }]}>
          <View style={cStyles.privacyLeft}>
            <Feather name="lock" size={14} color={COLORS.textMuted} />
            <Text style={[cStyles.privacyLabel, { fontFamily: FONTS.body }]}>Profil privé (coach uniquement)</Text>
          </View>
          <Switch
            value={true}
            disabled={true}
            trackColor={{ false: COLORS.border, true: COLORS.cyanDim }}
            thumbColor={COLORS.cyan}
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
});
