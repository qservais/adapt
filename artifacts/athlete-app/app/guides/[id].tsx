import React from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { COLORS, FONTS } from "@/constants/theme";
import { useT } from "@/context/PreferencesContext";

interface Guide {
  id: string;
  title: string;
  contentMarkdown: string;
  category: string | null;
  createdAt: string;
}

function renderMarkdown(md: string): React.ReactNode[] {
  const lines = md.split("\n");
  const nodes: React.ReactNode[] = [];
  let key = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("# ")) {
      nodes.push(<Text key={key++} style={[styles.h1, { fontFamily: FONTS.title }]}>{line.slice(2)}</Text>);
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      nodes.push(<Text key={key++} style={[styles.h2, { fontFamily: FONTS.bodyBold }]}>{line.slice(3)}</Text>);
      i++;
      continue;
    }
    if (line.startsWith("### ")) {
      nodes.push(<Text key={key++} style={[styles.h3, { fontFamily: FONTS.bodyBold }]}>{line.slice(4)}</Text>);
      i++;
      continue;
    }

    if (line.startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        if (!lines[i].replace(/[|\-: ]/g, "").trim()) { i++; continue; }
        tableLines.push(lines[i]);
        i++;
      }
      if (tableLines.length > 0) {
        const rows = tableLines.map(l => l.split("|").filter((_, idx, arr) => idx > 0 && idx < arr.length - 1).map(c => c.trim()));
        nodes.push(
          <View key={key++} style={styles.table}>
            {rows.map((row, rowIdx) => (
              <View key={rowIdx} style={[styles.tableRow, rowIdx === 0 && styles.tableHeader]}>
                {row.map((cell, cellIdx) => (
                  <Text
                    key={cellIdx}
                    style={[
                      styles.tableCell,
                      { fontFamily: rowIdx === 0 ? FONTS.mono : FONTS.body },
                      cellIdx === 0 && styles.tableCellFirst,
                    ]}
                  >
                    {inlineFormat(cell)}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        );
      }
      continue;
    }

    if (line.startsWith("- ") || line.startsWith("* ")) {
      nodes.push(
        <View key={key++} style={styles.listItem}>
          <Text style={[styles.bullet, { fontFamily: FONTS.mono }]}>·</Text>
          <Text style={[styles.listText, { fontFamily: FONTS.body }]}>{inlineFormat(line.slice(2))}</Text>
        </View>
      );
      i++;
      continue;
    }

    if (line.startsWith("> ")) {
      nodes.push(
        <View key={key++} style={styles.blockquote}>
          <Text style={[styles.blockquoteText, { fontFamily: FONTS.bodyMedium }]}>{inlineFormat(line.slice(2))}</Text>
        </View>
      );
      i++;
      continue;
    }

    if (line.trim() === "" || line.startsWith("---")) {
      nodes.push(<View key={key++} style={styles.spacer} />);
      i++;
      continue;
    }

    nodes.push(
      <Text key={key++} style={[styles.body, { fontFamily: FONTS.body }]}>
        {inlineFormat(line)}
      </Text>
    );
    i++;
  }
  return nodes;
}

function inlineFormat(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1");
}

export default function GuideDetailScreen() {
  const insets = useSafeAreaInsets();
  const t = useT();
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const params = useLocalSearchParams<{ id: string }>();

  const { data: guide, isLoading, error } = useQuery<Guide>({
    queryKey: ["/api/guides", params.id],
    queryFn: () => customFetch(`/api/guides/${params.id}`),
    enabled: params.id != null,
  });

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: COLORS.bg }]}
      contentContainerStyle={{
        paddingTop: topPad + 16,
        paddingBottom: insets.bottom + (Platform.OS === "web" ? 84 : 49) + 40,
        paddingHorizontal: 20,
        gap: 4,
      }}
      showsVerticalScrollIndicator={false}
    >
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Feather name="arrow-left" size={22} color={COLORS.textPrimary} />
        <Text style={[styles.backText, { fontFamily: FONTS.body }]}>{t("guides_title", "Guides")}</Text>
      </TouchableOpacity>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.cyan} size="large" />
        </View>
      )}

      {error != null && (
        <View style={styles.errorBox}>
          <Text style={[styles.errorText, { fontFamily: FONTS.body }]}>{t("guide_not_found", "Guide introuvable.")}</Text>
        </View>
      )}

      {guide != null && (
        <View style={styles.content}>
          {renderMarkdown(guide.contentMarkdown)}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 20, paddingVertical: 4 },
  backText: { fontSize: 15, color: COLORS.textSecondary },
  center: { alignItems: "center", paddingVertical: 60 },
  errorBox: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: `${COLORS.red}40`,
  },
  errorText: { color: COLORS.red, fontSize: 14, textAlign: "center" },
  content: { gap: 6 },
  h1: { fontSize: 28, color: COLORS.white, letterSpacing: 2, marginBottom: 4, marginTop: 12 },
  h2: { fontSize: 18, color: COLORS.cyan, marginTop: 20, marginBottom: 6 },
  h3: { fontSize: 15, color: COLORS.textPrimary, marginTop: 14, marginBottom: 4 },
  body: { fontSize: 15, color: COLORS.textSecondary, lineHeight: 24 },
  listItem: { flexDirection: "row", gap: 10, marginVertical: 2, paddingLeft: 4 },
  bullet: { fontSize: 16, color: COLORS.cyan, lineHeight: 24 },
  listText: { flex: 1, fontSize: 15, color: COLORS.textSecondary, lineHeight: 24 },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.cyan,
    paddingLeft: 12,
    marginVertical: 8,
    backgroundColor: `${COLORS.cyan}08`,
    borderRadius: 4,
    paddingVertical: 8,
  },
  blockquoteText: { fontSize: 15, color: COLORS.textPrimary },
  spacer: { height: 8 },
  table: {
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    marginVertical: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableHeader: { backgroundColor: `${COLORS.cyan}15` },
  tableCell: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    padding: 8,
    lineHeight: 18,
  },
  tableCellFirst: { color: COLORS.textPrimary },
});
