import { AuthLayout } from "@/features/auth/components/auth-layout";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login/Sign up to Nodebase",
  description: "Nodebase - The next generation of automation infrastructure. Visual workflows for modern developers.",
  icons: {
    icon: "/logos/logo.svg",
  },
};

const Layout = ({ children }: { children: React.ReactNode }) => {
    return (
        <AuthLayout>
            {children}
        </AuthLayout>
    )
}

export default Layout;