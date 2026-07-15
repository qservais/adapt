import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslation } from "react-i18next";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const { setAuth } = useAuth();
  const loginMutation = useLogin();

  const loginSchema = z.object({
    email: z.string().email(t("auth.login.errorInvalid")),
    password: z.string().min(6, t("auth.reset.errorTooShort")),
  });

  type LoginFormValues = z.infer<typeof loginSchema>;

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setError(null);
    try {
      const response = await loginMutation.mutateAsync({ data });
      if (response.user.role !== 'coach') {
        setError(t("auth.denied.message"));
        return;
      }
      setAuth(response.accessToken, response.refreshToken);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("auth.login.errorInvalid");
      setError(message);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-background">
      <div className="absolute inset-0 z-0">
        <img
          src={`${import.meta.env.BASE_URL}images/login-bg.png`}
          alt=""
          className="w-full h-full object-cover opacity-40 mix-blend-screen"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
      </div>

      <div className="absolute top-4 right-4 z-20">
        <LanguageSwitcher />
      </div>

      <div className="relative z-10 w-full max-w-md p-8 sm:p-12 bg-card/60 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl box-shadow-neon-primary">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-display text-white tracking-widest mb-2 text-shadow-neon-primary">
            MOUV'UP <span className="text-primary">COACH</span>
          </h1>
          <p className="text-muted-foreground font-mono text-sm">{t("auth.login.subtitle")}</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center">
            {error}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300">{t("auth.login.email")}</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      placeholder={t("auth.login.emailPlaceholder")}
                      className="bg-black/50 border-white/10 focus-visible:ring-primary h-12"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300">{t("auth.login.password")}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className="bg-black/50 border-white/10 focus-visible:ring-primary h-12"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full h-12 text-black font-bold text-lg tracking-wide hover:opacity-90 transition-opacity mt-4 bg-primary"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : t("auth.login.submit")}
            </Button>
          </form>
        </Form>

        <div className="mt-6 text-center">
          <Link href="/forgot-password">
            <button type="button" className="text-sm text-muted-foreground hover:text-primary transition-colors py-3 px-4 -my-1 inline-block min-h-[44px]">
              {t("auth.login.forgotLink")}
            </button>
          </Link>
        </div>
        <div className="mt-4 text-center text-xs text-muted-foreground font-mono">
          <p>{t("auth.login.demoHint")}</p>
        </div>
      </div>
    </div>
  );
}
