import { Switch, Route, Redirect, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "./lib/auth-context";
import { AppLayout } from "./components/layout/app-layout";
import "./lib/api-setup";

import LoginPage from "./pages/login";
import Dashboard from "./pages/dashboard/index";
import ClientsOverview from "./pages/clients/index";
import ClientDetail from "./pages/clients/detail";
import ProgramsList from "./pages/programs/index";
import ProgramDetail from "./pages/programs/detail";
import AlertsFeed from "./pages/alerts/index";
import MessagesList from "./pages/messages/index";
import ChatView from "./pages/messages/chat";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

const PUBLIC_PATHS = ['/login'];

function AppRouter() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();
  const tokenExists = !!localStorage.getItem('adapt_coach_access');
  const isPublic = PUBLIC_PATHS.includes(location);

  if (!tokenExists && !isPublic) {
    return <Redirect to="/login" />;
  }

  if (isPublic) {
    return (
      <Switch>
        <Route path="/login" component={LoginPage} />
      </Switch>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user && user.role !== 'coach') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-center p-8">
        <div>
          <h1 className="text-3xl font-display text-destructive mb-4">ACCESS DENIED</h1>
          <p className="text-muted-foreground">This portal is for coaches only. Please use the athlete app.</p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/clients" component={ClientsOverview} />
        <Route path="/clients/:id" component={ClientDetail} />
        <Route path="/programs" component={ProgramsList} />
        <Route path="/programs/:id" component={ProgramDetail} />
        <Route path="/alerts" component={AlertsFeed} />
        <Route path="/messages" component={MessagesList} />
        <Route path="/messages/:id" component={ChatView} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <AppRouter />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
