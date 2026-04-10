import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { requireNoAuth } from "@/lib/auth-utils";

const Page = async () => {
    await requireNoAuth();
    
    return <ResetPasswordForm />;
};

export default Page;
