"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
import { authClient } from "@/lib/auth-client";
import Image from "next/image";

const LoginSchema = z.object({
    email: z.email("Please enter a valid email address"),
    password: z.string().min(1,"Password is required"),
});

type LoginFormValues = z.infer<typeof LoginSchema>;

export function LoginForm() {
    const router = useRouter();
    const form = useForm<LoginFormValues>({
        resolver: zodResolver(LoginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    const signInGithub = async () => {
    const data = await authClient.signIn.social({
        provider: "github"
    }, {
        onSuccess: () => {
            router.push("/workflows");
        },
        onError: (error) => {
            toast.error(error.error.message || "Something went wrong");
        },
    });
    };

    const signInGoogle = async () => {
    const data = await authClient.signIn.social({
        provider: "google"
    }, {
        onSuccess: () => {
            router.push("/workflows");
        },
        onError: (error) => {
            toast.error(error.error.message || "Something went wrong");
        },
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
                onSuccess: () => {
                    router.push("/workflows");
                },
                onError: (error) => {
                    toast.error(error.error.message || "Something went wrong");
                },
            }
        )
    };

    const isPending = form.formState.isSubmitting;

    return (
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader className="text-center">
                    <CardTitle>
                        Welcome Back!
                    </CardTitle>
                    <CardDescription>
                        Login to continue
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)}>
                            <div className="grid gap-6">
                                <div className="flex flex-col gap-4">
                                    <Button 
                                        onClick={signInGithub}
                                        variant="outline"
                                        className="w-fulll"
                                        type="button"
                                        disabled={isPending}>
                                        <Image src="/logos/github.svg" alt="Github" width={20} height={20} />
                                        Continue with GitHub
                                    </Button>
                                    <Button 
                                        onClick={signInGoogle}
                                        variant="outline"
                                        className="w-fulll"
                                        type="button"
                                        disabled={isPending}>
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