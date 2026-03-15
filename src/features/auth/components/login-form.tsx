"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
import { authClient } from "@/lib/auth-client";
import Image from "next/image";
import { MailCheck } from "lucide-react";

const LoginSchema = z.object({
    email: z.email("Please enter a valid email address"),
    password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof LoginSchema>;

export function LoginForm() {
    const router = useRouter();
    const [needsVerification, setNeedsVerification] = useState(false);
    const [resendPending, setResendPending] = useState(false);
    const [resendCountdown, setResendCountdown] = useState(0);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    const form = useForm<LoginFormValues>({
        resolver: zodResolver(LoginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    const signInGithub = async () => {
        await authClient.signIn.social({ provider: "github", callbackURL: "/workflows" }, {
            onSuccess: () => router.push("/workflows"),
            onError: (error) => { toast.error(error.error.message || "Something went wrong") },
        });
    };

    const signInGoogle = async () => {
        await authClient.signIn.social({ provider: "google", callbackURL: "/workflows" }, {
            onSuccess: () => router.push("/workflows"),
            onError: (error) => { toast.error(error.error.message || "Something went wrong") },
        });
    };

    const onSubmit = async (values: LoginFormValues) => {
        await authClient.signIn.email(
            {
                email: values.email,
                password: values.password,
                callbackURL: "/workflows",
            },
            {
                onSuccess: () => router.push("/workflows"),
                onError: (error) => {
                    const code = error.error.code;
                    if (code === "EMAIL_NOT_VERIFIED") {
                        setNeedsVerification(true);
                    } else {
                        toast.error(error.error.message || "Something went wrong");
                    }
                },
            }
        );
    };

    const handleResendVerification = async () => {
        const email = form.getValues("email");
        if (!email) {
            toast.error("Please enter your email address first.");
            return;
        }
        setResendPending(true);
        try {
            await authClient.sendVerificationEmail(
                { email, callbackURL: "/workflows" },
                {
                    onSuccess: () => { toast.success("Verification email sent! Check your inbox.") },
                    onError: (error) => { toast.error(error.error.message || "Failed to resend email.") },
                }
            );
        } finally {
            setResendPending(false);
            setResendCountdown(60);
            
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = setInterval(() => {
                setResendCountdown((prev) => {
                    if (prev <= 1) {
                        if (intervalRef.current) clearInterval(intervalRef.current);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
    };
    const isPending = form.formState.isSubmitting;

    if (needsVerification) {
        return (
            <div className="flex flex-col gap-6 max-w-sm mx-auto w-full">
                <Card>
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-2">
                            <MailCheck className="h-10 w-10 text-primary" />
                        </div>
                        <CardTitle>Verify your email</CardTitle>
                        <CardDescription>
                            Your account isn't verified yet. Check your inbox for a verification link,
                            or resend it below.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <Button
                            onClick={handleResendVerification}
                            disabled={resendPending || resendCountdown > 0}
                            className="w-full"
                        >
                            {resendPending ? "Sending..." : resendCountdown > 0 ? `Resend available in ${resendCountdown}s` : "Resend verification email"}
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full"
                            onClick={() => setNeedsVerification(false)}
                        >
                            Back to login
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader className="text-center">
                    <CardTitle>Welcome Back!</CardTitle>
                    <CardDescription>Login to continue</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)}>
                            <div className="grid gap-6">
                                <div className="flex flex-col gap-4">
                                    <Button onClick={signInGithub} variant="outline" type="button" disabled={isPending}>
                                        <Image src="/logos/github.svg" alt="Github" width={20} height={20} className="dark-invert" />
                                        Continue with GitHub
                                    </Button>
                                    <Button onClick={signInGoogle} variant="outline" type="button" disabled={isPending}>
                                        <Image src="/logos/google.svg" alt="Google" width={20} height={20} />
                                        Continue with Google
                                    </Button>
                                </div>
                                <div className="grid gap-6">
                                    <FormField
                                        control={form.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Email</FormLabel>
                                                <FormControl>
                                                    <Input type="email" placeholder="example@gmail.com" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="password"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Password</FormLabel>
                                                <FormControl>
                                                    <Input type="password" placeholder="******" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="submit" className="w-full" disabled={isPending}>
                                        Login
                                    </Button>
                                </div>
                                <div className="text-center text-small">
                                    Don't have an account?{" "}
                                    <Link href="/signup" className={cn("underline underline-offset-4")}>
                                        Sign up
                                    </Link>
                                </div>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    )
}