import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useT } from "@/context/PreferencesContext";

export default function NotFoundScreen() {
  const t = useT();
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View style={styles.container}>
        <Text style={styles.title}>{t("not_found_title", "Cet écran n'existe pas.")}</Text>

        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>{t("go_home", "Retour à l'accueil")}</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
    color: "#2e78b7",
  },
});
