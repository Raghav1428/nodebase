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
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCredentialByType } from "@/features/credentials/hooks/use-credentials";
import { CredentialType } from "@/generated/prisma";
import Image from "next/image";
import { Plus } from "lucide-react";
import { AddCredentialDialog } from "@/features/credentials/components/add-credential-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

const formSchema = z.object({
    credentialId: z.string().min(1, "Credential is required"),
    database: z.string().min(1, "Database is required"),
    collectionName: z.string().min(1, "Collection Name is required"),
    contextWindow: z.string().min(1, "Context Window is required"),
});

export type MongoDBFormValues = z.infer<typeof formSchema>;

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (values: MongoDBFormValues) => void;
    defaultValues?: Partial<MongoDBFormValues>;
}

export const MongoDBDialog = ({
    open,
    onOpenChange,
    onSubmit,
    defaultValues = {},
}: Props) => {

    const { data: credentials, isLoading: isLoadingCredentials } = useCredentialByType(CredentialType.MONGODB);
    const queryClient = useQueryClient();
    const trpc = useTRPC();

    const [addCredentialOpen, setAddCredentialOpen] = useState(false);

    const form = useForm<MongoDBFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            credentialId: defaultValues.credentialId || '',
            database: defaultValues.database || '',
            collectionName: defaultValues.collectionName || '',
            contextWindow: defaultValues.contextWindow || '20',
        },
    });

    useEffect(() => {
        if (open) {
            form.reset({
                credentialId:
                    defaultValues.credentialId ||
                    credentials?.[0]?.id ||
                    "",
                database: defaultValues.database || "nodebase",
                collectionName: defaultValues.collectionName || "chat_histories",
                contextWindow: defaultValues.contextWindow || '20',
            });
        }
    }, [open, defaultValues, form, credentials]);

    const handleCredentialCreated = (credentialId: string) => {
        // Invalidate credentials query to refetch the list
        queryClient.invalidateQueries(trpc.credentials.getByType.queryOptions({ type: CredentialType.MONGODB }));
        // Auto-select the newly created credential
        form.setValue("credentialId", credentialId);
    };

    const handleSubmit = (values: MongoDBFormValues) => {
        onSubmit(values);
        onOpenChange(false);
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange} >
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            MongoDB Configuration
                        </DialogTitle>
                        <DialogDescription>
                            Configure the <strong>database</strong> for this AI Agent.
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8 mt-4">

                            <FormField
                                control={form.control}
                                name="credentialId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>MongoDB Credential</FormLabel>
                                        <Select
                                            onValueChange={(value) => {
                                                if (value === "__add_new__") {
                                                    setAddCredentialOpen(true);
                                                } else {
                                                    field.onChange(value);
                                                }
                                            }}
                                            value={field.value}
                                            disabled={isLoadingCredentials}
                                        >
                                            <FormControl>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder={credentials?.length ? "Select a credential" : "No credentials - Add one"} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {credentials?.map((credential) => (
                                                    <SelectItem key={credential.id} value={credential.id}>
                                                        <div className="flex items-center gap-2">
                                                            <Image src="/logos/mongodb.svg" alt="MongoDB" width={16} height={16} />
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
                                        <FormDescription>
                                            Connection string format: mongodb://user:password@host:port
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="database"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Database</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="nodebase"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="collectionName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Collection Name</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="chat_histories"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="contextWindow"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Context Window Length</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="20"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />


                            <DialogFooter className="mt-4">
                                <Button type="submit">Save</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            <AddCredentialDialog
                open={addCredentialOpen}
                onOpenChange={setAddCredentialOpen}
                credentialType={CredentialType.MONGODB}
                onSuccess={handleCredentialCreated}
            />
        </>
    )
};
