import { useTranslation } from "react-i18next";

export default function PrivacyPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white px-6 py-12 max-w-3xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-[#00F5A0] mb-1">{t("privacy.app_name")}</h1>
        <h2 className="text-xl font-semibold text-white">{t("privacy.title")}</h2>
        <p className="text-sm text-gray-400 mt-1">{t("privacy.last_updated")}</p>
      </div>

      <section className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-3">{t("privacy.section_1_title")}</h3>
        <p className="text-gray-300 leading-relaxed">{t("privacy.section_1_body")}</p>
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-3">{t("privacy.section_2_title")}</h3>
        <p className="text-gray-300 leading-relaxed mb-3">{t("privacy.section_2_intro")}</p>
        <ul className="text-gray-300 space-y-2 list-disc list-inside">
          <li>{t("privacy.section_2_li_1")}</li>
          <li>{t("privacy.section_2_li_2")}</li>
          <li>{t("privacy.section_2_li_3")}</li>
          <li>{t("privacy.section_2_li_4")}</li>
          <li>{t("privacy.section_2_li_5")}</li>
        </ul>
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-3">{t("privacy.section_3_title")}</h3>
        <p className="text-gray-300 leading-relaxed mb-3">{t("privacy.section_3_intro")}</p>
        <ul className="text-gray-300 space-y-2 list-disc list-inside">
          <li>{t("privacy.section_3_li_1")}</li>
          <li>{t("privacy.section_3_li_2")}</li>
          <li>{t("privacy.section_3_li_3")}</li>
          <li>{t("privacy.section_3_li_4")}</li>
        </ul>
        <p className="text-gray-300 leading-relaxed mt-3">{t("privacy.section_3_outro")}</p>
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-3">{t("privacy.section_4_title")}</h3>
        <p className="text-gray-300 leading-relaxed">{t("privacy.section_4_body")}</p>
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-3">{t("privacy.section_5_title")}</h3>
        <p className="text-gray-300 leading-relaxed">{t("privacy.section_5_body")}</p>
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-3">{t("privacy.section_6_title")}</h3>
        <p className="text-gray-300 leading-relaxed">{t("privacy.section_6_body")}</p>
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-3">{t("privacy.section_7_title")}</h3>
        <ul className="text-gray-300 space-y-2 list-disc list-inside">
          <li><strong className="text-white">{t("privacy.section_7_li_camera_label")}</strong>{t("privacy.section_7_li_camera_body")}</li>
          <li><strong className="text-white">{t("privacy.section_7_li_notif_label")}</strong>{t("privacy.section_7_li_notif_body")}</li>
          <li><strong className="text-white">{t("privacy.section_7_li_net_label")}</strong>{t("privacy.section_7_li_net_body")}</li>
        </ul>
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-3">{t("privacy.section_8_title")}</h3>
        <p className="text-gray-300 leading-relaxed">{t("privacy.section_8_body")}</p>
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-3">{t("privacy.section_9_title")}</h3>
        <p className="text-gray-300 leading-relaxed">
          {t("privacy.section_9_body")}<br />
          <span className="text-white font-medium">{t("privacy.section_9_contact_name")}</span><br />
          {t("privacy.section_9_contact_channel")}
        </p>
      </section>

      <div className="border-t border-white/10 pt-6 mt-8">
        <p className="text-xs text-gray-500">{t("privacy.footer")}</p>
      </div>
    </div>
  );
}
