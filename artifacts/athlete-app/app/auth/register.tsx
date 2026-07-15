import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRegisterAthlete } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { COLORS, FONTS } from "@/constants/theme";
import { getRegisterErrorMessage } from "@/lib/errors";
import { GradientButton } from "@/components/ui/GradientButton";
import { InputField } from "@/components/ui/InputField";
import { useT } from "@/context/PreferencesContext";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const GOALS = [
  { key: "athletic", label: "Développement athlétique" },
  { key: "strength", label: "Force & muscle" },
  { key: "weight_loss", label: "Perte de poids" },
  { key: "health", label: "Énergie & santé" },
  { key: "competition", label: "Prépa compétition" },
];

const LEVELS = [
  { key: "beginner", label: "Je débute" },
  { key: "returning", label: "Je reprends" },
  { key: "active", label: "Je m'entraîne déjà" },
  { key: "confirmed", label: "Athlète confirmé·e" },
];

const FREQUENCIES = [
  { value: 2, label: "1-2×/sem" },
  { value: 4, label: "3-4×/sem" },
  { value: 6, label: "5+/sem" },
];

const SOURCES = [
  { key: "instagram", label: "Instagram" },
  { key: "word_of_mouth", label: "Bouche-à-oreille" },
  { key: "google", label: "Google" },
  { key: "walk_in", label: "Devant le studio" },
  { key: "other", label: "Autre" },
];

const CONSENT_TEXT =
  "J'accepte les CGU et la politique de confidentialité : mes données (identité, contact, santé déclarée, check-ins) sont utilisées par Mouv'Up pour la gestion de mon compte et de mon coaching. Je peux les consulter ou les supprimer à tout moment.";

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, { fontFamily: FONTS.bodySemiBold }, active && styles.chipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function YesNo({
  value,
  onChange,
  yesLabel,
  noLabel,
}: {
  value: boolean | null;
  onChange: (v: boolean) => void;
  yesLabel: string;
  noLabel: string;
}) {
  return (
    <View style={styles.yesNoRow}>
      <TouchableOpacity
        onPress={() => onChange(true)}
        style={[styles.yesNoBtn, value === true && styles.chipActive]}
      >
        <Text style={[styles.chipText, { fontFamily: FONTS.bodySemiBold }, value === true && styles.chipTextActive]}>
          {yesLabel}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => onChange(false)}
        style={[styles.yesNoBtn, value === false && styles.chipActive]}
      >
        <Text style={[styles.chipText, { fontFamily: FONTS.bodySemiBold }, value === false && styles.chipTextActive]}>
          {noLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const registerMutation = useRegisterAthlete();
  const t = useT();

  const [step, setStep] = useState<1 | 2>(1);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loginCode, setLoginCode] = useState("");
  const [loginCodeConfirm, setLoginCodeConfirm] = useState("");

  const [primaryGoal, setPrimaryGoal] = useState<string | null>(null);
  const [fitnessLevel, setFitnessLevel] = useState<string | null>(null);
  const [trainingFrequency, setTrainingFrequency] = useState<number | null>(null);
  const [hasInjuryHistory, setHasInjuryHistory] = useState<boolean | null>(null);
  const [injuries, setInjuries] = useState("");
  const [medicalContraindication, setMedicalContraindication] = useState<boolean | null>(null);
  const [acquisitionSource, setAcquisitionSource] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);

  const [error, setError] = useState("");
  const [emailInUse, setEmailInUse] = useState(false);

  const step1Valid =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    EMAIL_RE.test(email.trim()) &&
    phone.trim().length > 0 &&
    /^\d{6}$/.test(loginCode) &&
    loginCode === loginCodeConfirm;

  const step2Valid =
    !!primaryGoal &&
    !!fitnessLevel &&
    trainingFrequency !== null &&
    hasInjuryHistory !== null &&
    medicalContraindication !== null &&
    consent &&
    (hasInjuryHistory === false || injuries.trim().length > 0);

  const handleNext = () => {
    setError("");
    if (!step1Valid) {
      if (!/^\d{6}$/.test(loginCode)) {
        setError(t("code_must_be_6_digits", "Ton code doit contenir exactement 6 chiffres"));
      } else if (loginCode !== loginCodeConfirm) {
        setError(t("codes_dont_match", "Les deux codes ne correspondent pas"));
      } else {
        setError(t("all_fields_required", "Tous les champs sont requis"));
      }
      return;
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    setError("");
    setEmailInUse(false);
    if (!step2Valid) {
      setError(t("all_fields_required", "Tous les champs sont requis"));
      return;
    }
    try {
      const res = await registerMutation.mutateAsync({
        data: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          loginCode,
          primaryGoal: primaryGoal!,
          fitnessLevel: fitnessLevel!,
          trainingFrequency: trainingFrequency!,
          hasInjuryHistory: hasInjuryHistory!,
          injuries: hasInjuryHistory ? injuries.trim() : undefined,
          medicalContraindication: medicalContraindication!,
          acquisitionSource: acquisitionSource ?? undefined,
          consent: true,
        },
      });
      await login(res.accessToken, res.refreshToken, res.user);
      router.replace("/onboarding/tutorial");
    } catch (err: unknown) {
      setError(getRegisterErrorMessage(err));
      const status = (err as { status?: number } | null)?.status;
      const code = (err as { data?: { error?: { code?: string } } } | null)?.data?.error?.code;
      if (status === 409 || code === "EMAIL_IN_USE") {
        setEmailInUse(true);
        setStep(1);
      }
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.flex, { backgroundColor: COLORS.bg }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          onPress={() => (step === 2 ? setStep(1) : router.back())}
          style={[styles.backBtn, { top: insets.top + 16 }]}
        >
          <Feather name="arrow-left" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={[styles.step, { fontFamily: FONTS.mono }]}>
            {step === 1
              ? t("register_step1", "ÉTAPE 1/2 · TES INFOS")
              : t("register_step2", "ÉTAPE 2/2 · TON PROFIL SPORTIF")}
          </Text>
          <Text style={[styles.title, { fontFamily: FONTS.title }]}>{t("create_account_title", "CRÉER UN COMPTE")}</Text>
        </View>

        {step === 1 ? (
          <View style={styles.form}>
            <InputField
              label={t("first_name", "Prénom")}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Alex"
              autoCapitalize="words"
            />
            <InputField
              label={t("last_name", "Nom")}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Dupont"
              autoCapitalize="words"
            />
            <InputField
              label={t("email", "Email")}
              value={email}
              onChangeText={setEmail}
              placeholder="ton@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <InputField
              label={t("phone", "Téléphone")}
              value={phone}
              onChangeText={setPhone}
              placeholder="04XX XX XX XX"
              keyboardType="phone-pad"
            />
            <InputField
              label={t("login_code", "Ton code à 6 chiffres")}
              value={loginCode}
              onChangeText={(v) => setLoginCode(v.replace(/\D/g, "").slice(0, 6))}
              placeholder="••••••"
              keyboardType="number-pad"
              maxLength={6}
              secureToggle
            />
            <InputField
              label={t("login_code_confirm", "Confirme ton code")}
              value={loginCodeConfirm}
              onChangeText={(v) => setLoginCodeConfirm(v.replace(/\D/g, "").slice(0, 6))}
              placeholder="••••••"
              keyboardType="number-pad"
              maxLength={6}
              secureToggle
            />

            {error ? (
              <View style={styles.errorWrap}>
                <Text style={[styles.errorText, { fontFamily: FONTS.body }]}>{error}</Text>
                {emailInUse ? (
                  <Pressable
                    onPress={() => router.push({ pathname: "/auth/forgot-password", params: { email: email.trim().toLowerCase() } })}
                    style={styles.errorCta}
                  >
                    <Text style={[styles.errorCtaText, { fontFamily: FONTS.bodySemiBold }]}>
                      {t("forgot_code", "Code oublié ?")}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            <GradientButton label={t("onboarding_continue", "Continuer")} onPress={handleNext} />
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={[styles.sectionLabel, { fontFamily: FONTS.bodySemiBold }]}>
              {t("main_goal", "OBJECTIF PRINCIPAL")}
            </Text>
            <View style={styles.chipWrap}>
              {GOALS.map((g) => (
                <Chip key={g.key} label={g.label} active={primaryGoal === g.key} onPress={() => setPrimaryGoal(g.key)} />
              ))}
            </View>

            <Text style={[styles.sectionLabel, { fontFamily: FONTS.bodySemiBold }]}>
              {t("current_level", "OÙ TU EN ES")}
            </Text>
            <View style={styles.chipWrap}>
              {LEVELS.map((l) => (
                <Chip key={l.key} label={l.label} active={fitnessLevel === l.key} onPress={() => setFitnessLevel(l.key)} />
              ))}
            </View>

            <Text style={[styles.sectionLabel, { fontFamily: FONTS.bodySemiBold }]}>
              {t("target_frequency", "FRÉQUENCE VISÉE")}
            </Text>
            <View style={styles.chipWrap}>
              {FREQUENCIES.map((f) => (
                <Chip
                  key={f.value}
                  label={f.label}
                  active={trainingFrequency === f.value}
                  onPress={() => setTrainingFrequency(f.value)}
                />
              ))}
            </View>

            <Text style={[styles.sectionLabel, { fontFamily: FONTS.bodySemiBold }]}>
              {t("injury_history_q", "BLESSURES OU ANTÉCÉDENTS ?")}
            </Text>
            <YesNo
              value={hasInjuryHistory}
              onChange={setHasInjuryHistory}
              yesLabel={t("yes", "Oui")}
              noLabel={t("no", "Non")}
            />
            {hasInjuryHistory ? (
              <InputField
                value={injuries}
                onChangeText={setInjuries}
                placeholder={t(
                  "injury_history_placeholder",
                  "Ex : opération du genou en 2023, lombalgies quand je reste assis longtemps…"
                )}
                multiline
                style={styles.multiline}
              />
            ) : null}

            <Text style={[styles.sectionLabel, { fontFamily: FONTS.bodySemiBold }]}>
              {t("parq_q", "APTITUDE À L'EFFORT")}
            </Text>
            <Text style={[styles.parqQuestion, { fontFamily: FONTS.body }]}>
              {t("parq_question_text", "Un médecin t'a-t-il déjà déconseillé une activité physique intense ?")}
            </Text>
            <YesNo
              value={medicalContraindication}
              onChange={setMedicalContraindication}
              yesLabel={t("yes", "Oui")}
              noLabel={t("no", "Non")}
            />
            {medicalContraindication ? (
              <Text style={[styles.parqNote, { fontFamily: FONTS.body }]}>
                {t(
                  "parq_reassurance",
                  "Pas de souci — ton coach en discutera avec toi avant ta première séance pour adapter ton entraînement en toute sécurité."
                )}
              </Text>
            ) : null}

            <Text style={[styles.sectionLabel, { fontFamily: FONTS.bodySemiBold }]}>
              {t("acquisition_source", "COMMENT TU NOUS AS CONNU")}
            </Text>
            <View style={styles.chipWrap}>
              {SOURCES.map((s) => (
                <Chip key={s.key} label={s.label} active={acquisitionSource === s.key} onPress={() => setAcquisitionSource(s.key)} />
              ))}
            </View>

            <TouchableOpacity
              onPress={() => setConsent((v) => !v)}
              style={styles.consentRow}
            >
              <View style={[styles.checkbox, consent && styles.checkboxActive]}>
                {consent ? <Feather name="check" size={14} color={COLORS.bg} /> : null}
              </View>
              <Text style={[styles.consentText, { fontFamily: FONTS.body }]}>
                {t("consent_text", CONSENT_TEXT)}
              </Text>
            </TouchableOpacity>

            {error ? (
              <View style={styles.errorWrap}>
                <Text style={[styles.errorText, { fontFamily: FONTS.body }]}>{error}</Text>
              </View>
            ) : null}

            <GradientButton
              label={t("create_my_account", "Créer mon compte")}
              onPress={handleSubmit}
              loading={registerMutation.isPending}
              disabled={!step2Valid}
            />
          </View>
        )}

        {step === 1 ? (
          <Pressable onPress={() => router.push("/auth/login")} style={styles.loginLink}>
            <Text style={[styles.loginText, { fontFamily: FONTS.body }]}>
              {t("already_have_account", "Déjà un compte ?")}{" "}
              <Text style={{ color: COLORS.cyan, fontFamily: FONTS.bodySemiBold }}>
                {t("sign_in_link", "Se connecter")}
              </Text>
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: 28 },
  backBtn: { position: "absolute", left: 20, zIndex: 10, padding: 8 },
  header: { marginTop: 64, marginBottom: 24 },
  step: { fontSize: 13, color: COLORS.cyan, letterSpacing: 2, marginBottom: 8 },
  title: { fontSize: 36, color: COLORS.white, letterSpacing: 2 },
  form: { gap: 16, marginBottom: 24 },
  sectionLabel: { fontSize: 12, color: COLORS.textSecondary, letterSpacing: 1, marginTop: 4 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
  },
  chipActive: { borderColor: COLORS.cyan, backgroundColor: COLORS.cyanDim },
  chipText: { fontSize: 13, color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.cyan },
  yesNoRow: { flexDirection: "row", gap: 8 },
  yesNoBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
  },
  multiline: { minHeight: 80, paddingTop: 12, textAlignVertical: "top" },
  parqQuestion: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20, marginTop: -6 },
  parqNote: { fontSize: 13, color: COLORS.cyan, lineHeight: 19, marginTop: -6 },
  consentRow: { flexDirection: "row", gap: 12, alignItems: "flex-start", marginTop: 8 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkboxActive: { backgroundColor: COLORS.cyan, borderColor: COLORS.cyan },
  consentText: { flex: 1, fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  errorWrap: {
    backgroundColor: COLORS.redDim,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: `${COLORS.red}40`,
  },
  errorText: { color: COLORS.red, fontSize: 13, textAlign: "center" },
  errorCta: { marginTop: 10, alignItems: "center", paddingVertical: 4 },
  errorCtaText: { color: COLORS.cyan, fontSize: 14 },
  loginLink: { alignItems: "center" },
  loginText: { fontSize: 15, color: COLORS.textSecondary },
});
