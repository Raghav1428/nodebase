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
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCredentialByType } from "@/features/credentials/hooks/use-credentials";
import { CredentialType } from "@/generated/prisma";
import Image from "next/image";
import Link from "next/link";
import { ExternalLinkIcon, TableIcon, ListIcon, LayersIcon, CopyIcon, CheckIcon } from "lucide-react";

const formSchema = z.object({
    variableName: z
        .string()
        .min(1, "Variable name is required")
        .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, { message: "Variable name must start with a letter or underscore and can only contain letters, numbers, and underscores" }),
    credentialId: z.string().min(1, "Google Sheets credential is required"),
    operation: z.enum(["create", "append"]),
    spreadsheetTitle: z.string().optional(),
    spreadsheetId: z.string().optional(),
    dataVariable: z.string().min(1, "Data variable is required"),
});

export type GoogleSheetsFormValues = z.infer<typeof formSchema>;

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (values: GoogleSheetsFormValues) => void;
    defaultValues?: Partial<GoogleSheetsFormValues>;
}

const PromptItem = ({ icon, label, prompt }: { icon: React.ReactNode; label: string; prompt: string }) => {
    const [copied, setCopied] = useState(false);
    
    const handleCopy = async () => {
        await navigator.clipboard.writeText(prompt);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    
    return (
        <div>
            <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    {icon} {label}
                </p>
                <button
                    type="button"
                    onClick={handleCopy}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-background"
                >
                    {copied ? <CheckIcon className="size-3" /> : <CopyIcon className="size-3" />}
                </button>
            </div>
            <code className="block bg-background px-2 py-2 rounded text-[10px] leading-relaxed">
                {prompt}
            </code>
        </div>
    );
};

export const GoogleSheetsDialog = ({
    open,
    onOpenChange,
    onSubmit,
    defaultValues = {},
}: Props) => {

    const { data: credentials, isLoading: isLoadingCredentials } = useCredentialByType(CredentialType.GOOGLE_SHEETS);

    const form = useForm<GoogleSheetsFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            variableName: defaultValues.variableName || '',
            credentialId: defaultValues.credentialId || '',
            operation: defaultValues.operation || 'create',
            spreadsheetTitle: defaultValues.spreadsheetTitle || '',
            spreadsheetId: defaultValues.spreadsheetId || '',
            dataVariable: defaultValues.dataVariable || '',
        },
    });

    const watchVariableName = form.watch("variableName") || "sheetsOutput";
    const watchOperation = form.watch("operation");

    useEffect(() => {
        if (open) {
            form.reset({
                variableName: defaultValues.variableName || "",
                credentialId: defaultValues.credentialId || credentials?.[0]?.id || "",
                operation: defaultValues.operation || "create",
                spreadsheetTitle: defaultValues.spreadsheetTitle || "",
                spreadsheetId: defaultValues.spreadsheetId || "",
                dataVariable: defaultValues.dataVariable || "",
            });
        }
    }, [open, defaultValues, credentials]);

    const handleSubmit = (values: GoogleSheetsFormValues) => {
        onSubmit(values);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        Google Sheets Configuration
                    </DialogTitle>
                    <DialogDescription>
                        Export workflow data to a Google Spreadsheet
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 mt-4">
                        <FormField 
                            control={form.control}
                            name="variableName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Variable Name</FormLabel>
                                    <FormControl>
                                        <Input 
                                            placeholder="sheetsOutput" 
                                            {...field} 
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Access output via: {`{{${watchVariableName}.spreadsheetUrl}}`}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="credentialId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Google Account</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingCredentials}>
                                        <FormControl>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder={credentials?.length ? "Select account" : "No accounts connected"} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {credentials?.map((credential) => (
                                                <SelectItem key={credential.id} value={credential.id}>
                                                    <div className="flex items-center gap-2">
                                                        <Image 
                                                            src="/logos/google.svg" 
                                                            alt="Google Sheets" 
                                                            width={16} 
                                                            height={16} 
                                                        />
                                                        <span>{credential.name}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {(!credentials || credentials.length === 0) && (
                                        <FormDescription>
                                            <Link 
                                                href="/api/auth/google-sheets" 
                                                className="text-primary hover:underline inline-flex items-center gap-1"
                                            >
                                                Connect Google Account <ExternalLinkIcon className="size-3" />
                                            </Link>
                                        </FormDescription>
                                    )}
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="operation"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Operation</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="w-full">
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="create">Create New Spreadsheet</SelectItem>
                                            <SelectItem value="append">Append to Existing</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {watchOperation === "create" && (
                            <FormField 
                                control={form.control}
                                name="spreadsheetTitle"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Spreadsheet Title</FormLabel>
                                        <FormControl>
                                            <Input 
                                                placeholder="My Workflow Data" 
                                                {...field} 
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Supports variables: {`{{trigger.name}}`}
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {watchOperation === "append" && (
                            <FormField 
                                control={form.control}
                                name="spreadsheetId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Spreadsheet ID</FormLabel>
                                        <FormControl>
                                            <Input 
                                                placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms" 
                                                {...field} 
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Find in spreadsheet URL: docs.google.com/spreadsheets/d/<strong>ID</strong>/edit
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                        
                        <FormField 
                            control={form.control}
                            name="dataVariable"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Data Variable</FormLabel>
                                    <FormControl>
                                        <Input 
                                            placeholder="gemini.geminiResponse" 
                                            {...field} 
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Path to data from a previous node (e.g., <code>gemini.geminiResponse</code>)
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="rounded-lg bg-muted p-4 space-y-3">
                            <h4 className="font-medium text-sm">Supported Data Formats</h4>
                            <ul className="text-xs text-muted-foreground space-y-1.5">
                                <li>
                                    <strong>Array of objects</strong> → Table with headers
                                </li>
                                <li>
                                    <strong>Simple array</strong> → One item per row
                                </li>
                                <li>
                                    <strong>Plain text</strong> → Single cell
                                </li>
                            </ul>
                        </div>

                        <div className="rounded-lg bg-muted p-4 space-y-3">
                            <h4 className="font-medium text-sm">Sample System Prompts</h4>
                            <div className="space-y-3">
                                <PromptItem 
                                    icon={<TableIcon className="size-3" />}
                                    label="For a data table:"
                                    prompt='Output ONLY a valid JSON array of objects. Each object must have the same keys. Example format: [{"name":"...", "value":"...", "status":"..."}, ...]. No explanation, just JSON.'
                                />
                                <PromptItem 
                                    icon={<ListIcon className="size-3" />}
                                    label="For a simple list:"
                                    prompt='Output ONLY a valid JSON array of strings. Example: ["Item 1", "Item 2", "Item 3"]. No explanation, just the JSON array.'
                                />
                                <PromptItem 
                                    icon={<LayersIcon className="size-3" />}
                                    label="For grouped/categorized data:"
                                    prompt='Output ONLY a valid JSON array of objects with a "category" field for grouping. Example: [{"category":"Group A", "name":"...", "price":"..."}, ...]. No explanation.'
                                />
                            </div>
                        </div>
                        
                        <DialogFooter className="mt-4">
                            <Button type="submit">Save</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
};
