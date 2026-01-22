"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getAvailableOpenRouterModels } from "./actions";
import { useCredentialByType } from "@/features/credentials/hooks/use-credentials";
import { CredentialType } from "@/generated/prisma";
import Image from "next/image";
import { Plus } from "lucide-react";
import { AddCredentialDialog } from "@/features/credentials/components/add-credential-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";


const formSchema = z.object({
    credentialId: z.string().min(1, "Credential is required"),
    model: z.string().min(1, "Model is required"),
    systemPrompt: z.string().optional(),
    userPrompt: z.string().min(1, "User prompt is required"),
});

export type OpenRouterChatModelFormValues = z.infer<typeof formSchema>;

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (values: OpenRouterChatModelFormValues) => void;
    defaultValues?: Partial<OpenRouterChatModelFormValues>;
}

export const OpenRouterChatModelDialog = ({
    open,
    onOpenChange,
    onSubmit,
    defaultValues = {},
}: Props) => {

    const { data: credentials, isLoading: isLoadingCredentials } = useCredentialByType(CredentialType.OPENROUTER);
    const queryClient = useQueryClient();
    const trpc = useTRPC();

    const [models, setModels] = useState<string[]>([]);
    const [isLoadingModels, setIsLoadingModels] = useState(false);
    const [addCredentialOpen, setAddCredentialOpen] = useState(false);

    const form = useForm<OpenRouterChatModelFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            credentialId: defaultValues.credentialId || '',
            model: defaultValues.model || "openai/gpt-4o-mini",
            systemPrompt: defaultValues.systemPrompt || '',
            userPrompt: defaultValues.userPrompt || '',
        },
    });

    const selectedCredentialId = form.watch("credentialId");

    useEffect(() => {
        if (open) {
            form.reset({
                credentialId:
                    defaultValues.credentialId ||
                    credentials?.[0]?.id || // optional: auto-select first credential
                    "",
                model: defaultValues.model || "",
                systemPrompt: defaultValues.systemPrompt || "",
                userPrompt: defaultValues.userPrompt || "",
            });
        }
    }, [open, defaultValues, form, credentials]);

    useEffect(() => {
        const loadModels = async (credentialId: string) => {
            setIsLoadingModels(true);
            try {
                const fetchedModels = await getAvailableOpenRouterModels(
                    credentialId,
                );
                setModels(fetchedModels);

                const currentModel = form.getValues("model");
                // If no model or current not in list, default to first available
                if (
                    fetchedModels.length > 0 &&
                    (!currentModel || !fetchedModels.includes(currentModel))
                ) {
                    form.setValue("model", fetchedModels[0]);
                }
            } catch (err) {
                setModels([]);
            } finally {
                setIsLoadingModels(false);
            }
        };

        if (selectedCredentialId) {
            loadModels(selectedCredentialId);
        } else {
            // if credential cleared, also clear models + model field
            setModels([]);
            form.setValue("model", "");
        }
    }, [selectedCredentialId, form]);

    const handleCredentialCreated = (credentialId: string) => {
        // Invalidate credentials query to refetch the list
        queryClient.invalidateQueries(trpc.credentials.getByType.queryOptions({ type: CredentialType.OPENROUTER }));
        // Auto-select the newly created credential
        form.setValue("credentialId", credentialId);
    };

    const handleSubmit = (values: OpenRouterChatModelFormValues) => {
        onSubmit(values);
        onOpenChange(false);
    };


    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange} >
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            OpenRouter Chat Model Configuration
                        </DialogTitle>
                        <DialogDescription>
                            Configure the <strong>prompt and model</strong> for this node.
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8 mt-4">

                            <FormField
                                control={form.control}
                                name="credentialId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>OpenRouter Credential</FormLabel>
                                        <Select
                                            onValueChange={(value) => {
                                                if (value === "__add_new__") {
                                                    setAddCredentialOpen(true);
                                                } else {
                                                    field.onChange(value);
                                                }
                                            }}
                                            value={field.value || undefined}
                                            disabled={isLoadingCredentials}
                                        >
                                            <FormControl>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder={!field.value && credentials?.length ? "No credential selected" : credentials?.length ? "Select a credential" : "No credentials - Add one"} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {credentials?.map((credential) => (
                                                    <SelectItem key={credential.id} value={credential.id}>
                                                        <div className="flex items-center gap-2">
                                                            <Image src="/logos/openrouter.svg" alt="OpenRouter" width={16} height={16} className="dark:invert" />
                                                            <span>{credential.name}</span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                                <SelectItem value="__add_new__" className="hover:text-primary">
                                                    <div className="flex items-center gap-2">
                                                        <Plus className="h-4 w-4" />
                                                        <span>Add new credential...</span>
                                                    </div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="model"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Model</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder={isLoadingModels ? "Loading models..." : "Select a model"} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {models.map((model) => (
                                                    <SelectItem key={model} value={model}>
                                                        {model}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>
                                            Select the model to use for this node.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="systemPrompt"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>System Prompt (Optional)</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="You are a helpful assistant"
                                                {...field}
                                                className="min-h-[80px] font-mono text-sm"
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Sets the behavior of the model. Use {"{{variables}}"} for simple values or {"{{json variable}}"} to stringify objects.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="userPrompt"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>User Prompt</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Summarize the following text: {{json httpResponse.data}}"
                                                {...field}
                                                className="min-h-[100px] font-mono text-sm"
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            The prompt to send to the model. Use {"{{variables}}"} for simple values or {"{{json variable}}"} to stringify objects.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <DialogFooter className="mt-4">
                                <Button type="submit" disabled={isLoadingModels || !selectedCredentialId}>Save</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            <AddCredentialDialog
                open={addCredentialOpen}
                onOpenChange={setAddCredentialOpen}
                credentialType={CredentialType.OPENROUTER}
                onSuccess={handleCredentialCreated}
            />
        </>
    )
};