import { AppSideBar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nodebase",
  description: "Welcome to Nodebase - The next generation of automation infrastructure. Visual workflows for modern developers.",
  icons: {
    icon: "/logos/logo.svg",
  },
};

const Layout = ( {children}: {children: React.ReactNode; }) => {
    return(
        <SidebarProvider>
            <AppSideBar />
            <SidebarInset className="bg-accent/20">
                {children}
            </SidebarInset>
        </SidebarProvider>
    )
}

export default Layout;