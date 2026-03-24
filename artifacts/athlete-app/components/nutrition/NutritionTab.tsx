import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { COLORS, FONTS } from "@/constants/theme";
import { GlowCard } from "@/components/ui/GlowCard";

interface MealLog {
  id: string;
  userId: string;
  date: string;
  mealType: string;
  description: string | null;
  proteinG: number;
  carbsG: number;
  fatG: number;
  kcal: number;
  createdAt: string;
}

interface NutritionGoals {
  proteinG: number;
  carbsG: number;
  fatG: number;
  kcal: number;
}

interface NutritionPdf {
  id: string;
  title: string;
  objectPath: string;
  uploadedAt: string;
}

const MEAL_TYPES = [
  { key: "breakfast", label: "Petit-déjeuner", icon: "☀️" },
  { key: "lunch", label: "Déjeuner", icon: "🥗" },
  { key: "dinner", label: "Dîner", icon: "🍽️" },
  { key: "snack", label: "Collation", icon: "🍎" },
] as const;

type MealType = (typeof MEAL_TYPES)[number]["key"];

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function MacroBar({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  const pct = goal > 0 ? Math.min((value / goal) * 100, 100) : 0;
  const over = goal > 0 && value > goal;
  return (
    <View style={macroStyles.row}>
      <Text style={[macroStyles.label, { fontFamily: FONTS.body }]}>{label}</Text>
      <View style={macroStyles.track}>
        <View style={[macroStyles.fill, { width: `${pct}%`, backgroundColor: over ? COLORS.amber : color }]} />
      </View>
      <Text style={[macroStyles.val, { fontFamily: FONTS.mono, color: over ? COLORS.amber : COLORS.textMuted }]}>
        {value}g / {goal}g
      </Text>
    </View>
  );
}

const macroStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  label: { fontSize: 12, color: COLORS.textSecondary, width: 60 },
  track: { flex: 1, height: 7, backgroundColor: COLORS.bgElevated, borderRadius: 4, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 4 },
  val: { fontSize: 11, width: 80, textAlign: "right" },
});

export function NutritionTab() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(() => toDateStr(new Date()));
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGoalsModal, setShowGoalsModal] = useState(false);

  const [mealType, setMealType] = useState<MealType>("lunch");
  const [description, setDescription] = useState("");
  const [proteinG, setProteinG] = useState("");
  const [carbsG, setCarbsG] = useState("");
  const [fatG, setFatG] = useState("");
  const [kcal, setKcal] = useState("");

  const [goalProtein, setGoalProtein] = useState("");
  const [goalCarbs, setGoalCarbs] = useState("");
  const [goalFat, setGoalFat] = useState("");
  const [goalKcal, setGoalKcal] = useState("");

  const mealsQuery = useQuery<MealLog[]>({
    queryKey: ["/api/nutrition/meals", selectedDate],
    queryFn: () => customFetch(`/api/nutrition/meals?date=${selectedDate}`),
  });

  const goalsQuery = useQuery<NutritionGoals>({
    queryKey: ["/api/nutrition/goals"],
    queryFn: () => customFetch("/api/nutrition/goals"),
  });

  const pdfsQuery = useQuery<NutritionPdf[]>({
    queryKey: ["/api/nutrition/pdfs"],
    queryFn: () => customFetch("/api/nutrition/pdfs"),
  });

  const addMealMutation = useMutation({
    mutationFn: (data: object) => customFetch("/api/nutrition/meals", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nutrition/meals", selectedDate] });
      setShowAddModal(false);
      resetForm();
    },
  });

  const deleteMealMutation = useMutation({
    mutationFn: (id: string) => customFetch(`/api/nutrition/meals/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/nutrition/meals", selectedDate] }),
  });

  const updateGoalsMutation = useMutation({
    mutationFn: (data: object) => customFetch("/api/nutrition/goals", { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nutrition/goals"] });
      setShowGoalsModal(false);
    },
  });

  function resetForm() {
    setDescription("");
    setProteinG("");
    setCarbsG("");
    setFatG("");
    setKcal("");
    setMealType("lunch");
  }

  function shiftDate(delta: number) {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() + delta);
    const next = toDateStr(d);
    const today = toDateStr(new Date());
    if (next <= today) setSelectedDate(next);
  }

  function handleAddMeal() {
    addMealMutation.mutate({
      date: selectedDate,
      mealType,
      description: description.trim() || null,
      proteinG: Number.isNaN(parseInt(proteinG, 10)) ? 0 : parseInt(proteinG, 10),
      carbsG: Number.isNaN(parseInt(carbsG, 10)) ? 0 : parseInt(carbsG, 10),
      fatG: Number.isNaN(parseInt(fatG, 10)) ? 0 : parseInt(fatG, 10),
      kcal: Number.isNaN(parseInt(kcal, 10)) ? 0 : parseInt(kcal, 10),
    });
  }

  function handleSaveGoals() {
    updateGoalsMutation.mutate({
      proteinG: Number.isNaN(parseInt(goalProtein, 10)) ? 150 : parseInt(goalProtein, 10),
      carbsG: Number.isNaN(parseInt(goalCarbs, 10)) ? 250 : parseInt(goalCarbs, 10),
      fatG: Number.isNaN(parseInt(goalFat, 10)) ? 70 : parseInt(goalFat, 10),
      kcal: Number.isNaN(parseInt(goalKcal, 10)) ? 2200 : parseInt(goalKcal, 10),
    });
  }

  function openGoalsModal() {
    const g = goalsQuery.data;
    setGoalProtein(String(g?.proteinG ?? 150));
    setGoalCarbs(String(g?.carbsG ?? 250));
    setGoalFat(String(g?.fatG ?? 70));
    setGoalKcal(String(g?.kcal ?? 2200));
    setShowGoalsModal(true);
  }

  function confirmDelete(id: string) {
    Alert.alert("Supprimer ce repas ?", "Cette action est irréversible.", [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: () => deleteMealMutation.mutate(id) },
    ]);
  }

  const meals = mealsQuery.data ?? [];
  const goals = goalsQuery.data ?? { proteinG: 150, carbsG: 250, fatG: 70, kcal: 2200 };
  const pdfs = pdfsQuery.data ?? [];

  const totalProtein = meals.reduce((a, m) => a + m.proteinG, 0);
  const totalCarbs = meals.reduce((a, m) => a + m.carbsG, 0);
  const totalFat = meals.reduce((a, m) => a + m.fatG, 0);
  const totalKcal = meals.reduce((a, m) => a + m.kcal, 0);

  const isToday = selectedDate === toDateStr(new Date());
  const displayDate = new Date(selectedDate + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <View style={styles.root}>
      <View style={styles.dateRow}>
        <TouchableOpacity onPress={() => shiftDate(-1)} style={styles.dateArrow}>
          <Feather name="chevron-left" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.dateLabel, { fontFamily: FONTS.bodyMedium }]}>
          {isToday ? "Aujourd'hui" : displayDate}
        </Text>
        <TouchableOpacity onPress={() => shiftDate(1)} style={[styles.dateArrow, isToday && styles.dateArrowDisabled]} disabled={isToday}>
          <Feather name="chevron-right" size={20} color={isToday ? COLORS.textMuted : COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      <GlowCard glowColor={COLORS.green} style={styles.totalsCard}>
        <View style={styles.totalsHeader}>
          <View>
            <Text style={[styles.totalsKcal, { fontFamily: FONTS.monoBold, color: COLORS.green }]}>
              {totalKcal} <Text style={[styles.totalsKcalUnit, { fontFamily: FONTS.mono }]}>kcal</Text>
            </Text>
            <Text style={[styles.totalsGoal, { fontFamily: FONTS.body }]}>Objectif : {goals.kcal} kcal</Text>
          </View>
          <TouchableOpacity onPress={openGoalsModal} style={styles.editGoalsBtn}>
            <Feather name="sliders" size={16} color={COLORS.textMuted} />
            <Text style={[styles.editGoalsText, { fontFamily: FONTS.mono }]}>Objectifs</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.macroList}>
          <MacroBar label="Protéines" value={totalProtein} goal={goals.proteinG} color={COLORS.cyan} />
          <MacroBar label="Glucides" value={totalCarbs} goal={goals.carbsG} color={COLORS.amber} />
          <MacroBar label="Lipides" value={totalFat} goal={goals.fatG} color={COLORS.violet} />
        </View>
      </GlowCard>

      <View style={styles.mealsSectionHeader}>
        <Text style={[styles.sectionTitle, { fontFamily: FONTS.mono }]}>REPAS DU JOUR</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addBtn}>
          <Feather name="plus" size={16} color={COLORS.green} />
          <Text style={[styles.addBtnText, { fontFamily: FONTS.mono }]}>Ajouter</Text>
        </TouchableOpacity>
      </View>

      {mealsQuery.isLoading && (
        <ActivityIndicator color={COLORS.green} style={{ marginVertical: 16 }} />
      )}

      {meals.length === 0 && !mealsQuery.isLoading && (
        <Text style={[styles.emptyText, { fontFamily: FONTS.body }]}>Aucun repas enregistré pour cette journée.</Text>
      )}

      {meals.map((meal) => {
        const typeInfo = MEAL_TYPES.find(t => t.key === meal.mealType);
        return (
          <View key={meal.id} style={styles.mealCard}>
            <View style={styles.mealHeader}>
              <Text style={styles.mealEmoji}>{typeInfo?.icon ?? "🍽️"}</Text>
              <View style={styles.mealInfo}>
                <Text style={[styles.mealType, { fontFamily: FONTS.bodyMedium }]}>
                  {typeInfo?.label ?? meal.mealType}
                </Text>
                {meal.description != null && (
                  <Text style={[styles.mealDesc, { fontFamily: FONTS.body }]} numberOfLines={2}>
                    {meal.description}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => confirmDelete(meal.id)} style={styles.deleteBtn}>
                <Feather name="trash-2" size={14} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={styles.mealMacros}>
              {meal.kcal > 0 && <MacroChip label={`${meal.kcal} kcal`} color={COLORS.green} />}
              {meal.proteinG > 0 && <MacroChip label={`${meal.proteinG}g P`} color={COLORS.cyan} />}
              {meal.carbsG > 0 && <MacroChip label={`${meal.carbsG}g G`} color={COLORS.amber} />}
              {meal.fatG > 0 && <MacroChip label={`${meal.fatG}g L`} color={COLORS.violet} />}
            </View>
          </View>
        );
      })}

      {pdfs.length > 0 && (
        <View style={styles.pdfSection}>
          <Text style={[styles.sectionTitle, { fontFamily: FONTS.mono }]}>MES PLANS</Text>
          {pdfs.map((pdf) => (
            <TouchableOpacity
              key={pdf.id}
              style={styles.pdfCard}
              activeOpacity={0.8}
              onPress={() => {
                const baseUrl = Platform.select({ web: "", default: process.env.EXPO_PUBLIC_API_URL ?? "" });
                const url = `${baseUrl}/api/nutrition/pdfs/${pdf.id}/download`;
                Linking.openURL(url);
              }}
            >
              <Feather name="file-text" size={18} color={COLORS.amber} />
              <View style={styles.pdfInfo}>
                <Text style={[styles.pdfTitle, { fontFamily: FONTS.bodyMedium }]}>{pdf.title}</Text>
                <Text style={[styles.pdfDate, { fontFamily: FONTS.mono }]}>
                  {new Date(pdf.uploadedAt).toLocaleDateString("fr-FR")}
                </Text>
              </View>
              <Feather name="external-link" size={14} color={COLORS.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Modal visible={showAddModal} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { fontFamily: FONTS.mono }]}>AJOUTER UN REPAS</Text>
              <TouchableOpacity onPress={() => { setShowAddModal(false); resetForm(); }}>
                <Feather name="x" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.fieldLabel, { fontFamily: FONTS.body }]}>Type de repas</Text>
            <View style={styles.mealTypeRow}>
              {MEAL_TYPES.map(t => (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => setMealType(t.key)}
                  style={[styles.mealTypeBtn, mealType === t.key && styles.mealTypeBtnActive]}
                >
                  <Text style={styles.mealTypeBtnEmoji}>{t.icon}</Text>
                  <Text style={[styles.mealTypeBtnText, { fontFamily: FONTS.body, color: mealType === t.key ? COLORS.green : COLORS.textMuted }]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { fontFamily: FONTS.body }]}>Description (optionnel)</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Poulet, riz, légumes…"
              placeholderTextColor={COLORS.textMuted}
              style={[styles.textInput, { fontFamily: FONTS.body }]}
              multiline
              numberOfLines={2}
            />

            <Text style={[styles.fieldLabel, { fontFamily: FONTS.body }]}>Macros (grammes)</Text>
            <View style={styles.macroInputRow}>
              <MacroInput label="Protéines" value={proteinG} onChange={setProteinG} color={COLORS.cyan} />
              <MacroInput label="Glucides" value={carbsG} onChange={setCarbsG} color={COLORS.amber} />
              <MacroInput label="Lipides" value={fatG} onChange={setFatG} color={COLORS.violet} />
              <MacroInput label="Kcal" value={kcal} onChange={setKcal} color={COLORS.green} isKcal />
            </View>

            <TouchableOpacity
              onPress={handleAddMeal}
              style={[styles.saveBtn, addMealMutation.isPending && styles.saveBtnLoading]}
              disabled={addMealMutation.isPending}
            >
              {addMealMutation.isPending
                ? <ActivityIndicator color={COLORS.bg} />
                : <Text style={[styles.saveBtnText, { fontFamily: FONTS.mono }]}>ENREGISTRER</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showGoalsModal} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { fontFamily: FONTS.mono }]}>OBJECTIFS JOURNALIERS</Text>
              <TouchableOpacity onPress={() => setShowGoalsModal(false)}>
                <Feather name="x" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.macroInputRow}>
              <MacroInput label="Protéines" value={goalProtein} onChange={setGoalProtein} color={COLORS.cyan} />
              <MacroInput label="Glucides" value={goalCarbs} onChange={setGoalCarbs} color={COLORS.amber} />
              <MacroInput label="Lipides" value={goalFat} onChange={setGoalFat} color={COLORS.violet} />
              <MacroInput label="Kcal" value={goalKcal} onChange={setGoalKcal} color={COLORS.green} isKcal />
            </View>
            <TouchableOpacity
              onPress={handleSaveGoals}
              style={[styles.saveBtn, updateGoalsMutation.isPending && styles.saveBtnLoading]}
              disabled={updateGoalsMutation.isPending}
            >
              {updateGoalsMutation.isPending
                ? <ActivityIndicator color={COLORS.bg} />
                : <Text style={[styles.saveBtnText, { fontFamily: FONTS.mono }]}>ENREGISTRER</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function MacroChip({ label, color }: { label: string; color: string }) {
  return (
    <View style={[chipStyles.chip, { borderColor: `${color}40`, backgroundColor: `${color}12` }]}>
      <Text style={[chipStyles.text, { fontFamily: FONTS.mono, color }]}>{label}</Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, marginRight: 4, marginBottom: 4 },
  text: { fontSize: 11 },
});

function MacroInput({ label, value, onChange, color, isKcal }: { label: string; value: string; onChange: (v: string) => void; color: string; isKcal?: boolean }) {
  return (
    <View style={inputStyles.wrap}>
      <Text style={[inputStyles.label, { fontFamily: FONTS.body, color }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
        placeholder="0"
        placeholderTextColor={COLORS.textMuted}
        style={[inputStyles.input, { fontFamily: FONTS.mono, borderColor: `${color}40` }]}
      />
      {!isKcal && <Text style={[inputStyles.unit, { fontFamily: FONTS.mono }]}>g</Text>}
    </View>
  );
}

const inputStyles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center" },
  label: { fontSize: 11, marginBottom: 4 },
  input: { width: "80%", textAlign: "center", backgroundColor: COLORS.bgInput, borderWidth: 1, borderRadius: 8, padding: 8, color: COLORS.white, fontSize: 16 },
  unit: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
});

const styles = StyleSheet.create({
  root: { paddingTop: 8 },
  dateRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 16 },
  dateArrow: { padding: 8 },
  dateArrowDisabled: { opacity: 0.3 },
  dateLabel: { fontSize: 16, color: COLORS.white },
  totalsCard: { marginHorizontal: 20, marginBottom: 16, padding: 16, gap: 10 },
  totalsHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  totalsKcal: { fontSize: 28 },
  totalsKcalUnit: { fontSize: 16, color: COLORS.textSecondary },
  totalsGoal: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  editGoalsBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingTop: 4 },
  editGoalsText: { fontSize: 11, color: COLORS.textMuted },
  macroList: { gap: 4 },
  mealsSectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 10 },
  sectionTitle: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 2 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  addBtnText: { fontSize: 12, color: COLORS.green },
  emptyText: { fontSize: 14, color: COLORS.textMuted, textAlign: "center", paddingVertical: 20 },
  mealCard: { marginHorizontal: 20, marginBottom: 10, backgroundColor: COLORS.bgCard, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 12, gap: 8 },
  mealHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  mealEmoji: { fontSize: 20 },
  mealInfo: { flex: 1, gap: 2 },
  mealType: { fontSize: 14, color: COLORS.white },
  mealDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  deleteBtn: { padding: 4 },
  mealMacros: { flexDirection: "row", flexWrap: "wrap" },
  pdfSection: { paddingHorizontal: 20, marginTop: 8, gap: 8 },
  pdfCard: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.bgCard, borderRadius: 12, borderWidth: 1, borderColor: `${COLORS.amber}30`, padding: 12, gap: 10 },
  pdfInfo: { flex: 1 },
  pdfTitle: { fontSize: 14, color: COLORS.white },
  pdfDate: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" },
  modalBox: { backgroundColor: COLORS.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 14, paddingBottom: 40 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalTitle: { fontSize: 14, color: COLORS.textSecondary, letterSpacing: 2 },
  fieldLabel: { fontSize: 13, color: COLORS.textSecondary },
  mealTypeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  mealTypeBtn: { flex: 1, minWidth: 70, alignItems: "center", paddingVertical: 8, backgroundColor: COLORS.bgElevated, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, gap: 4 },
  mealTypeBtnActive: { borderColor: COLORS.green, backgroundColor: `${COLORS.green}15` },
  mealTypeBtnEmoji: { fontSize: 18 },
  mealTypeBtnText: { fontSize: 11 },
  textInput: { backgroundColor: COLORS.bgInput, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 10, color: COLORS.white, fontSize: 14 },
  macroInputRow: { flexDirection: "row", gap: 8 },
  saveBtn: { backgroundColor: COLORS.green, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  saveBtnLoading: { opacity: 0.6 },
  saveBtnText: { fontSize: 14, color: COLORS.bg },
});
