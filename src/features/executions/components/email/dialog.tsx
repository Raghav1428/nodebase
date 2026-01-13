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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCredentialByType } from "@/features/credentials/hooks/use-credentials";
import { CredentialType } from "@/generated/prisma";
import Image from "next/image";


const formSchema = z.object({
    variableName: z
        .string()
        .min(1, "Variable name is required")
        .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, { message: "Variable name must start with a letter or underscore and can only contain letters, numbers, and underscores" }),
    credentialId: z.string().min(1, "Email credential is required"),
    to: z.string().min(1, "Recipient email is required"),
    subject: z.string().min(1, "Subject is required"),
    body: z.string().min(1, "Body is required"),
});

export type EmailFormValues = z.infer<typeof formSchema>;

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (values: EmailFormValues) => void;
    defaultValues?: Partial<EmailFormValues>;
}

export const EmailDialog = ({
    open,
    onOpenChange,
    onSubmit,
    defaultValues = {},
}: Props) => {

    const { data: smtpCredentials, isLoading: isLoadingSmtp } = useCredentialByType(CredentialType.EMAIL_SMTP);
    const { data: gmailCredentials, isLoading: isLoadingGmail } = useCredentialByType(CredentialType.EMAIL_GMAIL);

    // Memoize to prevent infinite re-renders
    const allCredentials = useMemo(() => 
        [...(smtpCredentials || []), ...(gmailCredentials || [])],
        [smtpCredentials, gmailCredentials]
    );
    const isLoadingCredentials = isLoadingSmtp || isLoadingGmail;

    const form = useForm<EmailFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            variableName: defaultValues.variableName || '',
            credentialId: defaultValues.credentialId || '',
            to: defaultValues.to || '',
            subject: defaultValues.subject || '',
            body: defaultValues.body || '',
        },
    });

    const watchVariableName = form.watch("variableName") || "myEmailCall";

    useEffect(() => {
        if (open) {
            form.reset({
                variableName: defaultValues.variableName || "",
                credentialId: defaultValues.credentialId || allCredentials?.[0]?.id || "",
                to: defaultValues.to || '',
                subject: defaultValues.subject || '',
                body: defaultValues.body || '',
            });
        }
    }, [open, defaultValues, allCredentials]);

    const handleSubmit = (values: EmailFormValues) => {
        onSubmit(values);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange} >
            <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        Email Configuration
                    </DialogTitle>
                    <DialogDescription>
                        Configure the <strong>email settings</strong> for this node. Supports SMTP and Gmail.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8 mt-4">
                        <FormField 
                            control={form.control}
                            name="variableName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Variable Name</FormLabel>
                                    <FormControl>
                                        <Input 
                                            placeholder="myEmailCall" 
                                            {...field} 
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Name of the variable to store the result in. Reference it later: {`{{${watchVariableName}.emailSent}}`}
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
                                    <FormLabel>Email Credential</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingCredentials || !allCredentials?.length}>
                                        <FormControl>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder={allCredentials?.length ? "Select a credential" : "No credentials found"} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {allCredentials?.map((credential) => (
                                                <SelectItem key={credential.id} value={credential.id}>
                                                    <div className="flex items-center gap-2">
                                                        <Image 
                                                            src={credential.type === CredentialType.EMAIL_GMAIL ? "/logos/google.svg" : "/logos/email.svg"} 
                                                            alt={credential.type} 
                                                            width={16} 
                                                            height={16} 
                                                        />
                                                        <span>{credential.name}</span>
                                                        <span className="text-muted-foreground text-xs">
                                                            ({credential.type === CredentialType.EMAIL_GMAIL ? "Gmail" : "SMTP"})
                                                        </span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        <Collapsible>
                                            <CollapsibleTrigger className="cursor-pointer text-xs font-medium text-muted-foreground">
                                                How to set up email credentials (click to expand)
                                            </CollapsibleTrigger>

                                            <CollapsibleContent className="mt-2 space-y-2 text-xs sm:text-sm">
                                                <p><strong>For Gmail:</strong></p>
                                                <ul className="list-disc ml-6 space-y-1">
                                                    <li>Enable 2-Factor Authentication on your Google account</li>
                                                    <li>Go to <strong>Google Account</strong> → <strong>Security</strong> → <strong>App passwords</strong></li>
                                                    <li>Create a new app password for "Mail"</li>
                                                    <li>Add a new EMAIL_GMAIL credential in Credentials page with your email and the 16-character app password</li>
                                                </ul>

                                                <p><strong>For SMTP:</strong></p>
                                                <ul className="list-disc ml-6 space-y-1">
                                                    <li>Get your SMTP server details from your email provider</li>
                                                    <li>Add a new EMAIL_SMTP credential in Credentials page with host, port, username, and password</li>
                                                </ul>
                                            </CollapsibleContent>
                                        </Collapsible>
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                        <FormField 
                            control={form.control}
                            name="to"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>To</FormLabel>
                                    <FormControl>
                                        <Input 
                                            placeholder="recipient@example.com" 
                                            {...field} 
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Recipient email address. Separate multiple emails with commas. Supports {`{{variables}}`}.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField 
                            control={form.control}
                            name="subject"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Subject</FormLabel>
                                    <FormControl>
                                        <Input 
                                            placeholder="Notification from {{trigger.name}}" 
                                            {...field} 
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Email subject line. Use {`{{variables}}`} for dynamic content.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                        <FormField 
                            control={form.control}
                            name="body"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Body</FormLabel>
                                <FormControl>
                                    <Textarea 
                                        placeholder="Hello,\n\nHere is your report:\n{{json myData}}\n\nBest regards"
                                        {...field} 
                                        className="min-h-[120px] font-mono text-sm"
                                        />
                                </FormControl>
                                <FormDescription>
                                    Email body (HTML supported). Use {`{{variables}}`} for simple values or {`{{json variable}}`} to stringify objects.
                                </FormDescription>
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
    )
};
