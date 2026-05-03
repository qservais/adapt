import LegalPageLayout from "@/components/LegalPageLayout";
import { useTranslation } from "react-i18next";

export default function CookiesPage() {
  const { t } = useTranslation();
  const sections = (t("cookies.sections", { returnObjects: true }) as Array<{ title: string; content: string }>) ?? [];
  return (
    <LegalPageLayout
      navLabel={t("cookies.navLabel")}
      kicker={t("cookies.kicker")}
      title1={t("cookies.title1")}
      title2={t("cookies.title2")}
      intro={t("cookies.intro")}
      sections={sections}
    />
  );
}
