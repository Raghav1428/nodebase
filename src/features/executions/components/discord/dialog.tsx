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
import { Textarea } from "@/components/ui/textarea";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";


const formSchema = z.object({
    variableName: z
        .string()
        .min(1, "Variable name is required")
        .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, { message: "Variable name must start with a letter or underscore and can only contain letters, numbers, and underscores" }),
    webhookUrl: z.string().min(1, "Webhook URL is required"),
    content: z.string().min(1, "Content is required").max(2000, "Discord messages can be at most 2000 characters long"),
    username: z.string().optional(),
});

export type DiscordFormValues = z.infer<typeof formSchema>;

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (values: DiscordFormValues) => void;
    defaultValues?: Partial<DiscordFormValues>;
}

export const DiscordDialog = ({
    open,
    onOpenChange,
    onSubmit,
    defaultValues = {},
}: Props) => {

    const form = useForm<DiscordFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            variableName: defaultValues.variableName || '',
            webhookUrl: defaultValues.webhookUrl || '',
            content: defaultValues.content || '',
            username: defaultValues.username || '',
        },
    });

    const watchVariableName = form.watch("variableName") || "myDiscordCall";

    useEffect(() => {
        if (open) {
            form.reset({
                variableName: defaultValues.variableName || "",
                webhookUrl: defaultValues.webhookUrl || '',
                content: defaultValues.content || '',
                username: defaultValues.username || '',
            });
        }
    }, [open, defaultValues, form]);

    const handleSubmit = (values: DiscordFormValues) => {
        onSubmit(values);
        onOpenChange(false);
    };


    return (
        <Dialog open={open} onOpenChange={onOpenChange} >
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        Discord Configuration
                    </DialogTitle>
                    <DialogDescription>
                        Configure the <strong>Discord webhook settings</strong> for this node.
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
                                            placeholder="myDiscordCall" 
                                            {...field} 
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Name of the variable to store the response in. It can be used later to reference in other nodes:{" "} {`{{${watchVariableName}.discordMessageContent}}`}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="webhookUrl"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Webhook URL</FormLabel>
                                    <FormControl>
                                        <Input 
                                            placeholder="https://discord.com/api/webhooks/1234567890/1234567890" 
                                            {...field} 
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Get this from Discord: Channel Settings → Integrations → Webhooks
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                        <FormField 
                            control={form.control}
                            name="content"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Message Content</FormLabel>
                                <FormControl>
                                    <Textarea 
                                        placeholder="Summary {{myGeminiCall.geminiResponse}}"
                                        {...field} 
                                        className="min-h-[80px] font-mono text-sm"
                                        />
                                </FormControl>
                                <FormDescription>
                                    The message to send to Discord. Use {"{{variables}}"} for simple values or {"{{json variable}}"} to stringify objects. 
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="username"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Bot Username (Optional)</FormLabel>
                                    <FormControl>
                                        <Input 
                                            placeholder="Bot Name" 
                                            {...field} 
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        The name of the bot to send the message as. This is optional. It overrides the webhook username.
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