import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, Alert, ActivityIndicator,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import {
  useGetShopPacks,
  useGetShopSubscriptions,
  useGetMyCredits,
  useCreateCheckoutSession,
} from "@workspace/api-client-react";
import { COLORS, FONTS } from "@/constants/theme";
import { useT } from "@/context/PreferencesContext";
import { GlowCard } from "@/components/ui/GlowCard";

const CHECKOUT_REDIRECT = "athlete-app://shop";

function formatEuros(cents: number): string {
  return `${(cents / 100).toFixed(2)} €`;
}

export default function ShopScreen() {
  const insets = useSafeAreaInsets();
  const t = useT();
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const packsQuery = useGetShopPacks();
  const subsQuery = useGetShopSubscriptions();
  const creditsQuery = useGetMyCredits();
  const checkoutMutation = useCreateCheckoutSession();
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  const handleBuy = async (type: "pack" | "subscription", id: string) => {
    if (purchasingId) return;
    setPurchasingId(id);
    try {
      const { checkoutUrl } = await checkoutMutation.mutateAsync({
        data: {
          type,
          id,
          successUrl: `${CHECKOUT_REDIRECT}?checkout=success`,
          cancelUrl: `${CHECKOUT_REDIRECT}?checkout=cancel`,
        },
      });
      if (!checkoutUrl) {
        Alert.alert(t("error", "Erreur"), t("checkout_unavailable", "Le paiement en ligne n'est pas disponible pour le moment."));
        return;
      }
      const result = await WebBrowser.openAuthSessionAsync(checkoutUrl, CHECKOUT_REDIRECT);
      if (result.type === "success") {
        creditsQuery.refetch();
        Alert.alert(t("purchase_success_title", "Merci !"), t("purchase_success_desc", "Ton achat a bien été enregistré."));
      }
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      if (status === 503) {
        Alert.alert(t("error", "Erreur"), t("checkout_not_configured", "Le paiement en ligne n'est pas encore activé par ton coach."));
      } else {
        Alert.alert(t("error", "Erreur"), t("checkout_error", "Impossible de démarrer le paiement. Réessaie."));
      }
    } finally {
      setPurchasingId(null);
    }
  };

  const packs = packsQuery.data ?? [];
  const subs = subsQuery.data ?? [];
  const credits = creditsQuery.data;

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: COLORS.bg }]}
      contentContainerStyle={{
        paddingTop: topPad + 16,
        paddingBottom: insets.bottom + 40,
        paddingHorizontal: 20,
        gap: 20,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { fontFamily: FONTS.title }]}>{t("shop_uc", "BOUTIQUE")}</Text>
      </View>

      <GlowCard glowColor={COLORS.cyan} style={styles.balanceCard}>
        <View style={styles.balanceRow}>
          <View style={styles.balanceItem}>
            <Text style={[styles.balanceVal, { fontFamily: FONTS.monoBold, color: COLORS.cyan }]}>
              {credits?.collectif ?? 0}
            </Text>
            <Text style={[styles.balanceLabel, { fontFamily: FONTS.body }]}>{t("credits_collectif", "Crédits collectifs")}</Text>
          </View>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceItem}>
            <Text style={[styles.balanceVal, { fontFamily: FONTS.monoBold, color: COLORS.violet }]}>
              {credits?.individuel ?? 0}
            </Text>
            <Text style={[styles.balanceLabel, { fontFamily: FONTS.body }]}>{t("credits_individuel", "Crédits 1:1")}</Text>
          </View>
        </View>
      </GlowCard>

      {packsQuery.isLoading ? (
        <ActivityIndicator color={COLORS.cyan} />
      ) : packs.length > 0 && (
        <View style={{ gap: 10 }}>
          <Text style={[styles.sectionLabel, { fontFamily: FONTS.mono }]}>{t("credit_packs_uc", "PACKS DE CRÉDITS")}</Text>
          {packs.map((pack) => (
            <View key={pack.id} style={styles.packCard}>
              <View style={{ flex: 1 }}>
                <View style={styles.packTitleRow}>
                  <Text style={[styles.packName, { fontFamily: FONTS.bodyBold }]}>{pack.name}</Text>
                  {pack.tag && (
                    <View style={styles.tagBadge}>
                      <Text style={[styles.tagText, { fontFamily: FONTS.mono }]}>{pack.tag}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.packMeta, { fontFamily: FONTS.body }]}>
                  {pack.credits} {pack.creditType === "collectif" ? t("credit_unit_collectif", "crédits collectifs") : t("credit_unit_individuel", "crédits 1:1")}
                  {pack.validityMonths ? ` · ${t("valid_for", "valable")} ${pack.validityMonths} ${t("months", "mois")}` : ""}
                </Text>
                <View style={styles.priceRow}>
                  {pack.hasActivePromo && (
                    <Text style={[styles.priceStrike, { fontFamily: FONTS.mono }]}>{formatEuros(pack.priceCents)}</Text>
                  )}
                  <Text style={[styles.price, { fontFamily: FONTS.monoBold, color: pack.hasActivePromo ? COLORS.green : COLORS.white }]}>
                    {formatEuros(pack.currentPriceCents)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => handleBuy("pack", pack.id)}
                disabled={!!purchasingId}
                style={[styles.buyBtn, { opacity: purchasingId ? 0.6 : 1 }]}
                activeOpacity={0.85}
              >
                {purchasingId === pack.id ? (
                  <ActivityIndicator size="small" color={COLORS.bg} />
                ) : (
                  <Text style={[styles.buyBtnText, { fontFamily: FONTS.bodyBold }]}>{t("buy", "Acheter")}</Text>
                )}
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {subsQuery.isLoading ? (
        <ActivityIndicator color={COLORS.violet} />
      ) : subs.length > 0 && (
        <View style={{ gap: 10 }}>
          <Text style={[styles.sectionLabel, { fontFamily: FONTS.mono, color: COLORS.violet }]}>{t("subscriptions_uc", "ABONNEMENTS")}</Text>
          {subs.map((sub) => (
            <View key={sub.id} style={[styles.packCard, { borderColor: `${COLORS.violet}40` }]}>
              <View style={{ flex: 1 }}>
                <View style={styles.packTitleRow}>
                  <Text style={[styles.packName, { fontFamily: FONTS.bodyBold }]}>{sub.name}</Text>
                  {sub.tag && (
                    <View style={[styles.tagBadge, { borderColor: `${COLORS.violet}50`, backgroundColor: `${COLORS.violet}15` }]}>
                      <Text style={[styles.tagText, { fontFamily: FONTS.mono, color: COLORS.violet }]}>{sub.tag}</Text>
                    </View>
                  )}
                </View>
                {sub.presentialText && (
                  <Text style={[styles.packMeta, { fontFamily: FONTS.body }]}>{sub.presentialText}</Text>
                )}
                <Text style={[styles.packMeta, { fontFamily: FONTS.body }]}>
                  {sub.engagementMonths ? `${t("engagement", "Engagement")} ${sub.engagementMonths} ${t("months", "mois")}` : t("no_engagement", "Sans engagement")}
                </Text>
                <Text style={[styles.price, { fontFamily: FONTS.monoBold, color: COLORS.white, marginTop: 4 }]}>
                  {formatEuros(sub.priceCents)} <Text style={[styles.priceSuffix, { fontFamily: FONTS.body }]}>{t("per_month", "/ mois")}</Text>
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleBuy("subscription", sub.id)}
                disabled={!!purchasingId}
                style={[styles.buyBtn, { backgroundColor: COLORS.violet, opacity: purchasingId ? 0.6 : 1 }]}
                activeOpacity={0.85}
              >
                {purchasingId === sub.id ? (
                  <ActivityIndicator size="small" color={COLORS.bg} />
                ) : (
                  <Text style={[styles.buyBtnText, { fontFamily: FONTS.bodyBold }]}>{t("subscribe", "S'abonner")}</Text>
                )}
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {!packsQuery.isLoading && !subsQuery.isLoading && packs.length === 0 && subs.length === 0 && (
        <View style={styles.emptyBox}>
          <Feather name="shopping-bag" size={28} color={COLORS.textMuted} />
          <Text style={[styles.emptyText, { fontFamily: FONTS.body }]}>
            {t("shop_empty", "Ton coach n'a pas encore configuré la boutique.")}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { padding: 4 },
  title: { fontSize: 28, color: COLORS.white, letterSpacing: 3 },
  balanceCard: { flexDirection: "row" },
  balanceRow: { flexDirection: "row", width: "100%" },
  balanceItem: { flex: 1, alignItems: "center", gap: 4 },
  balanceDivider: { width: 1, backgroundColor: COLORS.border },
  balanceVal: { fontSize: 32 },
  balanceLabel: { fontSize: 12, color: COLORS.textSecondary, textAlign: "center" },
  sectionLabel: { fontSize: 11, color: COLORS.cyan, letterSpacing: 2 },
  packCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  packTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  packName: { fontSize: 15, color: COLORS.white },
  tagBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: `${COLORS.cyan}50`,
    backgroundColor: `${COLORS.cyan}15`,
  },
  tagText: { fontSize: 9, color: COLORS.cyan, letterSpacing: 0.5 },
  packMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 3 },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 6 },
  priceStrike: { fontSize: 12, color: COLORS.textMuted, textDecorationLine: "line-through" },
  price: { fontSize: 18 },
  priceSuffix: { fontSize: 12, color: COLORS.textMuted },
  buyBtn: {
    backgroundColor: COLORS.cyan,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 84,
    alignItems: "center",
  },
  buyBtnText: { fontSize: 13, color: COLORS.bg },
  emptyBox: { alignItems: "center", paddingVertical: 32, gap: 10 },
  emptyText: { fontSize: 14, color: COLORS.textMuted, textAlign: "center" },
});
