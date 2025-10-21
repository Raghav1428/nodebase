import { AppHeader } from "@/components/app-header";
import { AppSideBar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

const Layout = ( {children}: {children: React.ReactNode; }) => {
    return(
        <>
            <AppHeader />
            <main className="flex-1">{children}</main>
        </>
    )
}

export default Layout;