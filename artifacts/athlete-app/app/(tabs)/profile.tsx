import React, { useCallback, useRef, useState } from "react";
import { getGenericErrorMessage } from "@/lib/errors";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { resolveMediaUrl } from "@/lib/custom-fetch";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useGetMe,
  useUpdateMe,
  useGetBadges,
  useGetNotificationPreferences,
  useUpdateNotificationPreferences,
  getGetNotificationPreferencesQueryKey,
  getGetMeQueryKey,
  type NotificationPreferences,
  customFetch,
  useGetCoaches,
  useRequestCoach,
  useGetAthleteCoachRequest,
  useCancelCoachRequest,
  COACH_REQUEST_QUERY_KEY,
  useGetPersonalRecords,
} from "@workspace/api-client-react";
import { tokenStore } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { useFormatWeight, useThemeColors, useT } from "@/context/PreferencesContext";
import { COLORS, FONTS } from "@/constants/theme";
import ExtendedProfileSections from "@/components/profile/ExtendedProfileSections";
import { PRHistoryModal } from "@/components/profile/PRHistoryModal";
import { useFocusEffect, useScrollToTop } from "@react-navigation/native";
import { GlowCard } from "@/components/ui/GlowCard";
import { InputField } from "@/components/ui/InputField";
import { GradientButton } from "@/components/ui/GradientButton";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";

interface AthleteProgram {
  id: string;
  name: string;
  durationWeeks: number;
  startDate: string | null;
  isActive: boolean;
  previewEnabled: boolean;
  previewAllowStart: boolean;
  startsInFuture: boolean;
  createdAt?: string;
}

interface ProgramDetail {
  programId: string;
  programName: string;
  startDate: string | null;
  durationWeeks: number;
  isActive: boolean;
  startsInFuture: boolean;
  previewEnabled: boolean;
  previewAllowStart: boolean;
  sessions: {
    sessionId: string;
    name: string;
    type: string;
    weekNumber: number;
    dayNumber: number;
    scheduledDate: string;
    estimatedDurationMin: number | null;
    coachNotes: string | null;
    exercises: {
      id: string;
      name: string;
      sets: number;
      reps: string | null;
      loadKg: number | null;
      restSeconds: number | null;
      durationSeconds: number | null;
    }[];
  }[];
}

const GOAL_LABELS: Record<string, string> = {
  strength: "Force",
  muscle: "Prise de masse",
  fat_loss: "Perte de poids",
  performance: "Performance",
  health: "Santé",
  aesthetic: "Esthétique",
  fitness: "Fitness",
};

const FITNESS_LABELS: Record<string, string> = {
  beginner: "Débutant",
  intermediate: "Intermédiaire",
  advanced: "Avancé",
};

const GENDER_LABELS: Record<string, string> = {
  homme: "Homme",
  femme: "Femme",
};

const CYCLE_PHASE_LABELS: Record<string, string> = {
  menstrual: "Menstruel",
  follicular: "Folliculaire",
  ovulatory: "Ovulatoire",
  luteal: "Lutéal",
};

function computeCyclePhase(lastPeriodDate: string | null | undefined, avgCycleDays: number | null | undefined): string | null {
  if (!lastPeriodDate) return null;
  const lastPeriod = new Date(String(lastPeriodDate).substring(0, 10) + "T12:00:00");
  if (isNaN(lastPeriod.getTime())) return null;
  const cycleDays = avgCycleDays && avgCycleDays >= 20 ? avgCycleDays : 28;
  const daysSince = Math.floor((Date.now() - lastPeriod.getTime()) / 86400000);
  const dayInCycle = ((daysSince % cycleDays) + cycleDays) % cycleDays + 1;
  if (dayInCycle <= 5) return "menstrual";
  if (dayInCycle <= 13) return "follicular";
  if (dayInCycle <= 16) return "ovulatory";
  return "luteal";
}

function computeAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  const dob = new Date(birthDate);
  if (isNaN(dob.getTime())) return null;
  const diff = Date.now() - dob.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  useScrollToTop(scrollRef);
  const { user, logout, updateUser } = useAuth();
  const meQuery = useGetMe();
  const updateMutation = useUpdateMe();
  const queryClient = useQueryClient();
  const badgesQuery = useGetBadges();
  const { data: coaches } = useGetCoaches();
  const { data: coachRequest } = useGetAthleteCoachRequest();
  const requestMutation = useRequestCoach();
  const cancelRequestMutation = useCancelCoachRequest();

  const formatWeight = useFormatWeight();
  const colors = useThemeColors();
  const t = useT();

  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [gender, setGender] = useState<string>(user?.gender ?? "");
  const [cycleTracking, setCycleTracking] = useState(user?.cycleTracking ?? false);
  const [weight, setWeight] = useState<string>("");
  const [heightCm, setHeightCm] = useState<string>("");
  const [trainingFrequency, setTrainingFrequency] = useState<string>("");
  const [fitnessLevel, setFitnessLevel] = useState<string>("");
  const [primaryGoal, setPrimaryGoal] = useState<string>("");
  const [birthDateValue, setBirthDateValue] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [lastPeriodDateValue, setLastPeriodDateValue] = useState<Date | null>(null);
  const [showLastPeriodPicker, setShowLastPeriodPicker] = useState(false);
  const [avgCycleDaysInput, setAvgCycleDaysInput] = useState<string>("28");

  const [coachPickerVisible, setCoachPickerVisible] = useState(false);
  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);
  const [requestError, setRequestError] = useState("");

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<"profil" | "records" | "programmes">("profil");
  const prsQuery = useGetPersonalRecords();
  const [expandedProgramId, setExpandedProgramId] = useState<string | null>(null);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const programsQuery = useQuery<AthleteProgram[]>({
    queryKey: ["/api/athlete/programs"],
    queryFn: () => customFetch("/api/athlete/programs") as Promise<AthleteProgram[]>,
  });
  const programDetailQuery = useQuery<ProgramDetail | null>({
    queryKey: ["/api/athlete/programs", expandedProgramId, "preview"],
    queryFn: () => expandedProgramId
      ? customFetch(`/api/athlete/programs/${expandedProgramId}/preview`) as Promise<ProgramDetail>
      : Promise.resolve(null),
    enabled: !!expandedProgramId,
  });
  const [selectedPrExercise, setSelectedPrExercise] = useState<{ id: string; name: string } | null>(null);

  const handleAvatarPress = () => {
    Alert.alert("Photo de profil", "Choisir une source", [
      {
        text: "Galerie",
        onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) {
            Alert.alert("Permission refusée", "Active l'accès à la galerie dans les réglages.");
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: "images",
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });
          if (!result.canceled && result.assets[0]) {
            await uploadAvatar(result.assets[0].uri);
          }
        },
      },
      {
        text: "Caméra",
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) {
            Alert.alert("Permission refusée", "Active l'accès à la caméra dans les réglages.");
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });
          if (!result.canceled && result.assets[0]) {
            await uploadAvatar(result.assets[0].uri);
          }
        },
      },
      { text: "Annuler", style: "cancel" },
    ]);
  };

  const uploadAvatar = async (uri: string) => {
    setAvatarUploading(true);
    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 800, height: 800 } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
      );
      const resizedUri = manipResult.uri;

      const formData = new FormData();
      formData.append("avatar", { uri: resizedUri, name: "avatar.jpg", type: "image/jpeg" } as unknown as Blob);

      const accessToken = await tokenStore.getAccess();
      const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
        ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
        : "";

      const response = await fetch(`${BASE_URL}/api/users/me/avatar`, {
        method: "POST",
        body: formData,
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? `Erreur HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data?.user) {
        updateUser({ ...data.user, avatarUrl: data.avatarUrl ?? data.user.avatarUrl });
      }
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    } catch (err) {
      Alert.alert("Erreur", getGenericErrorMessage(err, "Impossible de mettre à jour la photo de profil"));
    } finally {
      setAvatarUploading(false);
    }
  };

  const { data: notifPrefs } = useGetNotificationPreferences();
  const updatePrefsMutation = useUpdateNotificationPreferences({
    mutation: {
      onSuccess: (updated) => {
        queryClient.setQueryData<NotificationPreferences>(getGetNotificationPreferencesQueryKey(), updated);
      },
    },
  });

  const blurResetRef = useRef({ meQuery, user });
  blurResetRef.current = { meQuery, user };

  useFocusEffect(
    useCallback(() => {
      return () => {
        const p = blurResetRef.current.meQuery.data ?? blurResetRef.current.user;
        setEditing(false);
        setShowDatePicker(false);
        setShowLastPeriodPicker(false);
        setFirstName(p?.firstName ?? "");
        setLastName(p?.lastName ?? "");
        setGender(p?.gender ?? "");
        setCycleTracking(p?.cycleTracking ?? false);
        setWeight(p?.weightKg ? String(Math.round(parseFloat(String(p.weightKg)))) : "");
        setHeightCm(p?.heightCm ? String(p.heightCm) : "");
        setTrainingFrequency(p?.trainingFrequency ? String(p.trainingFrequency) : "");
        setFitnessLevel(p?.fitnessLevel ?? "");
        setPrimaryGoal(p?.primaryGoal ?? "");
        setAvgCycleDaysInput(p?.avgCycleDays != null ? String(p.avgCycleDays) : "28");
        if (p?.birthDate) {
          setBirthDateValue(new Date(String(p.birthDate).substring(0, 10) + "T12:00:00"));
        } else {
          setBirthDateValue(null);
        }
        if (p?.lastPeriodDate) {
          setLastPeriodDateValue(new Date(String(p.lastPeriodDate).substring(0, 10) + "T12:00:00"));
        } else {
          setLastPeriodDateValue(null);
        }
      };
    }, [])
  );

  const startEditing = () => {
    const p = meQuery.data ?? user;
    setFirstName(p?.firstName ?? "");
    setLastName(p?.lastName ?? "");
    setGender(p?.gender ?? "");
    setCycleTracking(p?.cycleTracking ?? false);
    setWeight(p?.weightKg ? String(Math.round(parseFloat(String(p.weightKg)))) : "");
    setHeightCm(p?.heightCm ? String(p.heightCm) : "");
    setTrainingFrequency(p?.trainingFrequency ? String(p.trainingFrequency) : "");
    setFitnessLevel(p?.fitnessLevel ?? "");
    setPrimaryGoal(p?.primaryGoal ?? "");
    setAvgCycleDaysInput(p?.avgCycleDays != null ? String(p.avgCycleDays) : "28");
    if (p?.birthDate) {
      setBirthDateValue(new Date(String(p.birthDate).substring(0, 10) + "T12:00:00"));
    } else {
      setBirthDateValue(null);
    }
    if (p?.lastPeriodDate) {
      setLastPeriodDateValue(new Date(String(p.lastPeriodDate).substring(0, 10) + "T12:00:00"));
    } else {
      setLastPeriodDateValue(null);
    }
    setEditing(true);
  };

  const handleSave = async () => {
    const parsedWeight = parseFloat(weight);
    const parsedHeight = parseInt(heightCm, 10);
    const parsedFreq = parseInt(trainingFrequency, 10);
    let birthDateStr: string | undefined;
    if (birthDateValue != null) {
      const y = birthDateValue.getFullYear();
      const m = String(birthDateValue.getMonth() + 1).padStart(2, "0");
      const d = String(birthDateValue.getDate()).padStart(2, "0");
      birthDateStr = `${y}-${m}-${d}`;
    }
    let lastPeriodDateStr: string | null | undefined;
    if (cycleTracking) {
      if (lastPeriodDateValue != null) {
        const y = lastPeriodDateValue.getFullYear();
        const m = String(lastPeriodDateValue.getMonth() + 1).padStart(2, "0");
        const d = String(lastPeriodDateValue.getDate()).padStart(2, "0");
        lastPeriodDateStr = `${y}-${m}-${d}`;
      } else {
        lastPeriodDateStr = null;
      }
    } else {
      lastPeriodDateStr = null;
    }
    const parsedCycleDays = parseInt(avgCycleDaysInput, 10);
    const cycleDaysToSave = !isNaN(parsedCycleDays) && parsedCycleDays >= 20 && parsedCycleDays <= 45 ? parsedCycleDays : undefined;
    try {
      const updated = await updateMutation.mutateAsync({
        data: {
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          gender: (gender as "homme" | "femme") || undefined,
          cycleTracking,
          lastPeriodDate: lastPeriodDateStr,
          avgCycleDays: cycleDaysToSave,
          weightKg: !isNaN(parsedWeight) && parsedWeight >= 20 ? parsedWeight : undefined,
          heightCm: !isNaN(parsedHeight) && parsedHeight >= 50 && parsedHeight <= 300 ? parsedHeight : undefined,
          trainingFrequency: !isNaN(parsedFreq) && parsedFreq >= 1 && parsedFreq <= 14 ? parsedFreq : undefined,
          fitnessLevel: (fitnessLevel as "beginner" | "intermediate" | "advanced") || undefined,
          primaryGoal: (primaryGoal as "strength" | "muscle" | "fat_loss" | "performance" | "health" | "aesthetic" | "fitness") || undefined,
          birthDate: birthDateStr,
        },
      });
      updateUser(updated);
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
    } catch (err: unknown) {
      Alert.alert("Erreur", getGenericErrorMessage(err, "Impossible de mettre à jour le profil"));
    }
  };

  const handleUnlinkCoach = () => {
    Alert.alert(
      "Délier le coach",
      "Es-tu sûr(e) de vouloir te délier de ton coach ? Tu ne recevras plus de programmes personnalisés.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Délier",
          style: "destructive",
          onPress: async () => {
            try {
              await customFetch("/api/users/me/coach", { method: "DELETE" });
              queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
            } catch {
              Alert.alert("Erreur", "Impossible de délier le coach");
            }
          },
        },
      ]
    );
  };

  const handleRequestCoach = async () => {
    if (!selectedCoachId) return;
    setRequestError("");
    try {
      await requestMutation.mutateAsync({ coachId: selectedCoachId });
      setCoachPickerVisible(false);
      setSelectedCoachId(null);
      queryClient.invalidateQueries({ queryKey: COACH_REQUEST_QUERY_KEY });
    } catch {
      setRequestError("Une erreur est survenue. Réessaie.");
    }
  };

  const handleCancelRequest = async () => {
    Alert.alert(
      "Annuler la demande",
      "Es-tu sûr(e) de vouloir annuler ta demande de connexion ?",
      [
        { text: "Non", style: "cancel" },
        {
          text: "Annuler la demande",
          style: "destructive",
          onPress: async () => {
            await cancelRequestMutation.mutateAsync();
            queryClient.invalidateQueries({ queryKey: COACH_REQUEST_QUERY_KEY });
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert("Déconnexion", "Es-tu sûr(e) de vouloir te déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Déconnexion",
        style: "destructive",
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const profile = meQuery.data ?? user;
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const hasCoach = profile?.coachId != null;
  const profileGender = profile?.gender;
  const showCycleTracking = profileGender !== "homme";
  const displayAge = computeAge(profile?.birthDate) ?? profile?.age;
  const trainingFreq = profile?.trainingFrequency;

  return (
    <ScrollView
      ref={scrollRef}
      style={[styles.flex, { backgroundColor: colors.bg }]}
      contentContainerStyle={{ paddingTop: topPad + (Platform.OS === "web" ? 16 : 20), paddingBottom: insets.bottom + (Platform.OS === "web" ? 84 : 49) + 40, paddingHorizontal: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.screenTitle, { fontFamily: FONTS.title, color: colors.textPrimary }]}>PROFIL</Text>
        <TouchableOpacity onPress={editing ? () => setEditing(false) : startEditing} style={styles.editBtn}>
          <Feather name={editing ? "x" : "edit-2"} size={20} color={COLORS.cyan} />
        </TouchableOpacity>
      </View>

      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.8} style={styles.avatarWrap}>
          {profile?.avatarUrl ? (
            <Image
              source={{ uri: resolveMediaUrl(profile.avatarUrl) }}
              style={styles.avatarImg}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={styles.avatar}>
              <Text style={[styles.initials, { fontFamily: FONTS.title }]}>
                {(profile?.firstName?.[0] ?? "A").toUpperCase()}
              </Text>
            </View>
          )}
          {avatarUploading ? (
            <View style={styles.avatarOverlay}>
              <ActivityIndicator color={COLORS.white} size="small" />
            </View>
          ) : (
            <View style={styles.avatarCameraBtn}>
              <Feather name="camera" size={14} color={COLORS.white} />
            </View>
          )}
        </TouchableOpacity>
        <Text style={[styles.displayName, { fontFamily: FONTS.bodyBold, color: colors.textPrimary }]}>
          {profile?.firstName} {profile?.lastName ?? ""}
        </Text>
        <Text style={[styles.email, { fontFamily: FONTS.mono, color: colors.textMuted }]}>{profile?.email}</Text>
        <View
          style={[
            styles.roleBadge,
            profile?.role === "coach" && { borderColor: COLORS.violet, backgroundColor: COLORS.violetDim },
          ]}
        >
          <Text
            style={[
              styles.roleText,
              {
                fontFamily: FONTS.mono,
                color: profile?.role === "coach" ? COLORS.violet : COLORS.cyan,
              },
            ]}
          >
            {profile?.role === "coach" ? "COACH" : "ATHLÈTE"}
          </Text>
        </View>
      </View>

      {profile != null && (
        <View style={[styles.statsRow, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { fontFamily: FONTS.monoBold, color: colors.textPrimary }]}>
              {displayAge ?? "—"}
            </Text>
            <Text style={[styles.statLabel, { fontFamily: FONTS.body, color: colors.textSecondary }]}>Âge</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { fontFamily: FONTS.monoBold, color: colors.textPrimary }]}>
              {formatWeight(profile.weightKg != null ? parseFloat(String(profile.weightKg)) : null)}
            </Text>
            <Text style={[styles.statLabel, { fontFamily: FONTS.body, color: colors.textSecondary }]}>{t("weight", "Poids")}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { fontFamily: FONTS.monoBold, color: colors.textPrimary }]}>
              {profile.heightCm ?? "—"}
            </Text>
            <Text style={[styles.statLabel, { fontFamily: FONTS.body, color: colors.textSecondary }]}>cm</Text>
          </View>
          {trainingFreq != null && (
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { fontFamily: FONTS.monoBold, color: colors.textPrimary }]}>
                {trainingFreq}×
              </Text>
              <Text style={[styles.statLabel, { fontFamily: FONTS.body, color: colors.textSecondary }]}>/ sem.</Text>
            </View>
          )}
        </View>
      )}

      <View style={[styles.tabBar, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        {(["profil", "records", "programmes"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.75}
          >
            <Text style={[
              styles.tabBtnText,
              { fontFamily: FONTS.mono, color: activeTab === tab ? COLORS.cyan : COLORS.textSecondary },
            ]}>
              {tab === "profil" ? "PROFIL" : tab === "records" ? "RECORDS" : "PROGR."}
              {tab === "records" && (prsQuery.data?.total ?? 0) > 0 && (
                <Text style={{ color: activeTab === tab ? COLORS.cyan : COLORS.textMuted }}>
                  {" "}({prsQuery.data?.total})
                </Text>
              )}
            </Text>
            {activeTab === tab && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === "records" && (
        <View style={{ marginBottom: 24 }}>
          {prsQuery.isLoading ? (
            <View style={styles.prsLoadingBox}>
              <ActivityIndicator color={COLORS.cyan} />
            </View>
          ) : prsQuery.isError ? (
            <View style={styles.prsEmptyBox}>
              <Feather name="alert-circle" size={36} color={COLORS.textMuted} />
              <Text style={[styles.prsEmptyTitle, { fontFamily: FONTS.bodyBold }]}>
                Impossible de charger les records
              </Text>
              <Text style={[styles.prsEmptyDesc, { fontFamily: FONTS.body }]}>
                Vérifie ta connexion et réessaie.
              </Text>
            </View>
          ) : (prsQuery.data?.personalRecords?.length ?? 0) === 0 ? (
            <View style={styles.prsEmptyBox}>
              <Feather name="award" size={36} color={COLORS.textMuted} />
              <Text style={[styles.prsEmptyTitle, { fontFamily: FONTS.bodyBold }]}>
                Aucun record encore
              </Text>
              <Text style={[styles.prsEmptyDesc, { fontFamily: FONTS.body }]}>
                Tes records personnels apparaîtront ici après tes séances.
              </Text>
            </View>
          ) : (
            <View style={styles.prsContainer}>
              <Text style={[styles.prsSectionLabel, { fontFamily: FONTS.mono }]}>
                {prsQuery.data!.total} RECORD{prsQuery.data!.total > 1 ? "S" : ""} PERSONNEL{prsQuery.data!.total > 1 ? "S" : ""}
              </Text>
              {prsQuery.data!.personalRecords.map((pr, idx) => {
                const gain =
                  pr.previousLoadKg != null && pr.loadKg != null
                    ? pr.loadKg - pr.previousLoadKg
                    : null;
                const dateStr = pr.achievedAt
                  ? new Date(pr.achievedAt).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : null;
                return (
                  <TouchableOpacity
                    key={`${pr.exerciseId}-${idx}`}
                    style={[
                      styles.prCard,
                      pr.isRecent && styles.prCardRecent,
                    ]}
                    activeOpacity={0.75}
                    onPress={() => setSelectedPrExercise({ id: pr.exerciseId, name: pr.exerciseName })}
                  >
                    <View style={styles.prCardTop}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={[styles.prExName, { fontFamily: FONTS.bodyBold, color: colors.textPrimary }]} numberOfLines={1}>
                          {pr.exerciseName}
                        </Text>
                        {dateStr && (
                          <Text style={[styles.prDate, { fontFamily: FONTS.body }]}>
                            {dateStr}
                          </Text>
                        )}
                      </View>
                      <View style={styles.prLoadBox}>
                        <Text style={[styles.prLoad, { fontFamily: FONTS.monoBold }]}>
                          {pr.loadKg != null ? `${pr.loadKg} kg` : "—"}
                          {pr.reps != null ? ` × ${pr.reps}` : ""}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.prCardBottom}>
                      {pr.isRecent && (
                        <View style={styles.prRecentBadge}>
                          <Text style={[styles.prRecentText, { fontFamily: FONTS.mono }]}>NOUVEAU</Text>
                        </View>
                      )}
                      {gain != null && gain > 0 && (
                        <View style={styles.prGainRow}>
                          <Feather name="trending-up" size={12} color={COLORS.cyan} />
                          <Text style={[styles.prGainText, { fontFamily: FONTS.mono }]}>
                            +{gain % 1 === 0 ? gain : gain.toFixed(1)} kg vs précédent
                          </Text>
                        </View>
                      )}
                      {pr.previousLoadKg != null && (
                        <Text style={[styles.prPrev, { fontFamily: FONTS.body }]}>
                          Précédent : {pr.previousLoadKg} kg
                        </Text>
                      )}
                      <View style={{ flex: 1, alignItems: "flex-end" }}>
                        <Feather name="chevron-right" size={14} color={COLORS.textMuted} />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      )}

      {activeTab === "programmes" && (
        <View style={{ marginBottom: 24 }}>
          {programsQuery.isLoading ? (
            <View style={styles.prsLoadingBox}>
              <ActivityIndicator color={COLORS.cyan} />
            </View>
          ) : programsQuery.isError ? (
            <View style={styles.prsEmptyBox}>
              <Feather name="alert-circle" size={36} color={COLORS.textMuted} />
              <Text style={[styles.prsEmptyTitle, { fontFamily: FONTS.bodyBold }]}>
                Impossible de charger les programmes
              </Text>
              <Text style={[styles.prsEmptyDesc, { fontFamily: FONTS.body }]}>
                Vérifie ta connexion et réessaie.
              </Text>
            </View>
          ) : (programsQuery.data?.length ?? 0) === 0 ? (
            <View style={styles.prsEmptyBox}>
              <Feather name="layers" size={36} color={COLORS.textMuted} />
              <Text style={[styles.prsEmptyTitle, { fontFamily: FONTS.bodyBold }]}>
                Aucun programme
              </Text>
              <Text style={[styles.prsEmptyDesc, { fontFamily: FONTS.body }]}>
                Tes programmes apparaîtront ici une fois que ton coach t'en aura assigné un.
              </Text>
            </View>
          ) : (
            <View style={styles.progContainer}>
              {programsQuery.data!.map((prog) => {
                const isExpanded = expandedProgramId === prog.id;
                const detail = isExpanded ? programDetailQuery.data : null;
                const isLoadingDetail = isExpanded && programDetailQuery.isFetching;
                const statusLabel = prog.isActive ? "EN COURS" : prog.startsInFuture ? "À VENIR" : "PASSÉ";
                const statusColor = prog.isActive ? COLORS.green : prog.startsInFuture ? COLORS.cyan : COLORS.textMuted;
                const statusBg = prog.isActive ? `${COLORS.green}18` : prog.startsInFuture ? COLORS.cyanDim : `${COLORS.textMuted}18`;
                const borderColor = prog.isActive ? `${COLORS.green}40` : prog.startsInFuture ? `${COLORS.cyan}40` : COLORS.border;
                return (
                  <View key={prog.id} style={[styles.progCard, { borderColor }]}>
                    <TouchableOpacity
                      onPress={() => {
                        if (isExpanded) {
                          setExpandedProgramId(null);
                          setExpandedSessionId(null);
                        } else {
                          setExpandedProgramId(prog.id);
                          setExpandedSessionId(null);
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={styles.progHeader}>
                        <View style={[styles.progStatusBadge, { backgroundColor: statusBg, borderColor: `${statusColor}50` }]}>
                          <Text style={[styles.progStatusText, { fontFamily: FONTS.mono, color: statusColor }]}>
                            {statusLabel}
                          </Text>
                        </View>
                        <View style={{ flex: 1, gap: 3 }}>
                          <Text style={[styles.progName, { fontFamily: FONTS.bodyBold, color: colors.textPrimary }]} numberOfLines={1}>
                            {prog.name}
                          </Text>
                          <Text style={[styles.progMeta, { fontFamily: FONTS.mono }]}>
                            {prog.durationWeeks} semaine{prog.durationWeeks > 1 ? "s" : ""}
                            {prog.startDate
                              ? ` · ${prog.startsInFuture ? "Démarre le" : "Depuis le"} ${new Date(prog.startDate + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}`
                              : ""}
                          </Text>
                        </View>
                        <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={COLORS.textMuted} />
                      </View>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.progDetail}>
                        {isLoadingDetail ? (
                          <View style={{ alignItems: "center", paddingVertical: 20 }}>
                            <ActivityIndicator size="small" color={COLORS.cyan} />
                          </View>
                        ) : detail && detail.sessions.length > 0 ? (
                          <View style={{ gap: 8 }}>
                            <Text style={[styles.progSessLabel, { fontFamily: FONTS.mono }]}>
                              {detail.sessions.length} SÉANCE{detail.sessions.length > 1 ? "S" : ""}
                            </Text>
                            {detail.sessions.map((sess) => {
                              const sessExpanded = expandedSessionId === sess.sessionId;
                              return (
                                <View key={sess.sessionId} style={styles.sessCard}>
                                  <TouchableOpacity
                                    onPress={() => setExpandedSessionId(sessExpanded ? null : sess.sessionId)}
                                    activeOpacity={0.8}
                                  >
                                    <View style={styles.sessHeader}>
                                      <View style={styles.sessWeekBadge}>
                                        <Text style={[styles.sessWeekText, { fontFamily: FONTS.mono }]}>
                                          S{sess.weekNumber}J{sess.dayNumber}
                                        </Text>
                                      </View>
                                      <View style={{ flex: 1, gap: 2 }}>
                                        <Text style={[styles.sessName, { fontFamily: FONTS.bodyMedium, color: colors.textPrimary }]} numberOfLines={1}>
                                          {sess.name}
                                        </Text>
                                        <Text style={[styles.sessMeta, { fontFamily: FONTS.mono }]}>
                                          {sess.exercises.length} exercice{sess.exercises.length !== 1 ? "s" : ""}
                                          {sess.estimatedDurationMin != null ? ` · ${sess.estimatedDurationMin} min` : ""}
                                        </Text>
                                      </View>
                                      <Feather name={sessExpanded ? "chevron-up" : "chevron-down"} size={14} color={COLORS.textMuted} />
                                    </View>
                                  </TouchableOpacity>
                                  {sessExpanded && sess.exercises.length > 0 && (
                                    <View style={styles.exList}>
                                      {sess.exercises.map((ex, i) => (
                                        <View key={ex.id} style={[styles.exRow, i < sess.exercises.length - 1 && styles.exRowBorder]}>
                                          <Text style={[styles.exNum, { fontFamily: FONTS.mono }]}>
                                            {String(i + 1).padStart(2, "0")}
                                          </Text>
                                          <View style={{ flex: 1 }}>
                                            <Text style={[styles.exName, { fontFamily: FONTS.bodyMedium, color: colors.textPrimary }]}>
                                              {ex.name}
                                            </Text>
                                            <Text style={[styles.exDetail, { fontFamily: FONTS.mono }]}>
                                              {ex.sets}×{ex.reps ?? "—"}
                                              {ex.loadKg != null ? ` @ ${ex.loadKg} kg` : ""}
                                              {ex.restSeconds != null && ex.restSeconds > 0 ? ` · ${ex.restSeconds}s repos` : ""}
                                            </Text>
                                          </View>
                                        </View>
                                      ))}
                                    </View>
                                  )}
                                  {sessExpanded && sess.exercises.length === 0 && (
                                    <Text style={[styles.exEmpty, { fontFamily: FONTS.body }]}>
                                      Aucun exercice configuré.
                                    </Text>
                                  )}
                                </View>
                              );
                            })}
                          </View>
                        ) : detail && detail.sessions.length === 0 ? (
                          <Text style={[styles.exEmpty, { fontFamily: FONTS.body }]}>
                            Aucune séance dans ce programme.
                          </Text>
                        ) : null}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {activeTab === "profil" && (editing ? (
        <GlowCard glowColor={COLORS.cyan} style={styles.editCard}>
          <Text style={[styles.sectionTitle, { fontFamily: FONTS.mono, color: colors.textMuted }]}>
            MODIFIER LE PROFIL
          </Text>
          <InputField
            label="Prénom"
            value={firstName}
            onChangeText={setFirstName}
          />
          <InputField
            label="Nom"
            value={lastName}
            onChangeText={setLastName}
          />
          <Text style={[styles.fieldLabel, { fontFamily: FONTS.body, color: colors.textSecondary }]}>Genre</Text>
          <View style={styles.genderRow}>
            {(["homme", "femme"] as const).map((g) => (
              <TouchableOpacity
                key={g}
                onPress={() => {
                  setGender(g);
                  if (g === "homme") setCycleTracking(false);
                }}
                style={[
                  styles.genderBtn,
                  { backgroundColor: colors.bgInput, borderColor: colors.border },
                  gender === g && { borderColor: COLORS.cyan, backgroundColor: COLORS.cyanDim },
                ]}
              >
                <Text style={[
                  styles.genderBtnText,
                  { fontFamily: FONTS.body, color: gender === g ? COLORS.cyan : COLORS.textSecondary },
                ]}>
                  {GENDER_LABELS[g]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {gender !== "homme" && (
            <View style={[styles.switchRow, { backgroundColor: colors.bgInput, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchLabel, { fontFamily: FONTS.bodyMedium, color: colors.textPrimary }]}>
                  Suivi du cycle
                </Text>
                <Text style={[styles.switchDesc, { fontFamily: FONTS.body, color: colors.textMuted }]}>
                  Intègre ta phase cycle dans le score ADAPT
                </Text>
              </View>
              <Switch
                value={cycleTracking}
                onValueChange={(v) => {
                  setCycleTracking(v);
                  if (!v) { setLastPeriodDateValue(null); }
                }}
                trackColor={{ false: COLORS.border, true: COLORS.cyanDim }}
                thumbColor={cycleTracking ? COLORS.cyan : COLORS.textMuted}
              />
            </View>
          )}
          {gender !== "homme" && cycleTracking && (
            <View style={styles.cycleSection}>
              <Text style={[styles.sectionTitle, { fontFamily: FONTS.mono, color: colors.textMuted }]}>
                CYCLE MENSTRUEL
              </Text>
              <Text style={[styles.fieldLabel, { fontFamily: FONTS.bodyMedium, marginTop: 8, marginBottom: 6, color: colors.textSecondary }]}>
                Date des dernières règles
              </Text>
              <TouchableOpacity
                onPress={() => setShowLastPeriodPicker(true)}
                style={[styles.datePicker, { backgroundColor: colors.bgInput, borderColor: COLORS.violet }]}
                activeOpacity={0.7}
              >
                <Feather name="calendar" size={16} color={COLORS.violet} />
                <Text style={[styles.datePickerText, { fontFamily: FONTS.body, color: lastPeriodDateValue ? colors.textPrimary : COLORS.textMuted }]}>
                  {lastPeriodDateValue
                    ? lastPeriodDateValue.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
                    : "Sélectionner une date"}
                </Text>
                <Feather name="chevron-down" size={14} color={COLORS.textMuted} />
              </TouchableOpacity>
              {showLastPeriodPicker && (
                <DateTimePicker
                  value={lastPeriodDateValue ?? new Date()}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  maximumDate={new Date()}
                  minimumDate={new Date(new Date().getFullYear() - 1, 0, 1)}
                  onChange={(_event: DateTimePickerEvent, date: Date | undefined) => {
                    setShowLastPeriodPicker(Platform.OS === "ios");
                    if (date) setLastPeriodDateValue(date);
                  }}
                />
              )}
              <InputField
                label="Durée moyenne du cycle (jours)"
                value={avgCycleDaysInput}
                onChangeText={setAvgCycleDaysInput}
                keyboardType="number-pad"
                placeholder="28"
              />
            </View>
          )}
          <View style={styles.rowInputs}>
            <View style={{ flex: 1 }}>
              <InputField
                label="Poids (kg)"
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                placeholder="ex: 70"
              />
            </View>
            <View style={{ flex: 1 }}>
              <InputField
                label="Taille (cm)"
                value={heightCm}
                onChangeText={setHeightCm}
                keyboardType="number-pad"
                placeholder="ex: 175"
              />
            </View>
          </View>
          <InputField
            label="Séances / semaine"
            value={trainingFrequency}
            onChangeText={setTrainingFrequency}
            keyboardType="number-pad"
            placeholder="ex: 4"
          />
          <Text style={[styles.fieldLabel, { fontFamily: FONTS.body, marginBottom: 6, color: colors.textSecondary }]}>Niveau de forme</Text>
          <View style={styles.segmentRow}>
            {(["beginner", "intermediate", "advanced"] as const).map((level) => (
              <TouchableOpacity
                key={level}
                onPress={() => setFitnessLevel(level)}
                style={[
                  styles.segmentBtn,
                  { backgroundColor: colors.bgInput, borderColor: colors.border },
                  fitnessLevel === level && { borderColor: COLORS.cyan, backgroundColor: COLORS.cyanDim },
                ]}
              >
                <Text style={[
                  styles.segmentBtnText,
                  { fontFamily: FONTS.body, color: fitnessLevel === level ? COLORS.cyan : COLORS.textSecondary },
                ]}>
                  {FITNESS_LABELS[level]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.fieldLabel, { fontFamily: FONTS.body, marginBottom: 6, color: colors.textSecondary }]}>Objectif principal</Text>
          <View style={styles.goalGrid}>
            {(Object.entries(GOAL_LABELS) as [string, string][]).map(([key, label]) => (
              <TouchableOpacity
                key={key}
                onPress={() => setPrimaryGoal(key)}
                style={[
                  styles.goalBtn,
                  { backgroundColor: colors.bgInput, borderColor: colors.border },
                  primaryGoal === key && { borderColor: COLORS.violet, backgroundColor: COLORS.violetDim },
                ]}
              >
                <Text style={[
                  styles.goalBtnText,
                  { fontFamily: FONTS.body, color: primaryGoal === key ? COLORS.violet : COLORS.textSecondary },
                ]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.fieldLabel, { fontFamily: FONTS.bodyMedium, marginTop: 4, marginBottom: 6, color: colors.textSecondary }]}>
            Date de naissance
          </Text>
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            style={[styles.datePicker, { backgroundColor: colors.bgInput, borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <Feather name="calendar" size={16} color={COLORS.cyan} />
            <Text style={[styles.datePickerText, { fontFamily: FONTS.body, color: birthDateValue ? colors.textPrimary : COLORS.textMuted }]}>
              {birthDateValue
                ? birthDateValue.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
                : "Sélectionner une date"}
            </Text>
            <Feather name="chevron-down" size={14} color={COLORS.textMuted} />
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={birthDateValue ?? new Date(1990, 0, 1)}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              maximumDate={new Date(new Date().getFullYear() - 5, 11, 31)}
              minimumDate={new Date(1920, 0, 1)}
              onChange={(_event: DateTimePickerEvent, date: Date | undefined) => {
                setShowDatePicker(Platform.OS === "ios");
                if (date) setBirthDateValue(date);
              }}
            />
          )}
          <GradientButton label="Enregistrer" onPress={handleSave} loading={updateMutation.isPending} />
        </GlowCard>
      ) : (
        <View style={[styles.infoSection, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          {profileGender != null && (
            <View style={styles.infoRow}>
              <Feather name="user" size={16} color={COLORS.textMuted} />
              <Text style={[styles.infoLabel, { fontFamily: FONTS.body, color: colors.textSecondary }]}>Genre</Text>
              <Text style={[styles.infoVal, { fontFamily: FONTS.bodyMedium, color: colors.textPrimary }]}>
                {GENDER_LABELS[profileGender] ?? profileGender}
              </Text>
            </View>
          )}
          {profile?.fitnessLevel != null && (
            <View style={styles.infoRow}>
              <Feather name="activity" size={16} color={COLORS.textMuted} />
              <Text style={[styles.infoLabel, { fontFamily: FONTS.body, color: colors.textSecondary }]}>Niveau</Text>
              <Text style={[styles.infoVal, { fontFamily: FONTS.bodyMedium, color: colors.textPrimary }]}>
                {FITNESS_LABELS[profile.fitnessLevel] ?? profile.fitnessLevel}
              </Text>
            </View>
          )}
          {profile?.primaryGoal != null && (
            <View style={styles.infoRow}>
              <Feather name="target" size={16} color={COLORS.textMuted} />
              <Text style={[styles.infoLabel, { fontFamily: FONTS.body, color: colors.textSecondary }]}>Objectif</Text>
              <Text style={[styles.infoVal, { fontFamily: FONTS.bodyMedium, color: colors.textPrimary }]}>
                {GOAL_LABELS[profile.primaryGoal] ?? profile.primaryGoal.replace(/_/g, " ")}
              </Text>
            </View>
          )}
          {showCycleTracking && (
            <View style={styles.infoRow}>
              <Feather name="refresh-cw" size={16} color={COLORS.textMuted} />
              <Text style={[styles.infoLabel, { fontFamily: FONTS.body, color: colors.textSecondary }]}>
                Suivi du cycle
              </Text>
              <Text style={[styles.infoVal, { fontFamily: FONTS.bodyMedium, color: colors.textPrimary }]}>
                {profile?.cycleTracking ? "Activé" : "Désactivé"}
              </Text>
            </View>
          )}
          {showCycleTracking && profile?.cycleTracking && profile?.lastPeriodDate && (() => {
            const phase = computeCyclePhase(profile.lastPeriodDate, profile.avgCycleDays);
            return phase ? (
              <View style={styles.infoRow}>
                <Feather name="circle" size={16} color={COLORS.violet} />
                <Text style={[styles.infoLabel, { fontFamily: FONTS.body, color: colors.textSecondary }]}>Phase actuelle</Text>
                <Text style={[styles.infoVal, { fontFamily: FONTS.bodyMedium, color: COLORS.violet }]}>
                  {CYCLE_PHASE_LABELS[phase] ?? phase}
                </Text>
              </View>
            ) : null;
          })()}
          {profile?.inviteCode != null && (
            <View style={styles.infoRow}>
              <Feather name="link" size={16} color={COLORS.textMuted} />
              <Text style={[styles.infoLabel, { fontFamily: FONTS.body, color: colors.textSecondary }]}>
                Code d'invitation
              </Text>
              <Text style={[styles.infoVal, { fontFamily: FONTS.mono, color: colors.textPrimary }]}>
                {profile.inviteCode}
              </Text>
            </View>
          )}
          {hasCoach && (
            <View style={[styles.infoRow, { flexWrap: "wrap", gap: 8 }]}>
              <Feather name="users" size={16} color={COLORS.cyan} />
              <Text style={[styles.infoLabel, { fontFamily: FONTS.body, color: colors.textSecondary }]}>Coach</Text>
              <Text style={[styles.infoVal, { fontFamily: FONTS.bodyMedium, color: COLORS.cyan, flex: 1 }]}>
                {profile?.coachName ?? "Connecté"}
              </Text>
              <TouchableOpacity onPress={handleUnlinkCoach} style={styles.unlinkBtn} activeOpacity={0.7}>
                <Text style={[styles.unlinkText, { fontFamily: FONTS.mono }]}>Délier</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}

      {activeTab === "profil" && !hasCoach && (
        <GlowCard glowColor={COLORS.cyan} style={styles.coachSection}>
          <View style={styles.coachHeader}>
            <Feather name="users" size={18} color={COLORS.cyan} />
            <Text style={[styles.coachTitle, { fontFamily: FONTS.mono }]}>
              CONNECTER UN COACH
            </Text>
          </View>
          {coachRequest ? (
            <View style={styles.pendingRequestBox}>
              <View style={styles.pendingIconRow}>
                <Feather name="clock" size={16} color={COLORS.amber} />
                <Text style={[styles.pendingLabel, { fontFamily: FONTS.mono }]}>
                  EN ATTENTE
                </Text>
              </View>
              <Text style={[styles.coachDesc, { fontFamily: FONTS.body, color: colors.textSecondary }]}>
                Ta demande a été envoyée à{" "}
                <Text style={{ color: COLORS.cyan }}>
                  {coachRequest.coachFirstName} {coachRequest.coachLastName ?? ""}
                </Text>
                . Dès que ton coach aura accepté, tu seras connecté(e).
              </Text>
              <TouchableOpacity onPress={handleCancelRequest} style={styles.cancelRequestBtn} activeOpacity={0.7}>
                <Text style={[styles.cancelRequestText, { fontFamily: FONTS.mono }]}>
                  Annuler la demande
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={[styles.coachDesc, { fontFamily: FONTS.body, color: colors.textSecondary }]}>
                Choisis ton coach dans la liste pour lui envoyer une demande de connexion.
              </Text>
              <GradientButton
                label="Choisir un coach"
                onPress={() => setCoachPickerVisible(true)}
              />
            </>
          )}
        </GlowCard>
      )}

      <Modal
        visible={coachPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCoachPickerVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setCoachPickerVisible(false)} />
        <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 20, backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { fontFamily: FONTS.mono }]}>CHOISIR UN COACH</Text>
            <TouchableOpacity onPress={() => setCoachPickerVisible(false)}>
              <Feather name="x" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
          {(coaches ?? []).length === 0 ? (
            <View style={styles.emptyCoachBox}>
              <Text style={[styles.coachDesc, { fontFamily: FONTS.body, textAlign: "center", color: colors.textSecondary }]}>
                Aucun coach disponible.
              </Text>
            </View>
          ) : (
            <>
              <ScrollView style={styles.coachListScroll} showsVerticalScrollIndicator={false}>
                {(coaches ?? []).map(coach => {
                  const selected = selectedCoachId === coach.id;
                  return (
                    <TouchableOpacity
                      key={coach.id}
                      style={[styles.coachPickerCard, { backgroundColor: colors.bgElevated, borderColor: colors.border }, selected && styles.coachPickerCardSelected]}
                      onPress={() => setSelectedCoachId(coach.id)}
                      activeOpacity={0.75}
                    >
                      <View style={styles.coachPickerAvatar}>
                        {coach.avatarUrl ? (
                          <Image source={{ uri: resolveMediaUrl(coach.avatarUrl) }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                        ) : (
                          <Text style={[styles.coachPickerInitials, { fontFamily: FONTS.bodyBold, color: colors.textPrimary }]}>
                            {coach.firstName[0]}{coach.lastName?.[0] ?? ""}
                          </Text>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.coachPickerName, { fontFamily: FONTS.bodyBold, color: selected ? COLORS.cyan : colors.textPrimary }]}>
                          {coach.firstName} {coach.lastName}
                        </Text>
                        <Text style={[styles.coachPickerRole, { fontFamily: FONTS.mono }]}>COACH ADAPT</Text>
                      </View>
                      {selected && <Feather name="check-circle" size={18} color={COLORS.cyan} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              {requestError ? (
                <Text style={[styles.linkError, { fontFamily: FONTS.body, marginHorizontal: 16 }]}>
                  {requestError}
                </Text>
              ) : null}
              <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
                <GradientButton
                  label="Envoyer la demande"
                  onPress={handleRequestCoach}
                  loading={requestMutation.isPending}
                  disabled={!selectedCoachId}
                />
              </View>
            </>
          )}
        </View>
      </Modal>

      {activeTab === "profil" && <ExtendedProfileSections />}

      {activeTab === "profil" && (
        <View style={[styles.quickLinks, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => router.push("/guides" as any)}
            style={styles.quickLinkRow}
            activeOpacity={0.7}
          >
            <View style={styles.quickLinkLeft}>
              <Text style={styles.quickLinkIcon}>📖</Text>
              <View>
                <Text style={[styles.quickLinkTitle, { fontFamily: FONTS.bodyMedium, color: colors.textPrimary }]}>Guides ADAPT</Text>
                <Text style={[styles.quickLinkSub, { fontFamily: FONTS.body, color: colors.textMuted }]}>
                  Entraînement, nutrition, RPE, tempo
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/library" as any)}
            style={styles.quickLinkRow}
            activeOpacity={0.7}
          >
            <View style={styles.quickLinkLeft}>
              <Text style={styles.quickLinkIcon}>🗂️</Text>
              <View>
                <Text style={[styles.quickLinkTitle, { fontFamily: FONTS.bodyMedium, color: colors.textPrimary }]}>Bibliothèque</Text>
                <Text style={[styles.quickLinkSub, { fontFamily: FONTS.body, color: colors.textMuted }]}>
                  Échauffements, réathlétisation, relaxation
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/badges")}
            style={styles.quickLinkRow}
            activeOpacity={0.7}
          >
            <View style={styles.quickLinkLeft}>
              <Text style={styles.quickLinkIcon}>🏅</Text>
              <View>
                <Text style={[styles.quickLinkTitle, { fontFamily: FONTS.bodyMedium, color: colors.textPrimary }]}>Mes badges</Text>
                {(badgesQuery.data?.unlockedCount ?? 0) > 0 && (
                  <Text style={[styles.quickLinkSub, { fontFamily: FONTS.body, color: colors.textMuted }]}>
                    {badgesQuery.data?.unlockedCount} / {badgesQuery.data?.total} débloqués
                  </Text>
                )}
              </View>
            </View>
            <Feather name="chevron-right" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      )}


      <Pressable onPress={handleLogout} style={styles.logoutBtn}>
        <Feather name="log-out" size={18} color={COLORS.red} />
        <Text style={[styles.logoutText, { fontFamily: FONTS.bodyMedium }]}>
          Se déconnecter
        </Text>
      </Pressable>

      <PRHistoryModal
        exerciseId={selectedPrExercise?.id ?? null}
        exerciseName={selectedPrExercise?.name ?? ""}
        onClose={() => setSelectedPrExercise(null)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },
  screenTitle: { fontSize: 44, letterSpacing: 5 },
  editBtn: { padding: 8 },
  rowInputs: { flexDirection: "row", gap: 12 },
  avatarSection: { alignItems: "center", marginBottom: 28, gap: 8 },
  avatarWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    position: "relative",
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.cyanDim,
    borderWidth: 2,
    borderColor: COLORS.cyan,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: COLORS.cyan,
  },
  avatarOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 45,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarCameraBtn: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.cyan,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: COLORS.bg,
  },
  initials: { fontSize: 38, color: COLORS.cyan },
  displayName: { fontSize: 22 },
  email: { fontSize: 13, color: COLORS.textMuted },
  roleBadge: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.cyan,
    backgroundColor: COLORS.cyanDim,
    paddingHorizontal: 12,
    paddingVertical: 3,
  },
  roleText: { fontSize: 11, letterSpacing: 2 },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
  },
  statItem: { alignItems: "center", gap: 4 },
  statVal: { fontSize: 24 },
  statLabel: { fontSize: 12, color: COLORS.textSecondary },
  editCard: { gap: 16, marginBottom: 24 },
  sectionTitle: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 2 },
  section: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 4,
    marginBottom: 8,
  },
  prefRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  prefLabel: { fontSize: 14, color: COLORS.textPrimary, flex: 1 },
  fieldLabel: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 4 },
  genderRow: { flexDirection: "row", gap: 10 },
  genderBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgInput,
    alignItems: "center",
  },
  genderBtnText: { fontSize: 14 },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.bgInput,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  switchLabel: { fontSize: 15, marginBottom: 2 },
  switchDesc: { fontSize: 12, color: COLORS.textMuted },
  infoSection: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLabel: { flex: 1, fontSize: 14, color: COLORS.textSecondary },
  infoVal: { fontSize: 14 },
  coachSection: { gap: 14, marginBottom: 24 },
  coachHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  coachTitle: { fontSize: 11, color: COLORS.cyan, letterSpacing: 2 },
  coachDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },
  linkedRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  linkedText: { fontSize: 15 },
  linkError: { color: COLORS.red, fontSize: 13, textAlign: "center" },
  quickLinks: {
    marginTop: 8,
    marginBottom: 24,
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  quickLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  quickLinkDisabled: { opacity: 0.6 },
  quickLinkLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
  quickLinkIcon: { fontSize: 22 },
  quickLinkTitle: { fontSize: 15 },
  quickLinkSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  comingSoonBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: COLORS.bgElevated,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  comingSoonText: { fontSize: 9, color: COLORS.textMuted, letterSpacing: 1 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    justifyContent: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.redDim,
    backgroundColor: COLORS.redDim,
  },
  logoutText: { fontSize: 16, color: COLORS.red },
  cycleSection: {
    backgroundColor: COLORS.violetDim,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${COLORS.violet}55`,
    padding: 14,
    gap: 8,
  },
  datePicker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.bgInput,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  datePickerText: { flex: 1, fontSize: 15 },
  unlinkBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.redDim,
    backgroundColor: COLORS.redDim,
  },
  unlinkText: { fontSize: 11, color: COLORS.red, letterSpacing: 1 },
  segmentRow: { flexDirection: "row", gap: 8 },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgInput,
    alignItems: "center",
  },
  segmentBtnText: { fontSize: 12 },
  goalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  goalBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgInput,
  },
  goalBtnText: { fontSize: 13 },
  pendingRequestBox: { gap: 10 },
  pendingIconRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  pendingLabel: { fontSize: 10, color: COLORS.amber, letterSpacing: 2 },
  cancelRequestBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.redDim,
    backgroundColor: COLORS.redDim,
  },
  cancelRequestText: { fontSize: 11, color: COLORS.red, letterSpacing: 1 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalSheet: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: "75%",
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 12, color: COLORS.cyan, letterSpacing: 2 },
  coachListScroll: { maxHeight: 300 },
  coachPickerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  coachPickerCardSelected: {
    borderColor: COLORS.cyan,
    backgroundColor: "rgba(0,240,255,0.07)",
  },
  coachPickerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  coachPickerInitials: { fontSize: 16 },
  coachPickerName: { fontSize: 15, marginBottom: 2 },
  coachPickerRole: { fontSize: 9, color: COLORS.cyan, letterSpacing: 2 },
  emptyCoachBox: { alignItems: "center", padding: 32 },
  tabBar: {
    flexDirection: "row",
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
    overflow: "hidden",
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    position: "relative",
  },
  tabBtnActive: {
    backgroundColor: COLORS.cyanDim,
  },
  tabBtnText: {
    fontSize: 11,
    letterSpacing: 2,
  },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    alignSelf: "center",
    width: "60%",
    height: 2,
    borderRadius: 1,
    backgroundColor: COLORS.cyan,
  },
  prsLoadingBox: {
    paddingVertical: 40,
    alignItems: "center",
  },
  prsEmptyBox: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 12,
  },
  prsEmptyTitle: {
    fontSize: 17,
    color: COLORS.textPrimary,
  },
  prsEmptyDesc: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  prsContainer: {
    gap: 10,
  },
  prsSectionLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 2,
    marginBottom: 6,
  },
  prCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 8,
  },
  prCardRecent: {
    borderColor: COLORS.cyan,
    backgroundColor: COLORS.cyanDim,
  },
  prCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  prExName: {
    fontSize: 15,
  },
  prDate: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  prLoadBox: {
    alignItems: "flex-end",
  },
  prLoad: {
    fontSize: 18,
    color: COLORS.cyan,
  },
  prCardBottom: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  prRecentBadge: {
    backgroundColor: COLORS.cyan,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  prRecentText: {
    fontSize: 9,
    color: COLORS.bg,
    letterSpacing: 1,
  },
  prGainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  prGainText: {
    fontSize: 11,
    color: COLORS.cyan,
  },
  prPrev: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  progContainer: {
    gap: 10,
  },
  progCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 0,
  },
  progHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  progStatusBadge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  progStatusText: {
    fontSize: 9,
    letterSpacing: 1.5,
  },
  progName: {
    fontSize: 15,
  },
  progMeta: {
    fontSize: 11,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  progDetail: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  progSessLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    letterSpacing: 2,
    marginBottom: 2,
  },
  sessCard: {
    backgroundColor: COLORS.bgElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    gap: 0,
  },
  sessHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sessWeekBadge: {
    backgroundColor: COLORS.cyanDim,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: `${COLORS.cyan}40`,
  },
  sessWeekText: {
    fontSize: 9,
    color: COLORS.cyan,
    letterSpacing: 0.5,
  },
  sessName: {
    fontSize: 13,
  },
  sessMeta: {
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  exList: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 0,
  },
  exRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 7,
  },
  exRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  exNum: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
    width: 20,
  },
  exName: {
    fontSize: 13,
  },
  exDetail: {
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  exEmpty: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontStyle: "italic",
    marginTop: 8,
    paddingHorizontal: 4,
  },
});
