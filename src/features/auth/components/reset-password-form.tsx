"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
import { authClient } from "@/lib/auth-client";
import { CheckCircle2 } from "lucide-react";

const ResetPasswordSchema = z.object({
    password: z.string().min(8, "Password must be at least 8 characters long"),
    confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

type ResetPasswordFormValues = z.infer<typeof ResetPasswordSchema>;

function ResetPasswordFormInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const [isSuccess, setIsSuccess] = useState(false);

    const form = useForm<ResetPasswordFormValues>({
        resolver: zodResolver(ResetPasswordSchema),
        defaultValues: {
            password: "",
            confirmPassword: "",
        },
    });

    const onSubmit = async (values: ResetPasswordFormValues) => {
        if (!token) {
            toast.error("Invalid or missing reset token");
            return;
        }

        await authClient.resetPassword(
            {
                newPassword: values.password,
                token: token,
            },
            {
                onSuccess: () => {
                    setIsSuccess(true);
                    toast.success("Password reset successfully. You can now login.");
                },
                onError: (error) => {
                    toast.error(error.error.message || "Failed to reset password");
                },
            }
        );
    };

    const isPending = form.formState.isSubmitting;

    if (isSuccess) {
        return (
            <div className="flex flex-col gap-6 max-w-sm mx-auto w-full">
                <Card>
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-2">
                            <CheckCircle2 className="h-10 w-10 text-primary" />
                        </div>
                        <CardTitle>Password Reset Complete</CardTitle>
                        <CardDescription>
                            Your password has been reset successfully.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <Link href="/login" className="w-full">
                            <Button className="w-full">
                                Go to login
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!token) {
        return (
            <div className="flex flex-col gap-6 max-w-sm mx-auto w-full">
                <Card>
                    <CardHeader className="text-center">
                        <CardTitle className="text-red-500">Invalid Link</CardTitle>
                        <CardDescription>
                            The password reset link is invalid or has expired.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <Link href="/forgot-password" className="w-full">
                            <Button variant="outline" className="w-full">
                                Request a new link
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
                    <CardTitle>Reset Password</CardTitle>
                    <CardDescription>
                        Enter your new password below.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>New Password</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder="******" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Confirm Password</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder="******" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full" disabled={isPending}>
                                Reset Password
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}

export function ResetPasswordForm() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ResetPasswordFormInner />
        </Suspense>
    );
}
