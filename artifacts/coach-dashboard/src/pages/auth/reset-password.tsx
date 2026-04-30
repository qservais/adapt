import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
const schema = z
  .object({
    newPassword: z.string().min(8, "Au moins 8 caractères"),
    confirm: z.string().min(1, "Confirmation requise"),
  })
  .refine((d) => d.newPassword === d.confirm, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirm"],
  });

type FormValues = z.infer<typeof schema>;

function useSearchParam(key: string): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get(key) ?? "";
}

export default function ResetPasswordPage() {
  const token = useSearchParam("token");
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: "", confirm: "" },
  });

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="text-center space-y-4 max-w-sm">
          <XCircle className="w-12 h-12 text-destructive mx-auto" />
          <h2 className="text-xl font-semibold text-white">Lien invalide</h2>
          <p className="text-muted-foreground text-sm">Ce lien de réinitialisation est invalide ou a expiré.</p>
          <Link href="/forgot-password">
            <Button variant="outline" className="border-white/10">Demander un nouveau lien</Button>
          </Link>
        </div>
      </div>
    );
  }

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    setStatus("idle");
    try {
      const res = await fetch(`/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: data.newPassword }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErrorMsg(body?.error?.message ?? "Lien invalide ou expiré.");
        setStatus("error");
        return;
      }
      setStatus("success");
      setTimeout(() => navigate("/login"), 3000);
    } catch {
      setErrorMsg("Une erreur est survenue. Réessaie.");
      setStatus("error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-background">
      <div className="absolute inset-0 z-0">
        <img
          src={`${import.meta.env.BASE_URL}images/login-bg.png`}
          alt="Fond"
          className="w-full h-full object-cover opacity-40 mix-blend-screen"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
      </div>

      <div className="relative z-10 w-full max-w-md p-8 sm:p-12 bg-card/60 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-display text-white tracking-widest mb-2">
            ADAPT <span className="text-primary">COACH</span>
          </h1>
          <p className="text-muted-foreground font-mono text-sm">NOUVEAU MOT DE PASSE</p>
        </div>

        {status === "success" ? (
          <div className="text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-primary mx-auto" />
            <h2 className="text-xl font-semibold text-white">Mot de passe mis à jour !</h2>
            <p className="text-muted-foreground text-sm">Redirection vers la connexion dans 3 secondes…</p>
          </div>
        ) : (
          <>
            {status === "error" && (
              <div className="mb-5 p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center">
                {errorMsg}
              </div>
            )}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Nouveau mot de passe</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          className="bg-black/50 border-white/10 focus-visible:ring-primary h-12"
                          autoComplete="new-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Confirmer le mot de passe</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          className="bg-black/50 border-white/10 focus-visible:ring-primary h-12"
                          autoComplete="new-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full h-12 text-black font-bold text-base tracking-wide bg-primary hover:opacity-90"
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "CHANGER LE MOT DE PASSE"}
                </Button>
              </form>
            </Form>
          </>
        )}
      </div>
    </div>
  );
}
