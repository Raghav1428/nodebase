"use client";

import { CredentialType } from "@/generated/prisma";
import { useCreateCredential } from "../hooks/use-credentials";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import z from "zod";
import Image from "next/image";
import { getLogoClassName } from "@/lib/logo-utils";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
    name: z.string().min(1, "Name is required"),
    value: z.string().min(1, "API Key is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface AddCredentialDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    credentialType: CredentialType;
    onSuccess?: (credentialId: string) => void;
}

const credentialTypeConfig: Record<CredentialType, { label: string; logo: string; valuePlaceholder: string; valueLabel: string; valueHelperText?: string; nameLabel?: string; nameHelperText?: string; namePlaceholder?: string }> = {
    [CredentialType.GEMINI]: {
        label: "Google Gemini",
        logo: "/logos/gemini.svg",
        valuePlaceholder: "Paste your Gemini API Key here",
        valueLabel: "API Key",
    },
    [CredentialType.OPENAI]: {
        label: "OpenAI",
        logo: "/logos/openai.svg",
        valuePlaceholder: "Paste your OpenAI API Key here",
        valueLabel: "API Key",
    },
    [CredentialType.ANTHROPIC]: {
        label: "Anthropic",
        logo: "/logos/anthropic.svg",
        valuePlaceholder: "Paste your Anthropic API Key here",
        valueLabel: "API Key",
    },
    [CredentialType.OPENROUTER]: {
        label: "OpenRouter",
        logo: "/logos/openrouter.svg",
        valuePlaceholder: "Paste your OpenRouter API Key here",
        valueLabel: "API Key",
    },
    [CredentialType.POSTGRES]: {
        label: "PostgreSQL",
        logo: "/logos/postgres.svg",
        valuePlaceholder: "Your PostgreSQL password",
        valueLabel: "Password",
        valueHelperText: "Enter your PostgreSQL password",
        nameLabel: "Username",
        nameHelperText: "Your PostgreSQL database username",
        namePlaceholder: "postgres",
    },
    [CredentialType.MONGODB]: {
        label: "MongoDB",
        logo: "/logos/mongodb.svg",
        valuePlaceholder: "mongodb+srv://user:password@cluster.mongodb.net",
        valueLabel: "Connection String",
        valueHelperText: "Full connection string: mongodb+srv://user:password@cluster.mongodb.net",
    },
    [CredentialType.EMAIL_GMAIL]: {
        label: "Gmail (App Password)",
        logo: "/logos/google.svg",
        valuePlaceholder: "xxxx xxxx xxxx xxxx (16-character app password)",
        valueLabel: "App Password",
        valueHelperText: "16-character app password from Google Account → Security → App passwords",
    },
    [CredentialType.EMAIL_SMTP]: {
        label: "SMTP Email",
        logo: "/logos/email.svg",
        valuePlaceholder: "",
        valueLabel: "Configuration",
    },
    [CredentialType.GOOGLE_SHEETS]: {
        label: "Google Sheets",
        logo: "/logos/google.svg",
        valuePlaceholder: "",
        valueLabel: "OAuth",
    },
    [CredentialType.STRIPE]: {
        label: "Stripe",
        logo: "/logos/stripe.svg",
        valuePlaceholder: "whsec_...",
        valueLabel: "Webhook Secret",
        valueHelperText: "Found in Stripe Dashboard → Developers → Webhooks → Signing secret",
    },
};

export const AddCredentialDialog = ({
    open,
    onOpenChange,
    credentialType,
    onSuccess,
}: AddCredentialDialogProps) => {
    const createCredential = useCreateCredential();
    const config = credentialTypeConfig[credentialType];
    const queryClient = useQueryClient();
    const trpc = useTRPC();
    const [oauthOpened, setOauthOpened] = useState(false);
    const nameInputRef = useRef<HTMLInputElement>(null);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            value: "",
        },
    });

    // Reset form and OAuth state when dialog opens
    useEffect(() => {
        if (open) {
            form.reset();
            setOauthOpened(false);
            // Auto-focus first input after a short delay to ensure dialog is rendered
            const timer = setTimeout(() => {
                nameInputRef.current?.focus();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [open, form]);

    const handleSubmit = async (values: FormValues) => {
        try {
            const result = await createCredential.mutateAsync({
                name: values.name,
                type: credentialType,
                value: values.value,
            });

            form.reset();
            onOpenChange(false);
            onSuccess?.(result.id);
        } catch (error) {
            // Error is handled by the mutation's onError callback
        }
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            form.reset();
            setOauthOpened(false);
        }
        onOpenChange(newOpen);
    };

    // For Google Sheets OAuth: poll for new credentials after OAuth was opened
    useEffect(() => {
        if (credentialType !== CredentialType.GOOGLE_SHEETS || !open || !oauthOpened) {
            return;
        }

        const handleFocus = () => {
            // Invalidate the query to refresh credentials list
            queryClient.invalidateQueries(trpc.credentials.getByType.queryOptions({ type: CredentialType.GOOGLE_SHEETS }));
        };

        // Poll for credentials every 2 seconds when OAuth is opened
        const pollInterval = setInterval(() => {
            queryClient.invalidateQueries(trpc.credentials.getByType.queryOptions({ type: CredentialType.GOOGLE_SHEETS }));
        }, 2000);

        // Also listen for window focus
        window.addEventListener('focus', handleFocus);

        return () => {
            clearInterval(pollInterval);
            window.removeEventListener('focus', handleFocus);
        };
    }, [credentialType, open, oauthOpened, queryClient, trpc]);

    if (credentialType === CredentialType.GOOGLE_SHEETS) {
        return (
            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Image
                                src={config.logo}
                                alt={config.label}
                                width={24}
                                height={24}
                                className={getLogoClassName(config.logo)}
                            />
                            Add {config.label} Credential
                        </DialogTitle>
                        <DialogDescription>
                            Connect your Google account to allow the application to create and edit spreadsheets on your behalf.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setOauthOpened(true);
                                window.open("/api/auth/google-sheets", "_blank");
                            }}
                            className="w-full bg-white hover:bg-gray-50 text-gray-700 border-gray-300"
                        >
                            <Image src="/logos/google.svg" alt="Google" width={20} height={20} className="mr-2" />
                            Connect Google Account
                        </Button>
                        <p className="text-xs text-muted-foreground mt-3">
                            A new tab will open for Google authorization. After connecting, return here and the credentials will refresh automatically.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleOpenChange(false)}
                        >
                            Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    // For SMTP, we'll need a more complex form - for now redirect to full form
    if (credentialType === CredentialType.EMAIL_SMTP) {
        return (
            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Image
                                src={config.logo}
                                alt={config.label}
                                width={24}
                                height={24}
                                className={getLogoClassName(config.logo)}
                            />
                            Add {config.label} Credential
                        </DialogTitle>
                        <DialogDescription>
                            SMTP credentials require additional configuration fields.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Button
                            type="button"
                            onClick={() => {
                                window.open("/credentials/new", "_blank");
                            }}
                            className="w-full"
                        >
                            Open Credential Form
                        </Button>
                        <p className="text-xs text-muted-foreground mt-3">
                            This will open the full credential form in a new tab where you can configure all SMTP settings.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleOpenChange(false)}
                        >
                            Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Image
                            src={config.logo}
                            alt={config.label}
                            width={24}
                            height={24}
                            className={getLogoClassName(config.logo)}
                        />
                        Add {config.label} Credential
                    </DialogTitle>
                    <DialogDescription>
                        Create a new credential to use with this node.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{config.nameLabel || "Name"}</FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            ref={(e) => {
                                                field.ref(e);
                                                nameInputRef.current = e;
                                            }}
                                            placeholder={config.namePlaceholder || `My ${config.label} Credential`}
                                            disabled={createCredential.isPending}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        {config.nameHelperText || "A friendly name to identify this credential"}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="value"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{config.valueLabel}</FormLabel>
                                    <FormControl>
                                        {credentialType === CredentialType.MONGODB ? (
                                            <Textarea
                                                placeholder={config.valuePlaceholder}
                                                disabled={createCredential.isPending}
                                                className="font-mono text-sm"
                                                rows={3}
                                                {...field}
                                            />
                                        ) : (
                                            <Input
                                                type="password"
                                                placeholder={config.valuePlaceholder}
                                                disabled={createCredential.isPending}
                                                {...field}
                                            />
                                        )}
                                    </FormControl>
                                    {config.valueHelperText && (
                                        <FormDescription>
                                            {config.valueHelperText}
                                        </FormDescription>
                                    )}
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleOpenChange(false)}
                                disabled={createCredential.isPending}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={createCredential.isPending}>
                                {createCredential.isPending && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Create
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};
