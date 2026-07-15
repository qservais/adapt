import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useGetCoachAgenda } from "@workspace/api-client-react";
import { CalendarRange, ChevronLeft, ChevronRight, Loader2, Users, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";

function mondayOf(d: Date): Date {
  return startOfWeek(d, { weekStartsOn: 1 });
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  scheduled: "default",
  confirmed: "default",
  pending: "outline",
  cancelled: "destructive",
  declined: "destructive",
};

export default function AgendaPage() {
  const { t } = useTranslation();
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const weekEnd = addDays(weekStart, 6);

  const { data: entries, isLoading } = useGetCoachAgenda(
    { from: weekStart.toISOString(), to: addDays(weekEnd, 1).toISOString() },
    { query: { queryKey: ["/api/coach/agenda", weekStart.toISOString()] } }
  );

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const isCurrentWeek = isSameDay(mondayOf(new Date()), weekStart);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-white flex items-center gap-3">
            <CalendarRange className="w-8 h-8 text-primary" /> {t("agenda_page.title", { defaultValue: "AGENDA" })}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t("agenda_page.subtitle", { defaultValue: "Cours collectifs et rendez-vous 1:1, en un seul calendrier." })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekStart((w) => addDays(w, -7))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          {!isCurrentWeek && (
            <Button variant="outline" size="sm" onClick={() => setWeekStart(mondayOf(new Date()))}>
              {t("agenda_page.this_week", { defaultValue: "Cette semaine" })}
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={() => setWeekStart((w) => addDays(w, 7))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <p className="text-sm font-mono text-muted-foreground">
        {format(weekStart, "d MMM", { locale: fr })} — {format(weekEnd, "d MMM yyyy", { locale: fr })}
      </p>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && (
        <div className="space-y-4">
          {days.map((day) => {
            const dayEntries = (entries ?? [])
              .filter((e) => isSameDay(new Date(e.startAt), day))
              .sort((a, b) => a.startAt.localeCompare(b.startAt));
            return (
              <div key={day.toISOString()} className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">
                  {format(day, "EEEE d MMMM", { locale: fr })}
                </p>
                {dayEntries.length === 0 ? (
                  <p className="text-sm text-muted-foreground/60 italic">
                    {t("agenda_page.no_entries", { defaultValue: "Rien de prévu." })}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {dayEntries.map((entry) => (
                      <div
                        key={`${entry.kind}-${entry.id}`}
                        className="flex items-center gap-3 py-2 border-b border-border last:border-0"
                      >
                        <span className="text-sm font-mono text-white w-14 shrink-0">
                          {format(new Date(entry.startAt), "HH:mm")}
                        </span>
                        {entry.kind === "class" ? (
                          <Users className="w-4 h-4 text-cyan-400 shrink-0" />
                        ) : (
                          <User className="w-4 h-4 text-violet-400 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">
                            {entry.label}
                            {entry.athleteName ? ` — ${entry.athleteName}` : ""}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {entry.durationMin} min
                            {entry.kind === "class" && entry.capacity != null && (
                              <> · {entry.spotsBooked ?? 0}/{entry.capacity} {t("agenda_page.spots", { defaultValue: "places" })}</>
                            )}
                          </p>
                        </div>
                        <Badge variant={STATUS_VARIANT[entry.status] ?? "outline"}>{entry.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
