import { DashboardClientLayout } from "./DashboardClientLayout";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nodebase",
  description: "Welcome to Nodebase - The next generation of automation infrastructure. Visual workflows for modern developers.",
  icons: {
    icon: "/logos/logo.svg",
  },
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <DashboardClientLayout>
      {children}
    </DashboardClientLayout>
  );
};

export default Layout;