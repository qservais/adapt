import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dumbbell, Handshake, CalendarRange, Store } from "lucide-react";
import ClassesManagementPage from "@/pages/classes/index";
import OneOnOnePage from "@/pages/one-on-one/index";
import ShopPage from "@/pages/shop/index";

/**
 * Not one of the mockup's 4 top-level nav tabs — reached by drilling in from
 * Athlètes ("Cours, RDV & Boutique" button). Two-tab split matching the
 * mockup's CoachScreen intent:
 *  - "Cours & planning": class CRUD/scheduling (incl. its cancellation-rule
 *    UI) + the 1:1 availability editor, merged in via a secondary switch so
 *    neither existing page's logic had to be touched.
 *  - "Boutique & offres": the pricing/packs/subscriptions editor, unchanged.
 */
export default function CoachOpsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"planning" | "shop">("planning");
  const [planningSub, setPlanningSub] = useState<"classes" | "one_on_one">("classes");

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-display text-white flex items-center gap-3">
          <CalendarRange className="w-8 h-8 text-primary" /> {t("coach_ops_page.title", { defaultValue: "COURS, RDV & BOUTIQUE" })}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t("coach_ops_page.subtitle", { defaultValue: "Gestion des cours, rendez-vous 1:1 et offres — accessible depuis Athlètes." })}
        </p>
      </div>

      <div className="flex gap-2 border-b border-border pb-1">
        {(["planning", "shop"] as const).map((tKey) => (
          <button
            key={tKey}
            onClick={() => setTab(tKey)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
              tab === tKey ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-white"
            }`}
          >
            {tKey === "planning" ? <CalendarRange className="w-4 h-4" /> : <Store className="w-4 h-4" />}
            {tKey === "planning"
              ? t("coach_ops_page.tab_planning", { defaultValue: "Cours & planning" })
              : t("coach_ops_page.tab_shop", { defaultValue: "Boutique & offres" })}
          </button>
        ))}
      </div>

      {tab === "planning" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {(["classes", "one_on_one"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setPlanningSub(s)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  planningSub === s ? "bg-primary text-black border-primary" : "bg-background text-muted-foreground border-border"
                }`}
              >
                {s === "classes" ? <Dumbbell className="w-4 h-4" /> : <Handshake className="w-4 h-4" />}
                {s === "classes"
                  ? t("coach_ops_page.sub_classes", { defaultValue: "Cours collectifs" })
                  : t("coach_ops_page.sub_one_on_one", { defaultValue: "Rendez-vous 1:1" })}
              </button>
            ))}
          </div>

          {planningSub === "classes" ? <ClassesManagementPage /> : <OneOnOnePage />}
        </div>
      )}

      {tab === "shop" && <ShopPage />}
    </div>
  );
}
