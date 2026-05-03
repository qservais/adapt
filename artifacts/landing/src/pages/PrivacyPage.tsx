import LegalPageLayout from "@/components/LegalPageLayout";
import { useTranslation } from "react-i18next";

export default function PrivacyPage() {
  const { t } = useTranslation();
  const sections = (t("privacy.sections", { returnObjects: true }) as Array<{ title: string; content: string }>) ?? [];
  return (
    <LegalPageLayout
      navLabel={t("privacy.navLabel")}
      kicker={t("privacy.kicker")}
      title1={t("privacy.title1")}
      title2={t("privacy.title2")}
      intro={t("privacy.intro")}
      sections={sections}
    />
  );
}
