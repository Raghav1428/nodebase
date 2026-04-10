"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
import { authClient } from "@/lib/auth-client";
import { MailCheck } from "lucide-react";

const ForgotPasswordSchema = z.object({
    email: z.email("Please enter a valid email address"),
});

type ForgotPasswordFormValues = z.infer<typeof ForgotPasswordSchema>;

export function ForgotPasswordForm() {
    const [isSubmitted, setIsSubmitted] = useState(false);

    const form = useForm<ForgotPasswordFormValues>({
        resolver: zodResolver(ForgotPasswordSchema),
        defaultValues: {
            email: "",
        },
    });

    const onSubmit = async (values: ForgotPasswordFormValues) => {
        await authClient.forgetPassword(
            {
                email: values.email,
                redirectTo: "/reset-password",
            },
            {
                onSuccess: () => {
                    setIsSubmitted(true);
                    toast.success("Password reset email sent! Check your inbox.");
                },
                onError: (error) => {
                    toast.error(error.error.message || "Failed to send reset code");
                },
            }
        );
    };

    const isPending = form.formState.isSubmitting;

    if (isSubmitted) {
        return (
            <div className="flex flex-col gap-6 max-w-sm mx-auto w-full">
                <Card>
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-2">
                            <MailCheck className="h-10 w-10 text-primary" />
                        </div>
                        <CardTitle>Check your email</CardTitle>
                        <CardDescription>
                            We have sent a password reset link to your email.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <Link href="/login" className="w-full">
                            <Button variant="outline" className="w-full">
                                Back to login
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 max-w-sm mx-auto w-full">
            <Card>
                <CardHeader className="text-center">
                    <CardTitle>Forgot Password</CardTitle>
                    <CardDescription>
                        Enter your email address and we will send you a link to reset your password.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                            <Button type="submit" className="w-full" disabled={isPending}>
                                Send reset link
                            </Button>
                            <div className="text-center text-sm">
                                Remember your password?{" "}
                                <Link href="/login" className={cn("underline underline-offset-4")}>
                                    Login
                                </Link>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
