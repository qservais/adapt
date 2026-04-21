import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Image,
  Dimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { COLORS, FONTS } from "@/constants/theme";
import { GlowCard } from "@/components/ui/GlowCard";
import {
  useGetBodyMetrics,
  useAddBodyMetric,
  useDeleteBodyMetric,
  customFetch,
} from "@workspace/api-client-react";
import type { BodyMetric } from "@workspace/api-client-react";
import { useFormatWeight } from "@/context/PreferencesContext";
import { useQueryClient } from "@tanstack/react-query";
import { resolveMediaUrl } from "@/lib/custom-fetch";

const { width } = Dimensions.get("window");
const CHART_WIDTH = width - 80;
const CHART_HEIGHT = 90;

function WeightChart({ metrics }: { metrics: BodyMetric[] }) {
  const sorted = [...metrics]
    .filter((m) => m.weightKg != null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-20);
  if (sorted.length < 2) return null;

  const values = sorted.map((m) => parseFloat(m.weightKg!));
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = maxV - minV || 1;
  const stepX = CHART_WIDTH / (values.length - 1);
  const points = values.map((v, i) => ({
    x: i * stepX,
    y: CHART_HEIGHT - ((v - minV) / range) * (CHART_HEIGHT - 16) - 8,
  }));

  return (
    <View style={{ marginTop: 12 }}>
      <View
        style={{
          height: CHART_HEIGHT,
          backgroundColor: COLORS.bgElevated,
          borderRadius: 8,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {[0, 50, 100].map((pct) => (
          <View
            key={pct}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: CHART_HEIGHT * (1 - pct / 100) - 0.5,
              height: 1,
              backgroundColor: COLORS.border,
              opacity: 0.5,
            }}
          />
        ))}
        {points.map((p, i) => {
          if (i === 0) return null;
          const prev = points[i - 1]!;
          const dx = p.x - prev.x;
          const dy = p.y - prev.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const cx = (prev.x + p.x) / 2;
          const cy = (prev.y + p.y) / 2;
          const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
          return (
            <View
              key={i}
              style={{
                position: "absolute",
                left: cx - len / 2,
                top: cy - 1.5,
                width: len,
                height: 3,
                backgroundColor: COLORS.violet,
                transform: [{ rotate: `${angle}deg` }],
                borderRadius: 2,
              }}
            />
          );
        })}
        {points.map((p, i) => (
          <View
            key={i}
            style={{
              position: "absolute",
              left: p.x - 4,
              top: p.y - 4,
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: COLORS.violet,
              borderWidth: 2,
              borderColor: COLORS.bg,
            }}
          />
        ))}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
        <Text style={{ fontFamily: FONTS.mono, fontSize: 10, color: COLORS.textMuted }}>
          {sorted[0]!.date.slice(5)}
        </Text>
        <Text style={{ fontFamily: FONTS.mono, fontSize: 10, color: COLORS.textMuted }}>
          {sorted[sorted.length - 1]!.date.slice(5)}
        </Text>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 2 }}>
        <Text style={{ fontFamily: FONTS.monoBold, fontSize: 12, color: COLORS.violet }}>
          {values[0]?.toFixed(1)} kg
        </Text>
        <Text style={{ fontFamily: FONTS.monoBold, fontSize: 12, color: COLORS.violet }}>
          {values[values.length - 1]?.toFixed(1)} kg
        </Text>
      </View>
    </View>
  );
}

function MeasurementRow({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string | null;
  unit: string;
  color: string;
}) {
  if (!value) return null;
  return (
    <View style={s.measRow}>
      <Text style={[s.measLabel, { fontFamily: FONTS.body }]}>{label}</Text>
      <Text style={[s.measValue, { fontFamily: FONTS.monoBold, color }]}>
        {parseFloat(value).toFixed(1)} {unit}
      </Text>
    </View>
  );
}

function PhotoUploader({ metric, onDone }: { metric: BodyMetric; onDone: () => void }) {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);

  async function pickAndUpload() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission refusée", "L'accès à la galerie est nécessaire pour ajouter une photo.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [3, 4],
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const uri = asset.uri;
    const name = uri.split("/").pop() ?? "photo.jpg";
    const type = asset.mimeType ?? "image/jpeg";

    const formData = new FormData();
    formData.append("photo", { uri, name, type } as unknown as Blob);

    setUploading(true);
    try {
      await customFetch(`/api/stats/body-metrics/${metric.id}/photo`, {
        method: "POST",
        headers: {},
        body: formData as unknown as string,
      });
      qc.invalidateQueries({ queryKey: ["/api/stats/body-metrics"] });
      onDone();
    } catch {
      Alert.alert("Erreur", "Impossible d'envoyer la photo.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <TouchableOpacity onPress={pickAndUpload} disabled={uploading} style={s.photoUploadBtn}>
      {uploading ? (
        <ActivityIndicator size="small" color={COLORS.violet} />
      ) : (
        <>
          <Feather name="camera" size={14} color={COLORS.violet} />
          <Text style={[s.photoUploadText, { fontFamily: FONTS.mono }]}>
            {metric.photoUrl ? "CHANGER LA PHOTO" : "AJOUTER UNE PHOTO"}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

function PhotoStrip({ metrics }: { metrics: BodyMetric[] }) {
  const withPhotos = metrics
    .filter((m) => m.photoUrl != null)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (withPhotos.length === 0) return null;

  return (
    <GlowCard glowColor={COLORS.violet} style={s.photoStripCard}>
      <Text style={[s.cardTitle, { fontFamily: FONTS.mono }]}>PROGRESSION PHOTOS</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
        <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 4, paddingTop: 8 }}>
          {withPhotos.map((m) => (
            <View key={m.id} style={s.photoThumb}>
              <Image
                source={{ uri: resolveMediaUrl(`/api/stats/body-metrics/${m.id}/photo`) }}
                style={s.photoThumbImg}
                resizeMode="cover"
              />
              <Text style={[s.photoThumbDate, { fontFamily: FONTS.mono }]}>{m.date.slice(5)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
      {withPhotos.length >= 2 && (
        <Text style={[s.photoCompareHint, { fontFamily: FONTS.body }]}>
          {withPhotos.length} photos · de {withPhotos[0]!.date.slice(5)} à {withPhotos[withPhotos.length - 1]!.date.slice(5)}
        </Text>
      )}
    </GlowCard>
  );
}

type FormFields = {
  weightKg: string;
  waistCm: string;
  hipsCm: string;
  chestCm: string;
  armCm: string;
  notes: string;
};

function AddMetricForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const today = new Date().toISOString().split("T")[0]!;
  const [form, setForm] = useState<FormFields>({
    weightKg: "",
    waistCm: "",
    hipsCm: "",
    chestCm: "",
    armCm: "",
    notes: "",
  });
  const addMutation = useAddBodyMetric();

  const f = (field: keyof FormFields) => (val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }));

  async function submit() {
    const num = (v: string) => {
      const n = parseFloat(v.replace(",", "."));
      return isNaN(n) ? null : n;
    };
    const payload = {
      date: today,
      weightKg: num(form.weightKg),
      waistCm: num(form.waistCm),
      hipsCm: num(form.hipsCm),
      chestCm: num(form.chestCm),
      armCm: num(form.armCm),
      notes: form.notes.trim() || null,
    };
    if (
      !payload.weightKg &&
      !payload.waistCm &&
      !payload.hipsCm &&
      !payload.chestCm &&
      !payload.armCm
    ) {
      Alert.alert("Données manquantes", "Entrez au moins une valeur.");
      return;
    }
    try {
      await addMutation.mutateAsync(payload);
      onSuccess();
    } catch {
      Alert.alert("Erreur", "Impossible d'enregistrer les données.");
    }
  }

  return (
    <GlowCard glowColor={COLORS.violet} style={s.formCard}>
      <Text style={[s.formTitle, { fontFamily: FONTS.mono }]}>AJOUTER UNE MESURE</Text>
      <Text style={[s.formDate, { fontFamily: FONTS.mono }]}>{today}</Text>
      {(
        [
          ["weightKg", "Poids (kg)", "0.0"],
          ["waistCm", "Tour de taille (cm)", "0.0"],
          ["hipsCm", "Tour de hanches (cm)", "0.0"],
          ["chestCm", "Tour de poitrine (cm)", "0.0"],
          ["armCm", "Tour de bras (cm)", "0.0"],
        ] as [keyof FormFields, string, string][]
      ).map(([field, label, placeholder]) => (
        <View key={field} style={s.inputRow}>
          <Text style={[s.inputLabel, { fontFamily: FONTS.body }]}>{label}</Text>
          <TextInput
            style={[s.input, { fontFamily: FONTS.mono, color: COLORS.white }]}
            value={form[field]}
            onChangeText={f(field)}
            keyboardType="decimal-pad"
            placeholder={placeholder}
            placeholderTextColor={COLORS.textMuted}
          />
        </View>
      ))}
      <View style={s.inputRow}>
        <Text style={[s.inputLabel, { fontFamily: FONTS.body }]}>Notes</Text>
        <TextInput
          style={[s.input, s.inputMulti, { fontFamily: FONTS.body, color: COLORS.white }]}
          value={form.notes}
          onChangeText={f("notes")}
          placeholder="Optionnel..."
          placeholderTextColor={COLORS.textMuted}
          multiline
          numberOfLines={2}
        />
      </View>
      <View style={s.formBtns}>
        <TouchableOpacity onPress={onCancel} style={s.cancelBtn}>
          <Text style={[s.cancelText, { fontFamily: FONTS.mono }]}>Annuler</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={submit}
          disabled={addMutation.isPending}
          style={s.saveBtn}
        >
          {addMutation.isPending ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={[s.saveText, { fontFamily: FONTS.mono }]}>Enregistrer</Text>
          )}
        </TouchableOpacity>
      </View>
    </GlowCard>
  );
}

export function BodyTab() {
  const { data, isLoading } = useGetBodyMetrics(30);
  const deleteMutation = useDeleteBodyMetric();
  const [showForm, setShowForm] = useState(false);
  const formatWeight = useFormatWeight();

  const metrics = data?.metrics ?? [];
  const latest = metrics[0] ?? null;

  const weightHistory = metrics.filter((m) => m.weightKg != null);
  const firstWeight = weightHistory[weightHistory.length - 1];
  const latestWeight = weightHistory[0];
  const weightDelta =
    firstWeight && latestWeight && firstWeight !== latestWeight
      ? parseFloat(latestWeight.weightKg!) - parseFloat(firstWeight.weightKg!)
      : null;

  function handleDelete(id: string) {
    Alert.alert("Supprimer", "Supprimer cette entrée ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: () => deleteMutation.mutate(id),
      },
    ]);
  }

  if (isLoading) {
    return (
      <View style={{ alignItems: "center", paddingTop: 40 }}>
        <ActivityIndicator size="large" color={COLORS.violet} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      {showForm ? (
        <AddMetricForm onSuccess={() => setShowForm(false)} onCancel={() => setShowForm(false)} />
      ) : (
        <TouchableOpacity onPress={() => setShowForm(true)} style={s.addBtn}>
          <Feather name="plus" size={14} color={COLORS.violet} />
          <Text style={[s.addBtnText, { fontFamily: FONTS.mono }]}>AJOUTER UNE MESURE</Text>
        </TouchableOpacity>
      )}

      {!showForm && weightHistory.length > 0 && (
        <GlowCard glowColor={COLORS.violet} style={s.weightCard}>
          <View style={s.weightHeader}>
            <Feather name="trending-up" size={14} color={COLORS.violet} />
            <Text style={[s.cardTitle, { fontFamily: FONTS.mono, color: COLORS.violet }]}>
              ÉVOLUTION DU POIDS
            </Text>
            {weightDelta != null && (
              <Text
                style={[
                  s.weightDelta,
                  {
                    fontFamily: FONTS.mono,
                    color: weightDelta <= 0 ? COLORS.green : COLORS.amber,
                  },
                ]}
              >
                {weightDelta >= 0 ? "+" : ""}
                {weightDelta.toFixed(1)} kg
              </Text>
            )}
          </View>
          {latestWeight && (
            <Text style={[s.weightCurrent, { fontFamily: FONTS.monoBold, color: COLORS.violet }]}>
              {formatWeight(parseFloat(latestWeight.weightKg!))}
            </Text>
          )}
          <WeightChart metrics={metrics} />
        </GlowCard>
      )}

      {!showForm && metrics.filter((m) => m.photoUrl).length > 0 && (
        <PhotoStrip metrics={metrics} />
      )}

      {!showForm && latest && (latest.waistCm || latest.hipsCm || latest.chestCm || latest.armCm) && (
        <GlowCard glowColor={COLORS.cyan} style={s.measCard}>
          <Text style={[s.cardTitle, { fontFamily: FONTS.mono }]}>DERNIÈRES MENSURATIONS</Text>
          <Text style={[s.measDate, { fontFamily: FONTS.mono }]}>{latest.date}</Text>
          <MeasurementRow label="Tour de taille" value={latest.waistCm} unit="cm" color={COLORS.cyan} />
          <MeasurementRow label="Tour de hanches" value={latest.hipsCm} unit="cm" color={COLORS.cyan} />
          <MeasurementRow label="Tour de poitrine" value={latest.chestCm} unit="cm" color={COLORS.cyan} />
          <MeasurementRow label="Tour de bras" value={latest.armCm} unit="cm" color={COLORS.cyan} />
        </GlowCard>
      )}

      {!showForm && metrics.length > 0 && (
        <GlowCard glowColor={COLORS.border} style={s.historyCard}>
          <Text style={[s.cardTitle, { fontFamily: FONTS.mono }]}>HISTORIQUE</Text>
          {metrics.map((m, i) => (
            <View
              key={m.id}
              style={[s.historyRow, i === 0 && { borderTopWidth: 0, paddingTop: 0 }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[s.historyDate, { fontFamily: FONTS.mono }]}>{m.date}</Text>
                <View style={s.historyMeas}>
                  {m.weightKg && (
                    <Text style={[s.historyVal, { fontFamily: FONTS.body }]}>
                      {formatWeight(parseFloat(m.weightKg))}
                    </Text>
                  )}
                  {m.waistCm && (
                    <Text style={[s.historyVal, { fontFamily: FONTS.body }]}>
                      Taille {parseFloat(m.waistCm).toFixed(0)}cm
                    </Text>
                  )}
                  {m.hipsCm && (
                    <Text style={[s.historyVal, { fontFamily: FONTS.body }]}>
                      Hanches {parseFloat(m.hipsCm).toFixed(0)}cm
                    </Text>
                  )}
                  {m.notes && (
                    <Text
                      style={[s.historyNote, { fontFamily: FONTS.body }]}
                      numberOfLines={1}
                    >
                      {m.notes}
                    </Text>
                  )}
                </View>
                {m.photoUrl && (
                  <Image
                    source={{ uri: resolveMediaUrl(`/api/stats/body-metrics/${m.id}/photo`) }}
                    style={s.historyPhotoThumb}
                    resizeMode="cover"
                  />
                )}
              </View>
              <View style={s.historyActions}>
                <PhotoUploader metric={m} onDone={() => {}} />
                <TouchableOpacity
                  onPress={() => handleDelete(m.id)}
                  style={s.deleteBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather name="trash-2" size={14} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </GlowCard>
      )}

      {!showForm && metrics.length === 0 && (
        <View style={s.emptyWrap}>
          <Feather name="user" size={36} color={COLORS.textMuted} />
          <Text style={[s.emptyText, { fontFamily: FONTS.body }]}>
            Aucune mesure enregistrée.{"\n"}Commence à suivre ton évolution corporelle !
          </Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { paddingHorizontal: 20, gap: 16 },
  cardTitle: { fontSize: 10, color: COLORS.textMuted, letterSpacing: 2 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 14,
    backgroundColor: "#7C3AED15",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#7C3AED40",
  },
  addBtnText: { fontSize: 11, color: COLORS.violet, letterSpacing: 1.5 },
  weightCard: { gap: 8 },
  weightHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  weightDelta: { fontSize: 12, marginLeft: "auto" },
  weightCurrent: { fontSize: 28 },
  measCard: { gap: 10 },
  measDate: { fontSize: 11, color: COLORS.textMuted, marginBottom: 4 },
  measRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  measLabel: { fontSize: 13, color: COLORS.textSecondary },
  measValue: { fontSize: 15 },
  historyCard: { gap: 0 },
  historyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 8,
  },
  historyDate: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4, letterSpacing: 0.5 },
  historyMeas: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  historyVal: { fontSize: 13, color: COLORS.white },
  historyNote: { fontSize: 12, color: COLORS.textMuted, fontStyle: "italic" },
  historyPhotoThumb: {
    width: 60,
    height: 80,
    borderRadius: 6,
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  historyActions: { flexDirection: "column", alignItems: "flex-end", gap: 8 },
  deleteBtn: { padding: 4 },
  emptyWrap: { alignItems: "center", paddingVertical: 40, gap: 12 },
  emptyText: { fontSize: 14, color: COLORS.textMuted, textAlign: "center", lineHeight: 20 },
  formCard: { gap: 12 },
  formTitle: { fontSize: 10, color: COLORS.violet, letterSpacing: 2 },
  formDate: { fontSize: 12, color: COLORS.textMuted },
  inputRow: { gap: 4 },
  inputLabel: { fontSize: 12, color: COLORS.textSecondary },
  input: {
    backgroundColor: COLORS.bgElevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  inputMulti: { minHeight: 60, textAlignVertical: "top" },
  formBtns: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelText: { fontSize: 12, color: COLORS.textMuted },
  saveBtn: {
    flex: 2,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "#7C3AED30",
    borderWidth: 1,
    borderColor: COLORS.violet,
  },
  saveText: { fontSize: 12, color: COLORS.violet },
  photoUploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#7C3AED15",
    borderWidth: 1,
    borderColor: "#7C3AED40",
  },
  photoUploadText: { fontSize: 9, color: COLORS.violet, letterSpacing: 1 },
  photoStripCard: { gap: 10 },
  photoThumb: { alignItems: "center", gap: 6 },
  photoThumbImg: {
    width: 80,
    height: 107,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  photoThumbDate: { fontSize: 9, color: COLORS.textMuted },
  photoCompareHint: { fontSize: 11, color: COLORS.textMuted, textAlign: "center" },
});
