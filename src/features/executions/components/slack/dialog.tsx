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
    content: z.string().min(1, "Content is required"),
});

export type SlackFormValues = z.infer<typeof formSchema>;

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (values: SlackFormValues) => void;
    defaultValues?: Partial<SlackFormValues>;
}

export const SlackDialog = ({
    open,
    onOpenChange,
    onSubmit,
    defaultValues = {},
}: Props) => {

    const form = useForm<SlackFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            variableName: defaultValues.variableName || '',
            webhookUrl: defaultValues.webhookUrl || '',
            content: defaultValues.content || '',
        },
    });

    const watchVariableName = form.watch("variableName") || "mySlackCall";

    useEffect(() => {
        if (open) {
            form.reset({
                variableName: defaultValues.variableName || "",
                webhookUrl: defaultValues.webhookUrl || '',
                content: defaultValues.content || '',
            });
        }
    }, [open, defaultValues, form]);

    const handleSubmit = (values: SlackFormValues) => {
        onSubmit(values);
        onOpenChange(false);
    };


    return (
        <Dialog open={open} onOpenChange={onOpenChange} >
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        Slack Configuration
                    </DialogTitle>
                    <DialogDescription>
                        Configure the <strong>Slack webhook settings</strong> for this node.
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
                                            placeholder="mySlackCall" 
                                            {...field} 
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Name of the variable to store the response in. It can be used later to reference in other nodes:{" "} {`{{${watchVariableName}.slackMessageContent}}`}
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
                                            placeholder="https://slack.com/api/chat.postMessage" 
                                            {...field} 
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Get this from Slack: Go to your workspace → More → Tools → Workflows → New → Build workflow → Choose <strong>From a webhook</strong> → set up variables → Set <strong>content</strong> as key → Done → Continue
                                    </FormDescription>
                                    <FormDescription>
                                        Then, Add steps → <strong>Send a message to a channel</strong> → Select a channel → <strong>Insert a variable</strong> → Choose <strong>content</strong> → Click Save → Click Finish up → CLick Publish
                                    </FormDescription>
                                    <FormDescription>
                                        Then, Go to Home → Go to Channel you added the workflow to →  Click <strong>Workflows</strong> → Click on the workflow → CLick on <strong>Starts with a webhook</strong> → Copy <strong>Web request URL</strong> → Paste it here
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
                                    The message to send to Slack. Use {"{{variables}}"} for simple values or {"{{json variable}}"} to stringify objects. 
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