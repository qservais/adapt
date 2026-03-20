import React, { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { COLORS, FONTS, MODE_CONFIG } from "@/constants/theme";
import { GradientButton } from "@/components/ui/GradientButton";

const { width } = Dimensions.get("window");

type IconName = "sun" | "activity" | "zap";

interface Slide {
  key: string;
  title: string;
  desc: string;
  icon: IconName;
  color: string;
}

const SLIDES: Slide[] = [
  {
    key: "checkin",
    title: "CHECK-IN QUOTIDIEN",
    desc: "Chaque matin, évalue ton sommeil, énergie, stress, courbatures et motivation. En moins de 60 secondes.",
    icon: "sun",
    color: COLORS.cyan,
  },
  {
    key: "adapt",
    title: "TON ADAPT SCORE",
    desc: "On calcule ton ADAPT Score (0–100) et on attribue un mode de séance : Performance, Normal, Adapt ou Récupération.",
    icon: "activity",
    color: COLORS.violet,
  },
  {
    key: "session",
    title: "ENTRAÎNE-TOI MIEUX",
    desc: "Ta séance est automatiquement ajustée à la forme de ton corps aujourd'hui. Charges, volume — tout est calibré.",
    icon: "zap",
    color: COLORS.amber,
  },
];

export default function TutorialScreen() {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);

  const goNext = () => {
    if (index < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    } else {
      router.replace("/checkin");
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: COLORS.bg }]}>
      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        keyExtractor={(s) => s.key}
        onMomentumScrollEnd={(e) =>
          setIndex(Math.round(e.nativeEvent.contentOffset.x / width))
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.slide,
              { paddingTop: insets.top + 80, paddingBottom: insets.bottom + 160 },
            ]}
          >
            <View style={[styles.iconCircle, { borderColor: item.color, backgroundColor: `${item.color}20` }]}>
              <Feather name={item.icon} size={52} color={item.color} />
            </View>
            <Text style={[styles.slideTitle, { fontFamily: FONTS.title, color: item.color }]}>
              {item.title}
            </Text>
            <Text style={[styles.slideDesc, { fontFamily: FONTS.body }]}>
              {item.desc}
            </Text>

            <View style={styles.modes}>
              {Object.entries(MODE_CONFIG).map(([key, cfg]) => (
                <View key={key} style={[styles.modePill, { backgroundColor: cfg.dim, borderColor: cfg.color }]}>
                  <Text style={[styles.modeLabel, { color: cfg.color, fontFamily: FONTS.mono }]}>{cfg.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      />

      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + 32 },
        ]}
      >
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === index && styles.dotActive]}
            />
          ))}
        </View>
        <GradientButton
          label={index < SLIDES.length - 1 ? "Suivant" : "C'est parti !"}
          onPress={goNext}
        />
        {index < SLIDES.length - 1 && (
          <TouchableOpacity
            onPress={() => router.replace("/checkin")}
            style={styles.skip}
          >
            <Text style={[styles.skipText, { fontFamily: FONTS.body }]}>Passer</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  slide: {
    width,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  slideTitle: {
    fontSize: 40,
    letterSpacing: 3,
    textAlign: "center",
  },
  slideDesc: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 26,
  },
  modes: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    marginTop: 8,
  },
  modePill: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  modeLabel: {
    fontSize: 10,
    letterSpacing: 1.5,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    gap: 16,
    alignItems: "center",
  },
  dots: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: COLORS.cyan,
  },
  skip: { padding: 8 },
  skipText: { color: COLORS.textMuted, fontSize: 14 },
});
