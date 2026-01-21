/**
 * Dashboard Client Layout
 * 
 * Client-side wrapper for the dashboard that includes the OnboardingProvider.
 */

'use client';

import { AppSideBar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { OnboardingProvider } from "@/features/onboarding";

interface DashboardClientLayoutProps {
  children: React.ReactNode;
}

export function DashboardClientLayout({ children }: DashboardClientLayoutProps) {
  return (
    <SidebarProvider>
      <OnboardingProvider autoStart={true}>
        <AppSideBar />
        <SidebarInset className="bg-accent/20">
          {children}
        </SidebarInset>
      </OnboardingProvider>
    </SidebarProvider>
  );
}
