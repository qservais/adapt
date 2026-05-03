import LegalPageLayout from "@/components/LegalPageLayout";
import { useTranslation } from "react-i18next";

export default function LegalNoticePage() {
  const { t } = useTranslation();
  const sections = (t("legal.sections", { returnObjects: true }) as Array<{ title: string; content: string }>) ?? [];
  return (
    <LegalPageLayout
      navLabel={t("legal.navLabel")}
      kicker={t("legal.kicker")}
      title1={t("legal.title1")}
      title2={t("legal.title2")}
      intro={t("legal.intro")}
      sections={sections}
    />
  );
}
