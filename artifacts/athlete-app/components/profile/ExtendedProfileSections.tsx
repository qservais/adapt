import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { customFetch } from "@workspace/api-client-react";
import { COLORS, FONTS } from "@/constants/theme";
import { useFocusEffect } from "@react-navigation/native";

type ExtendedProfileData = {
  completionPercent: number;
  secondaryGoal: string | null;
  sessionDurationMin: number | null;
  sessionDurationMax: number | null;
  availableDays: string[];
  trainingLocations: string[];
  equipment: string[];
  language: string;
  theme: string;
  units: string;
  privacySettings: {
    shareWeight?: boolean;
    shareSleep?: boolean;
    shareHeartRate?: boolean;
    shareBodyFat?: boolean;
  };
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
  const [profile, setProfile] = useState<ExtendedProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const [editingContext, setEditingContext] = useState(false);
  const [editingGoals, setEditingGoals] = useState(false);
  const [editingPrefs, setEditingPrefs] = useState(false);
  const [editingPrivacy, setEditingPrivacy] = useState(false);

  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [trainingLocations, setTrainingLocations] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [sessionDurationMin, setSessionDurationMin] = useState<number | null>(null);
  const [sessionDurationMax, setSessionDurationMax] = useState<number | null>(null);

  const [secondaryGoal, setSecondaryGoal] = useState<string | null>(null);

  const [units, setUnits] = useState<string>("metric");
  const [language, setLanguage] = useState<string>("fr");
  const [theme, setTheme] = useState<string>("dark");

  const [privacy, setPrivacy] = useState<ExtendedProfileData["privacySettings"]>({});

  const [healthModalVisible, setHealthModalVisible] = useState(false);
  const [selectedHealthApp, setSelectedHealthApp] = useState<string>("");

  const fetchProfile = useCallback(async () => {
    try {
      const data = await customFetch<ExtendedProfileData>("/api/users/me/profile");
      setProfile(data);
      setAvailableDays(data.availableDays ?? []);
      setTrainingLocations(data.trainingLocations ?? []);
      setEquipment(data.equipment ?? []);
      setSessionDurationMin(data.sessionDurationMin);
      setSessionDurationMax(data.sessionDurationMax);
      setSecondaryGoal(data.secondaryGoal);
      setUnits(data.units ?? "metric");
      setLanguage(data.language ?? "fr");
      setTheme(data.theme ?? "dark");
      setPrivacy(data.privacySettings ?? {});
      onCompletionChange?.(data.completionPercent);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [onCompletionChange]);

  useFocusEffect(useCallback(() => {
    fetchProfile();
  }, [fetchProfile]));

  const saveSection = async (section: string, body: Partial<ExtendedProfileData>) => {
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
    });
    setEditingContext(false);
  };

  const handleSaveGoals = async () => {
    await saveSection("goals", { secondaryGoal });
    setEditingGoals(false);
  };

  const handleSavePrefs = async () => {
    await saveSection("prefs", { units, language, theme });
    setEditingPrefs(false);
  };

  const handleSavePrivacy = async () => {
    await saveSection("privacy", { privacySettings: privacy });
    setEditingPrivacy(false);
  };

  const toggleDay = (key: string) => {
    setAvailableDays(prev =>
      prev.includes(key) ? prev.filter(d => d !== key) : [...prev, key]
    );
  };

  const toggleLocation = (key: string) => {
    setTrainingLocations(prev =>
      prev.includes(key) ? prev.filter(d => d !== key) : [...prev, key]
    );
  };

  const toggleEquipment = (key: string) => {
    setEquipment(prev =>
      prev.includes(key) ? prev.filter(d => d !== key) : [...prev, key]
    );
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

      <View style={cStyles.section}>
        <SectionHeader
          title="CONTEXTE D'ENTRAÎNEMENT"
          icon="activity"
          editing={editingContext}
          onToggleEdit={() => {
            if (editingContext) {
              handleSaveContext();
            } else {
              setEditingContext(true);
            }
          }}
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
      </View>

      <View style={cStyles.section}>
        <SectionHeader
          title="OBJECTIFS"
          icon="target"
          editing={editingGoals}
          onToggleEdit={() => {
            if (editingGoals) {
              handleSaveGoals();
            } else {
              setEditingGoals(true);
            }
          }}
          saving={saving["goals"]}
        />
        <Text style={[cStyles.fieldLabel, { fontFamily: FONTS.body }]}>Objectif secondaire</Text>
        <View style={cStyles.chipRow}>
          {SECONDARY_GOALS.map(g => (
            <ToggleChip
              key={g.key}
              label={g.label}
              selected={secondaryGoal === g.key}
              onPress={() => {
                if (!editingGoals) return;
                setSecondaryGoal(prev => prev === g.key ? null : g.key);
              }}
              color={COLORS.violet}
              small
            />
          ))}
        </View>
        {!editingGoals && !secondaryGoal && (
          <Text style={[cStyles.emptyHint, { fontFamily: FONTS.body }]}>
            Appuie sur l'icône crayon pour modifier
          </Text>
        )}
      </View>

      <View style={cStyles.section}>
        <SectionHeader
          title="PRÉFÉRENCES"
          icon="sliders"
          editing={editingPrefs}
          onToggleEdit={() => {
            if (editingPrefs) {
              handleSavePrefs();
            } else {
              setEditingPrefs(true);
            }
          }}
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
              <View style={[cStyles.segBtn, cStyles.segBtnActive, { opacity: 1 }]}>
                <Text style={[cStyles.segBtnText, { fontFamily: FONTS.body, color: COLORS.cyan }]}>Sombre</Text>
              </View>
              <View style={[cStyles.segBtn, { opacity: 0.5 }]}>
                <Text style={[cStyles.segBtnText, { fontFamily: FONTS.body, color: COLORS.textMuted }]}>Clair</Text>
              </View>
            </View>
          ) : (
            <Text style={[cStyles.prefItemValue, { fontFamily: FONTS.body }]}>Sombre</Text>
          )}
        </View>
        {editingPrefs && (
          <Text style={[cStyles.comingSoon, { fontFamily: FONTS.body }]}>
            ✦ Mode clair et automatique bientôt disponibles
          </Text>
        )}
      </View>

      <View style={cStyles.section}>
        <SectionHeader
          title="APPLICATIONS SANTÉ"
          icon="heart"
          editing={false}
          onToggleEdit={() => {}}
        />
        {HEALTH_APPS.map(app => (
          <TouchableOpacity
            key={app.key}
            style={cStyles.healthAppRow}
            activeOpacity={0.75}
            onPress={() => {
              setSelectedHealthApp(app.label);
              setHealthModalVisible(true);
            }}
          >
            <View style={[cStyles.healthAppIcon, { backgroundColor: `${app.color}22` }]}>
              <Text style={{ fontSize: 18 }}>{app.icon}</Text>
            </View>
            <Text style={[cStyles.healthAppName, { fontFamily: FONTS.bodyMedium }]}>{app.label}</Text>
            <View style={cStyles.comingSoonBadge}>
              <Text style={[cStyles.comingSoonText, { fontFamily: FONTS.mono }]}>BIENTÔT</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={cStyles.section}>
        <SectionHeader
          title="CONFIDENTIALITÉ"
          icon="shield"
          editing={editingPrivacy}
          onToggleEdit={() => {
            if (editingPrivacy) {
              handleSavePrivacy();
            } else {
              setEditingPrivacy(true);
            }
          }}
          saving={saving["privacy"]}
        />
        <Text style={[cStyles.privacyDesc, { fontFamily: FONTS.body }]}>
          Choisis les données partagées avec ton coach.
        </Text>
        {([
          { key: "shareWeight" as const, label: "Partager mon poids", icon: "trending-down" as const },
          { key: "shareSleep" as const, label: "Partager mon sommeil", icon: "moon" as const },
          { key: "shareHeartRate" as const, label: "Partager ma fréquence cardiaque", icon: "heart" as const },
          { key: "shareBodyFat" as const, label: "Partager ma masse grasse", icon: "percent" as const },
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
                  saveSection("privacy", { privacySettings: { ...privacy, [key]: v } });
                }
              }}
              trackColor={{ false: COLORS.border, true: COLORS.cyanDim }}
              thumbColor={privacy[key] !== false ? COLORS.cyan : COLORS.textMuted}
            />
          </View>
        ))}
      </View>

      <Modal
        visible={healthModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setHealthModalVisible(false)}
      >
        <Pressable style={cStyles.modalOverlay} onPress={() => setHealthModalVisible(false)}>
          <View style={cStyles.modalBox}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>🔮</Text>
            <Text style={[cStyles.modalTitle, { fontFamily: FONTS.mono }]}>BIENTÔT DISPONIBLE</Text>
            <Text style={[cStyles.modalBody, { fontFamily: FONTS.body }]}>
              La connexion avec {selectedHealthApp} sera disponible dans une prochaine mise à jour d'ADAPT.
            </Text>
            <TouchableOpacity
              onPress={() => setHealthModalVisible(false)}
              style={cStyles.modalBtn}
              activeOpacity={0.8}
            >
              <Text style={[cStyles.modalBtnText, { fontFamily: FONTS.bodyMedium }]}>Compris</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgInput,
  },
  segBtnActive: {
    borderColor: COLORS.cyan,
    backgroundColor: COLORS.cyanDim,
  },
  segBtnText: { fontSize: 12 },
  comingSoon: { fontSize: 11, color: COLORS.amber, marginTop: 4 },
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
