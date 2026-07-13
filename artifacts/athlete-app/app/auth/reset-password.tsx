import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { COLORS, FONTS } from "@/constants/theme";
import { InputField } from "@/components/ui/InputField";
import { GradientButton } from "@/components/ui/GradientButton";
import { customFetch } from "@/lib/custom-fetch";
import { useT } from "@/context/PreferencesContext";

export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const t = useT();
  const { token } = useLocalSearchParams<{ token: string }>();

  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  if (!token) {
    return (
      <View style={[styles.center, { backgroundColor: COLORS.bg, paddingTop: insets.top + 40 }]}>
        <Feather name="x-circle" size={48} color={COLORS.red} />
        <Text style={[styles.errorTitle, { fontFamily: FONTS.bodySemiBold }]}>{t("invalid_link", "Lien invalide")}</Text>
        <Text style={[styles.errorSubtitle, { fontFamily: FONTS.body }]}>
          {t("invalid_link_subtitle", "Ce lien de réinitialisation est invalide ou a expiré.")}
        </Text>
        <GradientButton
          label={t("request_new_link", "Demander un nouveau lien")}
          onPress={() => router.replace("/auth/forgot-password")}
        />
      </View>
    );
  }

  const handleSubmit = async () => {
    if (!newPassword || newPassword.length < 8) {
      setErrorMsg(t("pwd_min_8", "Le mot de passe doit contenir au moins 8 caractères"));
      setStatus("error");
      return;
    }
    if (newPassword !== confirm) {
      setErrorMsg(t("passwords_dont_match", "Les mots de passe ne correspondent pas"));
      setStatus("error");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    try {
      await customFetch("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, newPassword }),
      });
      setStatus("success");
      setTimeout(() => router.replace("/auth/login"), 2500);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("error_generic", "Une erreur est survenue. Réessaie.");
      setErrorMsg(message || t("invalid_or_expired", "Lien invalide ou expiré."));
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <View style={[styles.center, { backgroundColor: COLORS.bg, paddingTop: insets.top + 40 }]}>
        <Feather name="check-circle" size={48} color={COLORS.green} />
        <Text style={[styles.successTitle, { fontFamily: FONTS.bodySemiBold }]}>
          {t("pwd_updated", "Mot de passe mis à jour !")}
        </Text>
        <Text style={[styles.successSubtitle, { fontFamily: FONTS.body }]}>
          {t("redirecting_login", "Redirection vers la connexion…")}
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.flex, { backgroundColor: COLORS.bg }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { fontFamily: FONTS.title }]}>{t("new_pwd_title", "NOUVEAU")}</Text>
          <Text style={[styles.titleSub, { fontFamily: FONTS.title, color: COLORS.cyan }]}>
            {t("new_pwd_title_sub", "MOT DE PASSE")}
          </Text>
        </View>

        <View style={styles.form}>
          <InputField
            label={t("new_password", "Nouveau mot de passe")}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="••••••••"
            secureToggle
            autoComplete="new-password"
          />
          <InputField
            label={t("confirm_password_label", "Confirmer le mot de passe")}
            value={confirm}
            onChangeText={setConfirm}
            placeholder="••••••••"
            secureToggle
            autoComplete="new-password"
          />
          {status === "error" && errorMsg ? (
            <View style={styles.errorWrap}>
              <Text style={[styles.errorText, { fontFamily: FONTS.body }]}>{errorMsg}</Text>
            </View>
          ) : null}
          <GradientButton
            label={t("change_my_password", "CHANGER MON MOT DE PASSE")}
            onPress={handleSubmit}
            loading={status === "loading"}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    paddingHorizontal: 28,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 16,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 52,
    color: COLORS.textPrimary,
    letterSpacing: 6,
    lineHeight: 56,
  },
  titleSub: {
    fontSize: 38,
    letterSpacing: 4,
    lineHeight: 44,
  },
  form: { gap: 16 },
  errorWrap: {
    backgroundColor: COLORS.redDim,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: `${COLORS.red}40`,
  },
  errorText: {
    color: COLORS.red,
    fontSize: 13,
    textAlign: "center",
  },
  errorTitle: {
    fontSize: 22,
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  errorSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 22,
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  successSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
});
