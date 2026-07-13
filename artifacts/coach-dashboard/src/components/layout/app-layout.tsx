import React from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "15rem",
    "--sidebar-width-icon": "3.5rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
        <AppSidebar />
        <div className="flex flex-col flex-1 relative min-w-0">
          <header className="flex items-center h-14 px-4 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-10 md:hidden shrink-0">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <span className="ml-3 font-display text-lg tracking-widest text-primary">ADAPT</span>
          </header>
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
