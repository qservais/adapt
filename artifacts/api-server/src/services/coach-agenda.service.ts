import { db } from "@workspace/db";
import { classOccurrencesTable, classTemplatesTable, classBookingsTable, coachAppointmentsTable, usersTable } from "@workspace/db";
import { and, count, eq, gte, lte, ne } from "drizzle-orm";

export interface AgendaEntry {
  kind: "class" | "individuel";
  id: string;
  startAt: string;
  durationMin: number;
  label: string;
  status: string;
  spotsBooked?: number;
  capacity?: number;
  athleteName?: string;
}

// The single merged view of "everything on the coach's calendar" — group
// classes (class_occurrences) and 1:1s (coach_appointments) read from the
// same two tables the rest of the system already treats as sources of truth,
// not a third copy. This is what Phase 5's week/month agenda screen consumes.
export async function getCoachAgenda(coachId: string, from: Date, to: Date): Promise<AgendaEntry[]> {
  const classes = await db
    .select({
      id: classOccurrencesTable.id,
      startAt: classOccurrencesTable.startAt,
      durationMin: classOccurrencesTable.durationMin,
      capacity: classOccurrencesTable.capacity,
      status: classOccurrencesTable.status,
      name: classTemplatesTable.name,
    })
    .from(classOccurrencesTable)
    .innerJoin(classTemplatesTable, eq(classOccurrencesTable.templateId, classTemplatesTable.id))
    .where(and(eq(classOccurrencesTable.coachId, coachId), gte(classOccurrencesTable.startAt, from), lte(classOccurrencesTable.startAt, to)));

  const classEntries: AgendaEntry[] = await Promise.all(
    classes.map(async (c) => {
      const [{ value: booked }] = await db
        .select({ value: count() })
        .from(classBookingsTable)
        .where(and(eq(classBookingsTable.occurrenceId, c.id), eq(classBookingsTable.status, "confirmed")));
      return {
        kind: "class" as const,
        id: c.id,
        startAt: c.startAt.toISOString(),
        durationMin: c.durationMin,
        label: c.name,
        status: c.status,
        spotsBooked: booked,
        capacity: c.capacity,
      };
    }),
  );

  const appointments = await db
    .select({
      id: coachAppointmentsTable.id,
      startAt: coachAppointmentsTable.startAt,
      durationMin: coachAppointmentsTable.durationMin,
      status: coachAppointmentsTable.status,
      athleteFirstName: usersTable.firstName,
      athleteLastName: usersTable.lastName,
    })
    .from(coachAppointmentsTable)
    .leftJoin(usersTable, eq(coachAppointmentsTable.athleteId, usersTable.id))
    .where(
      and(
        eq(coachAppointmentsTable.coachId, coachId),
        gte(coachAppointmentsTable.startAt, from),
        lte(coachAppointmentsTable.startAt, to),
        ne(coachAppointmentsTable.status, "declined"),
        ne(coachAppointmentsTable.status, "cancelled"),
      ),
    );

  const appointmentEntries: AgendaEntry[] = appointments.map((a) => ({
    kind: "individuel" as const,
    id: a.id,
    startAt: a.startAt.toISOString(),
    durationMin: a.durationMin,
    label: "1:1",
    status: a.status,
    athleteName: [a.athleteFirstName, a.athleteLastName].filter(Boolean).join(" ") || undefined,
  }));

  return [...classEntries, ...appointmentEntries].sort((x, y) => x.startAt.localeCompare(y.startAt));
}
