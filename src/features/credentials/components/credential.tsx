"use client"

import React from "react";
import { CredentialType } from "@/generated/prisma";
import { useRouter } from "next/navigation";
import { useCreateCredential, useUpdateCredential, useSuspenseCredential } from "../hooks/use-credentials";
import { useUpgradeModal } from "@/hooks/use-upgrade-modal";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import z from "zod";
import Image from "next/image";
import Link from "next/link";
import { getLogoClassName } from "@/lib/logo-utils";


const formSchema = z.object({
    name: z.string().min(1, "Name is Required"),
    type: z.enum(CredentialType),
    value: z.string().min(1, "Value is Required"),
})

interface CredentialFormProps {
    initialData?: {
        id?: string;
        name: string;
        type: CredentialType;
        value: string;
    }
};

type FormValues = z.infer<typeof formSchema>;

const credentialTypeOptions = [
    {
        value: CredentialType.ANTHROPIC,
        label: "Anthropic",
        logo: "/logos/anthropic.svg"
    },
    {
        value: CredentialType.GEMINI,
        label: "Google Gemini",
        logo: "/logos/gemini.svg"
    },
    {
        value: CredentialType.OPENAI,
        label: "OpenAI",
        logo: "/logos/openai.svg"
    },
    {
        value: CredentialType.OPENROUTER,
        label: "OpenRouter",
        logo: "/logos/openrouter.svg"
    },
    {
        value: CredentialType.POSTGRES,
        label: "PostgreSQL",
        logo: "/logos/postgres.svg"
    },
    {
        value: CredentialType.MONGODB,
        label: "MongoDB",
        logo: "/logos/mongodb.svg"
    },
    {
        value: CredentialType.EMAIL_GMAIL,
        label: "Gmail (App Password)",
        logo: "/logos/google.svg"
    },
    {
        value: CredentialType.EMAIL_SMTP,
        label: "SMTP Email",
        logo: "/logos/email.svg"
    }
]

const getNameHelperText = (type: CredentialType) => {
    switch (type) {
        case CredentialType.POSTGRES:
            return "Enter your PostgreSQL username";
        case CredentialType.EMAIL_GMAIL:
            return "Your Gmail address (e.g., you@gmail.com)";
        case CredentialType.EMAIL_SMTP:
            return "A friendly name to identify this SMTP credential";
        default:
            return undefined;
    }
};

const getValueHelperText = (type: CredentialType) => {
    switch (type) {
        case CredentialType.POSTGRES:
            return "Enter your PostgreSQL password";
        case CredentialType.MONGODB:
            return "Full connection string: mongodb+srv://user:password@cluster.mongodb.net";
        case CredentialType.EMAIL_GMAIL:
            return "16-character app password from Google Account → Security → App passwords";
        case CredentialType.EMAIL_SMTP:
            return undefined; // Handled by specific fields
        default:
            return undefined;
    }
};

const getValuePlaceholder = (type: CredentialType) => {
    switch (type) {
        case CredentialType.GEMINI:
            return "Paste your API Key here";
        case CredentialType.ANTHROPIC:
            return "Paste your API Key here";
        case CredentialType.OPENAI:
            return "Paste your API Key here";
        case CredentialType.OPENROUTER:
            return "Paste your API Key here";
        case CredentialType.POSTGRES:
            return "Your PostgreSQL password";
        case CredentialType.MONGODB:
            return "mongodb+srv://user:password@cluster.mongodb.net";
        case CredentialType.EMAIL_GMAIL:
            return "xxxx xxxx xxxx xxxx (16-character app password)";
        case CredentialType.EMAIL_SMTP:
            return ""; // Handled separately
        default:
            return "Paste your API Key here";
    }
};

const getNamePlaceholder = (type: CredentialType) => {
    switch (type) {
        case CredentialType.POSTGRES:
            return "postgres_user";
        case CredentialType.EMAIL_GMAIL:
            return "your-email@gmail.com";
        case CredentialType.EMAIL_SMTP:
            return "My SMTP Server";
        default:
            return "Credential Name";
    }
};

// SMTP Configuration Interface
interface SmtpConfig {
    host: string;
    port: number;
    username: string;
    password: string;
    from: string;
    secure: boolean;
}

const defaultSmtpConfig: SmtpConfig = {
    host: "",
    port: 587,
    username: "",
    password: "",
    from: "",
    secure: false,
};

export const CredentialForm = ({
    initialData
}: CredentialFormProps) => {
    
    const router = useRouter();
    const createCredential = useCreateCredential();
    const updateCredential = useUpdateCredential();
    const { handleError, modal } = useUpgradeModal();

    const isEdit = !!initialData?.id;

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: initialData || {
            name: "",
            type: CredentialType.GEMINI,
            value: "",
        },
    });

    const watchType = form.watch("type");
    const watchValue = form.watch("value");

    // Local state for SMTP fields
    const [smtpConfig, setSmtpConfig] = React.useState<SmtpConfig>(defaultSmtpConfig);

    // Effect to parse initial value or update when switching to SMTP
    React.useEffect(() => {
        if (watchType === CredentialType.EMAIL_SMTP) {
            if (watchValue && typeof watchValue === 'string' && watchValue.length > 0) {
                try {
                    // Try to parse existing value
                    const parsed = JSON.parse(watchValue);
                    // Validate minimal shape (simple check)
                    if (typeof parsed === 'object' && parsed !== null) {
                        setSmtpConfig({ ...defaultSmtpConfig, ...parsed });
                    }
                } catch (e) {
                    setSmtpConfig(defaultSmtpConfig);
                }
            }
        }
    }, [watchType, watchValue]); // Only run when type changes, or on mount (if type is SMTP)

    // Helper to update specific SMTP field and sync to form value
    const updateSmtpField = (field: keyof SmtpConfig, value: any) => {
        const newConfig = { ...smtpConfig, [field]: value };
        setSmtpConfig(newConfig);
        form.setValue("value", JSON.stringify(newConfig));
    };

    const onSubmit = async (values: FormValues) => {
        if (isEdit && initialData?.id) {
            try {
                await updateCredential.mutateAsync({
                    id: initialData?.id,
                    ...values,
                });
                router.push("/credentials");
            } catch (error) {
                handleError(error);
            }
        } else {
            await createCredential.mutateAsync(values,{
                onSuccess: () => {
                    router.push("/credentials");
                },
                onError: (error) => {
                    handleError(error);
                }
            });
        }
    }

    return (
        <>
            {modal}
            <Card>
                <CardHeader>
                    <CardTitle>{isEdit ? "Edit Credential" : "Create New Credential"}</CardTitle>
                    <CardDescription>
                        {isEdit ? "Update your API key or credential data" : "Add a new API key or credential to your account"}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Type</FormLabel>
                                            <Select onValueChange={(val) => {
                                                field.onChange(val);
                                                // Clear value if switching types (optional, but good for cleanliness)
                                                // form.setValue("value", ""); 
                                            }} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Select a type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {credentialTypeOptions.map((option) => (
                                                        <SelectItem key={option.value} value={option.value}>
                                                            <div className="flex items-center gap-2">
                                                                <Image src={option.logo} alt={option.label} width={16} height={16} className={getLogoClassName(option.logo)} />
                                                                <span>{option.label}</span>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                         <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            {watchType === CredentialType.POSTGRES ? "Username" : "Name"}
                                        </FormLabel>
                                        <FormControl>
                                            <Input placeholder={getNamePlaceholder(watchType)} {...field} />
                                        </FormControl>
                                        {getNameHelperText(watchType) && (
                                            <FormDescription>{getNameHelperText(watchType)}</FormDescription>
                                        )}
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            {watchType === CredentialType.EMAIL_SMTP ? (
                                <div className="space-y-4 border p-4 rounded-md bg-slate-50 dark:bg-slate-900">
                                    <h3 className="font-medium text-sm">SMTP Configuration</h3>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <FormLabel>Host</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    value={smtpConfig.host}
                                                    onChange={(e) => updateSmtpField("host", e.target.value)}
                                                    placeholder="smtp.example.com"
                                                />
                                            </FormControl>
                                        </div>
                                        <div className="space-y-2">
                                            <FormLabel>Port</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    type="number"
                                                    value={smtpConfig.port}
                                                    onChange={(e) => {
                                                        const rawValue = e.target.value;
                                                        if (rawValue === "") {
                                                            // allow empty input to let user delete the value
                                                            updateSmtpField("port", undefined);
                                                            return;
                                                        }
                                                        const val = parseInt(rawValue);
                                                        if (!isNaN(val)) {
                                                            // Clamp to valid port range
                                                            const clamped = Math.max(1, Math.min(65535, val));
                                                            updateSmtpField("port", clamped);
                                                        }
                                                    }}
                                                    placeholder="587"
                                                />
                                            </FormControl>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <FormLabel>Username</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    value={smtpConfig.username}
                                                    onChange={(e) => updateSmtpField("username", e.target.value)}
                                                    placeholder="user@example.com"
                                                />
                                            </FormControl>
                                        </div>
                                        <div className="space-y-2">
                                            <FormLabel>Password</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    type="password"
                                                    value={smtpConfig.password}
                                                    onChange={(e) => updateSmtpField("password", e.target.value)}
                                                    placeholder="••••••••"
                                                />
                                            </FormControl>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <FormLabel>From Address</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    value={smtpConfig.from}
                                                    onChange={(e) => updateSmtpField("from", e.target.value)}
                                                    placeholder="sender@example.com"
                                                />
                                            </FormControl>
                                        </div>
                                         <div className="space-y-2 flex flex-col justify-end pb-2">
                                            <div className="flex items-center space-x-2">
                                                <input 
                                                    type="checkbox" 
                                                    id="secure"
                                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                    checked={smtpConfig.secure}
                                                    onChange={(e) => updateSmtpField("secure", e.target.checked)}
                                                />
                                                <label 
                                                    htmlFor="secure" 
                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                                >
                                                    Secure Connection (SSL/TLS)
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Hidden input to ensure validation works if needed, though we update value manually */}
                                </div>
                            ) : (
                                <FormField
                                    control={form.control}
                                    name="value"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                {watchType === CredentialType.POSTGRES ? "Password" : 
                                                 watchType === CredentialType.MONGODB ? "Connection String" : "Value"}
                                            </FormLabel>
                                            <FormControl>
                                                <Input type="password" placeholder={getValuePlaceholder(watchType)} {...field} />
                                            </FormControl>
                                            {getValueHelperText(watchType) && (
                                                <FormDescription>{getValueHelperText(watchType)}</FormDescription>
                                            )}
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            <div className="flex gap-4">
                                <Button
                                    type="submit"
                                    disabled={createCredential.isPending || updateCredential.isPending}
                                >
                                    {isEdit ? "Update" : "Create"}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    asChild
                                >
                                    <Link href="/credentials" prefetch>
                                        Cancel
                                    </Link>
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </>
    )
};

export const CredentialView = ({credentialId}: {credentialId: string}) => {

    const { data: credential } = useSuspenseCredential(credentialId);

    return <CredentialForm initialData={credential}/>

};