"use client"

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


const formSchema = z.object({
    name: z.string().min(1, "Name is Required"),
    type: z.enum(CredentialType),
    value: z.string().min(1, "API Key is Required"),
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
    }
]

const getNameHelperText = (type: CredentialType) => {
    switch (type) {
        case CredentialType.POSTGRES:
            return "Enter your PostgreSQL username";
        case CredentialType.MONGODB:
            return "A friendly name to identify this credential";
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
        default:
            return undefined;
    }
};

const getValuePlaceholder = (type: CredentialType) => {
    switch (type) {
        case CredentialType.POSTGRES:
            return "Your PostgreSQL password";
        case CredentialType.MONGODB:
            return "mongodb+srv://user:password@cluster.mongodb.net";
        default:
            return "Paste your API Key here";
    }
};

const getNamePlaceholder = (type: CredentialType) => {
    switch (type) {
        case CredentialType.POSTGRES:
            return "postgres_user";
        default:
            return "Credential Name";
    }
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
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Select a type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {credentialTypeOptions.map((option) => (
                                                        <SelectItem key={option.value} value={option.value}>
                                                            <div className="flex items-center gap-2">
                                                                <Image src={option.logo} alt={option.label} width={16} height={16} />
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