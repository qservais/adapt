import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
const schema = z.object({
  email: z.string().email("Adresse email invalide"),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      await fetch(`/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });
      setSent(true);
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
          <p className="text-muted-foreground font-mono text-sm">RÉINITIALISATION</p>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-primary mx-auto" />
            <h2 className="text-xl font-semibold text-white">Email envoyé</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Si un compte existe avec cette adresse, tu recevras un lien de réinitialisation dans quelques minutes. Vérifie aussi tes spams.
            </p>
            <Link href="/login">
              <Button variant="ghost" className="mt-4 text-primary hover:text-primary/80">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour à la connexion
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <p className="text-muted-foreground text-sm mb-6 text-center leading-relaxed">
              Saisis ton adresse email. Tu recevras un lien pour choisir un nouveau mot de passe.
            </p>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Adresse email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="coach@adapt.demo"
                          className="bg-black/50 border-white/10 focus-visible:ring-primary h-12"
                          autoComplete="email"
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
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "ENVOYER LE LIEN"}
                </Button>
              </form>
            </Form>
            <div className="mt-6 text-center">
              <Link href="/login">
                <button className="text-sm text-muted-foreground hover:text-white transition-colors inline-flex items-center gap-1">
                  <ArrowLeft className="w-3 h-3" />
                  Retour à la connexion
                </button>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
