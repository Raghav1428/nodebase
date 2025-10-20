import { LoginForm } from "@/features/auth/components/login-form";
import { requireNoAuth } from "@/lib/auth-utils";

const Page = async() => {

    await requireNoAuth();
    
    return <LoginForm />;
};

export default Page;