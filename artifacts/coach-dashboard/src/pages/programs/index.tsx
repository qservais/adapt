import { useState } from "react";
import { Link } from "wouter";
import { useGetPrograms, useCreateProgram, useGetClients } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Calendar, User, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const createSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  athleteId: z.string().min(1, "L'athlète est requis"),
  durationWeeks: z.coerce.number().min(1).max(52),
  startDate: z.string().optional()
});

export default function ProgramsList() {
  const { data: programs, isLoading, refetch } = useGetPrograms();
  const { data: clients } = useGetClients();
  const createMutation = useCreateProgram();
  const [open, setOpen] = useState(false);

  const form = useForm<z.infer<typeof createSchema>>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "", athleteId: "", durationWeeks: 4, startDate: new Date().toISOString().split('T')[0] }
  });

  const onSubmit = async (data: z.infer<typeof createSchema>) => {
    try {
      await createMutation.mutateAsync({ data });
      setOpen(false);
      form.reset();
      refetch();
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display text-white">PROGRAMMES D'ENTRAÎNEMENT</h1>
          <p className="text-muted-foreground text-sm">Créez et gérez les protocoles des athlètes.</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 hover-elevate">
              <Plus className="w-4 h-4 mr-2" /> Nouveau programme
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-display tracking-widest text-white">CRÉER UN PROGRAMME</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground">Nom du programme</FormLabel>
                    <FormControl><Input placeholder="Préparation hors-saison..." className="bg-background border-border" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="athleteId" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground">Assigner un athlète</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background border-border">
                          <SelectValue placeholder="Choisir un athlète" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-card border-border">
                        {clients?.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="durationWeeks" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground">Durée (semaines)</FormLabel>
                      <FormControl><Input type="number" min={1} className="bg-background border-border" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="startDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground">Date de début</FormLabel>
                      <FormControl><Input type="date" className="bg-background border-border" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <Button type="submit" className="w-full mt-4" disabled={createMutation.isPending}>
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Créer le programme"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {programs?.map(prog => (
          <Link key={prog.id} href={`/programs/${prog.id}`}>
            <div className="group bg-card border border-border rounded-xl p-5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/20 to-transparent group-hover:from-primary transition-colors" />
              
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-lg text-white group-hover:text-primary transition-colors truncate pr-4">{prog.name}</h3>
                {prog.isActive && <span className="shrink-0 w-2 h-2 rounded-full bg-primary animate-pulse" />}
              </div>
              
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><User className="w-4 h-4" /> <span className="text-white font-medium">{prog.athleteName}</span></div>
                <div className="flex items-center gap-2"><Clock className="w-4 h-4" /> <span>{prog.durationWeeks} semaines</span></div>
                {prog.startDate && (
                  <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /> <span>Début le {format(new Date(prog.startDate), 'd MMM yyyy', { locale: fr })}</span></div>
                )}
              </div>
            </div>
          </Link>
        ))}
        {programs?.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground bg-card/50 rounded-xl border border-dashed border-border">
            Aucun programme créé. Créez-en un pour commencer.
          </div>
        )}
      </div>
    </div>
  );
}
