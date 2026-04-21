import React, { useState, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import type { FreeSessionStartResponse } from "@workspace/api-client-react";
import { COLORS, FONTS } from "@/constants/theme";
import { setFreeSession } from "@/lib/freeSessionStore";
import { GradientButton } from "@/components/ui/GradientButton";

interface Exercise {
  id: string;
  name: string;
  category: string | null;
  muscleGroups: string[] | null;
  equipment: string[] | null;
  description: string | null;
  demoUrl: string | null;
  level: string | null;
}

interface SelectedExercise {
  exercise: Exercise;
  sets: string;
  reps: string;
  loadKg: string;
  restSeconds: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  compound: "Polyarticulaire",
  isolation: "Isolation",
  cardio: "Cardio",
  mobility: "Mobilité",
  core: "Core",
  power: "Puissance",
  plyometric: "Pliométrie",
  réathlétisation: "Réathlétisation",
  force: "Force",
  pliométrie: "Pliométrie",
  mobilité: "Mobilité",
};

const STEP_SELECT = "select";
const STEP_CONFIGURE = "configure";

export default function CustomSessionScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const [step, setStep] = useState<"select" | "configure">(STEP_SELECT);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedExercises, setSelectedExercises] = useState<SelectedExercise[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const { data: exercises = [], isLoading } = useQuery<Exercise[]>({
    queryKey: ["/api/exercises"],
    queryFn: () => customFetch("/api/exercises"),
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return exercises;
    const q = search.toLowerCase().trim();
    return exercises.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.category && CATEGORY_LABELS[e.category]?.toLowerCase().includes(q)) ||
        (e.muscleGroups && e.muscleGroups.some((mg) => mg.toLowerCase().includes(q)))
    );
  }, [exercises, search]);

  const toggleExercise = (exercise: Exercise) => {
    const next = new Set(selectedIds);
    if (next.has(exercise.id)) {
      next.delete(exercise.id);
    } else {
      next.add(exercise.id);
    }
    setSelectedIds(next);
  };

  const goToConfigure = () => {
    if (selectedIds.size === 0) {
      Alert.alert("Aucun exercice", "Sélectionne au moins un exercice.");
      return;
    }
    const ordered = exercises
      .filter((e) => selectedIds.has(e.id))
      .map((exercise) => ({
        exercise,
        sets: "3",
        reps: "10",
        loadKg: "",
        restSeconds: "60",
      }));
    setSelectedExercises(ordered);
    setStep(STEP_CONFIGURE);
  };

  const updateField = (index: number, field: keyof Omit<SelectedExercise, "exercise">, value: string) => {
    setSelectedExercises((prev) => {
      const next = [...prev];
      next[index] = { ...next[index]!, [field]: value };
      return next;
    });
  };

  const removeExercise = (index: number) => {
    setSelectedExercises((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (selectedExercises.length === 0) {
      Alert.alert("Séance vide", "Ajoute au moins un exercice.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: "Séance personnalisée",
        exercises: selectedExercises.map((se) => ({
          exerciseId: se.exercise.id,
          exerciseName: se.exercise.name,
          sets: Math.max(1, parseInt(se.sets) || 3),
          reps: se.reps.trim() || "10",
          loadKg: se.loadKg.trim() ? parseFloat(se.loadKg) || null : null,
          restSeconds: Math.max(0, parseInt(se.restSeconds) || 60),
        })),
      };

      const data = await customFetch("/api/sessions/free-custom", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      }) as FreeSessionStartResponse;

      setFreeSession({
        sessionLogId: data.sessionLogId,
        name: data.name,
        mode: data.mode,
        isFreeSession: true,
        isRoutine: false,
        routineId: null,
        adaptScore: data.adaptScore ?? 50,
        coachNotes: data.coachNotes ?? null,
        estimatedDurationMin: data.estimatedDurationMin ?? null,
        exercises: data.exercises ?? [],
        athletePRs: data.athletePRs ?? {},
      });
      router.push("/session/free");
    } catch {
      Alert.alert("Erreur", "Impossible de créer la séance. Réessaie.");
    } finally {
      setSubmitting(false);
    }
  };

  if (step === STEP_CONFIGURE) {
    return (
      <KeyboardAvoidingView
        style={[styles.flex, { backgroundColor: COLORS.bg }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={{
            paddingTop: topPad + 16,
            paddingBottom: insets.bottom + 120,
            paddingHorizontal: 20,
            gap: 16,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setStep(STEP_SELECT)} style={styles.backBtn}>
              <Feather name="arrow-left" size={22} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { fontFamily: FONTS.title }]}>CONFIGURER</Text>
              <Text style={[styles.subtitle, { fontFamily: FONTS.body }]}>
                {selectedExercises.length} exercice{selectedExercises.length !== 1 ? "s" : ""} sélectionné{selectedExercises.length !== 1 ? "s" : ""}
              </Text>
            </View>
          </View>

          {selectedExercises.map((se, i) => (
            <View key={se.exercise.id} style={styles.configCard}>
              <View style={styles.configCardHeader}>
                <View style={styles.exNumBadge}>
                  <Text style={[styles.exNumText, { fontFamily: FONTS.mono }]}>
                    {String(i + 1).padStart(2, "0")}
                  </Text>
                </View>
                <Text style={[styles.configExName, { fontFamily: FONTS.bodyBold }]} numberOfLines={1}>
                  {se.exercise.name}
                </Text>
                <TouchableOpacity onPress={() => removeExercise(i)} style={styles.removeBtn}>
                  <Feather name="x" size={16} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.configRow}>
                <View style={styles.configField}>
                  <Text style={[styles.configLabel, { fontFamily: FONTS.mono }]}>SÉRIES</Text>
                  <TextInput
                    style={[styles.configInput, { fontFamily: FONTS.mono }]}
                    value={se.sets}
                    onChangeText={(v) => updateField(i, "sets", v.replace(/[^0-9]/g, ""))}
                    keyboardType="numeric"
                    maxLength={2}
                    selectTextOnFocus
                  />
                </View>
                <View style={styles.configField}>
                  <Text style={[styles.configLabel, { fontFamily: FONTS.mono }]}>REPS</Text>
                  <TextInput
                    style={[styles.configInput, { fontFamily: FONTS.mono }]}
                    value={se.reps}
                    onChangeText={(v) => updateField(i, "reps", v)}
                    keyboardType="default"
                    maxLength={10}
                    selectTextOnFocus
                    placeholder="10"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>
                <View style={styles.configField}>
                  <Text style={[styles.configLabel, { fontFamily: FONTS.mono }]}>CHARGE (kg)</Text>
                  <TextInput
                    style={[styles.configInput, { fontFamily: FONTS.mono }]}
                    value={se.loadKg}
                    onChangeText={(v) => updateField(i, "loadKg", v.replace(/[^0-9.]/g, ""))}
                    keyboardType="decimal-pad"
                    maxLength={6}
                    selectTextOnFocus
                    placeholder="—"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>
                <View style={styles.configField}>
                  <Text style={[styles.configLabel, { fontFamily: FONTS.mono }]}>REPOS (s)</Text>
                  <TextInput
                    style={[styles.configInput, { fontFamily: FONTS.mono }]}
                    value={se.restSeconds}
                    onChangeText={(v) => updateField(i, "restSeconds", v.replace(/[^0-9]/g, ""))}
                    keyboardType="numeric"
                    maxLength={4}
                    selectTextOnFocus
                  />
                </View>
              </View>
            </View>
          ))}

          {selectedExercises.length === 0 && (
            <View style={styles.emptyBox}>
              <Text style={[styles.emptyText, { fontFamily: FONTS.body }]}>
                Tous les exercices ont été retirés.
              </Text>
              <TouchableOpacity onPress={() => setStep(STEP_SELECT)} style={styles.goBackLink}>
                <Text style={[styles.goBackLinkText, { fontFamily: FONTS.bodyBold }]}>
                  Retourner à la sélection
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {selectedExercises.length > 0 && (
          <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
            <GradientButton
              label={submitting ? "DÉMARRAGE…" : "DÉMARRER LA SÉANCE"}
              onPress={handleSubmit}
              loading={submitting}
              icon={<Feather name="play" size={18} color={COLORS.textInverse} />}
            />
          </View>
        )}
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: COLORS.bg }]}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={{
          paddingTop: topPad + 16,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 20,
          gap: 12,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { fontFamily: FONTS.title }]}>CRÉER UNE SÉANCE</Text>
            <Text style={[styles.subtitle, { fontFamily: FONTS.body }]}>
              Sélectionne les exercices de ta séance
            </Text>
          </View>
        </View>

        <View style={styles.searchBar}>
          <Feather name="search" size={16} color={COLORS.textMuted} />
          <TextInput
            style={[styles.searchInput, { fontFamily: FONTS.body }]}
            placeholder="Rechercher un exercice..."
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Feather name="x" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {isLoading && (
          <View style={styles.center}>
            <ActivityIndicator color={COLORS.cyan} />
          </View>
        )}

        {filtered.map((exercise) => {
          const selected = selectedIds.has(exercise.id);
          return (
            <TouchableOpacity
              key={exercise.id}
              onPress={() => toggleExercise(exercise)}
              style={[styles.exCard, selected && styles.exCardSelected]}
              activeOpacity={0.75}
            >
              <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                {selected && <Feather name="check" size={13} color={COLORS.bg} />}
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={[styles.exName, { fontFamily: FONTS.bodyMedium }]}>{exercise.name}</Text>
                <View style={styles.exMeta}>
                  {exercise.category != null && (
                    <View style={styles.categoryBadge}>
                      <Text style={[styles.categoryBadgeText, { fontFamily: FONTS.mono }]}>
                        {CATEGORY_LABELS[exercise.category] ?? exercise.category}
                      </Text>
                    </View>
                  )}
                  {exercise.muscleGroups && exercise.muscleGroups.length > 0 && (
                    <Text style={[styles.muscleText, { fontFamily: FONTS.body }]} numberOfLines={1}>
                      {exercise.muscleGroups.slice(0, 2).join(" · ")}
                    </Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        {!isLoading && filtered.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={[styles.emptyText, { fontFamily: FONTS.body }]}>
              Aucun exercice trouvé.
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        {selectedIds.size > 0 && (
          <View style={styles.selectionBanner}>
            <Feather name="check-circle" size={14} color={COLORS.cyan} />
            <Text style={[styles.selectionText, { fontFamily: FONTS.bodyBold }]}>
              {selectedIds.size} exercice{selectedIds.size !== 1 ? "s" : ""} sélectionné{selectedIds.size !== 1 ? "s" : ""}
            </Text>
          </View>
        )}
        <TouchableOpacity
          onPress={goToConfigure}
          style={[
            styles.nextBtn,
            selectedIds.size === 0 && styles.nextBtnDisabled,
          ]}
          disabled={selectedIds.size === 0}
          activeOpacity={0.8}
        >
          <Text style={[styles.nextBtnText, { fontFamily: FONTS.bodyBold }]}>
            Configurer la séance
          </Text>
          <Feather name="arrow-right" size={18} color={COLORS.textInverse} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 },
  backBtn: { padding: 4 },
  title: { fontSize: 22, color: COLORS.white, letterSpacing: 2 },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.white,
    padding: 0,
  },
  center: { alignItems: "center", paddingVertical: 40 },
  exCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },
  exCardSelected: {
    borderColor: `${COLORS.cyan}60`,
    backgroundColor: `${COLORS.cyan}08`,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  checkboxSelected: {
    backgroundColor: COLORS.cyan,
    borderColor: COLORS.cyan,
  },
  exName: { fontSize: 14, color: COLORS.white },
  exMeta: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  categoryBadge: {
    backgroundColor: COLORS.bgElevated,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryBadgeText: { fontSize: 10, color: COLORS.textMuted, letterSpacing: 0.5 },
  muscleText: { fontSize: 11, color: COLORS.textMuted },
  emptyBox: { paddingVertical: 32, alignItems: "center", gap: 12 },
  emptyText: { fontSize: 14, color: COLORS.textMuted, textAlign: "center" },
  goBackLink: { paddingVertical: 8 },
  goBackLinkText: { fontSize: 14, color: COLORS.cyan },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 8,
  },
  selectionBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
  },
  selectionText: { fontSize: 13, color: COLORS.cyan },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.cyan,
    borderRadius: 14,
    paddingVertical: 15,
  },
  nextBtnDisabled: {
    opacity: 0.35,
  },
  nextBtnText: { fontSize: 15, color: COLORS.textInverse },
  configCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 12,
  },
  configCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  exNumBadge: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  exNumText: { fontSize: 12, color: COLORS.textMuted },
  configExName: { flex: 1, fontSize: 14, color: COLORS.white },
  removeBtn: { padding: 4 },
  configRow: { flexDirection: "row", gap: 8 },
  configField: { flex: 1, gap: 5 },
  configLabel: { fontSize: 9, color: COLORS.textMuted, letterSpacing: 1 },
  configInput: {
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 9,
    color: COLORS.white,
    fontSize: 14,
    textAlign: "center",
  },
});
