import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { requireNoAuth } from "@/lib/auth-utils";

const Page = async () => {
    await requireNoAuth();
    
    return <ForgotPasswordForm />;
};

export default Page;
