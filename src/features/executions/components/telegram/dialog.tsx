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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
    botToken: z.string().min(1, "Bot Token is required"),
    chatId: z.string().min(1, "Chat ID is required"),
    content: z.string().min(1, "Content is required").max(4096, "Telegram messages can be at most 4096 characters long"),
});

export type TelegramFormValues = z.infer<typeof formSchema>;

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (values: TelegramFormValues) => void;
    defaultValues?: Partial<TelegramFormValues>;
}

export const TelegramDialog = ({
    open,
    onOpenChange,
    onSubmit,
    defaultValues = {},
}: Props) => {

    const form = useForm<TelegramFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            variableName: defaultValues.variableName || '',
            botToken: defaultValues.botToken || '',
            chatId: defaultValues.chatId || '',
            content: defaultValues.content || '',
        },
    });

    const watchVariableName = form.watch("variableName") || "myTelegramCall";

    useEffect(() => {
        if (open) {
            form.reset({
                variableName: defaultValues.variableName || "",
                botToken: defaultValues.botToken || '',
                chatId: defaultValues.chatId || '',
                content: defaultValues.content || '',
            });
        }
    }, [open, defaultValues, form]);

    const handleSubmit = (values: TelegramFormValues) => {
        onSubmit(values);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange} >
            <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        Telegram Configuration
                    </DialogTitle>
                    <DialogDescription>
                        Configure the <strong>Telegram Bot API settings</strong> for this node.
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
                                            placeholder="myTelegramCall" 
                                            {...field} 
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Name of the variable to store the response in. It can be used later to reference in other nodes:{" "} {`{{${watchVariableName}.telegramMessageContent}}`}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="botToken"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Bot Token</FormLabel>
                                    <FormControl>
                                        <Input 
                                            placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                                            type="password"
                                            {...field} 
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        <Collapsible>
                                            <CollapsibleTrigger className="cursor-pointer text-xs font-medium text-muted-foreground">
                                                How to get your Telegram Bot Token (click to expand)
                                            </CollapsibleTrigger>

                                            <CollapsibleContent className="mt-2 space-y-2 text-xs sm:text-sm">
                                                <p><strong>Step 1: Open BotFather</strong></p>
                                                <ul className="list-disc ml-6 space-y-1">
                                                    <li>Open Telegram and search for <strong>@BotFather</strong></li>
                                                    <li>Start a chat with BotFather</li>
                                                </ul>

                                                <p><strong>Step 2: Create a new bot</strong></p>
                                                <ul className="list-disc ml-6 space-y-1">
                                                    <li>Send <strong>/newbot</strong> command</li>
                                                    <li>Follow the prompts to name your bot</li>
                                                    <li>BotFather will give you a <strong>Bot Token</strong></li>
                                                </ul>

                                                <p><strong>Step 3: Use it here</strong></p>
                                                <ul className="list-disc ml-6 space-y-1">
                                                    <li>Copy the token (looks like: <code>1234567890:ABCdefGHI...</code>)</li>
                                                    <li>Paste it in the field above</li>
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
                            name="chatId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Chat ID</FormLabel>
                                    <FormControl>
                                        <Input 
                                            placeholder="@channelname or -1001234567890"
                                            {...field} 
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        <Collapsible>
                                            <CollapsibleTrigger className="cursor-pointer text-xs font-medium text-muted-foreground">
                                                How to get a Chat ID (click to expand)
                                            </CollapsibleTrigger>

                                            <CollapsibleContent className="mt-2 space-y-2 text-xs sm:text-sm">
                                                <p><strong>For channels:</strong></p>
                                                <ul className="list-disc ml-6 space-y-1">
                                                    <li>Use <strong>@channelname</strong> (public channels)</li>
                                                    <li>Add your bot as an admin to the channel</li>
                                                </ul>

                                                <p><strong>For groups or private chats:</strong></p>
                                                <ul className="list-disc ml-6 space-y-1">
                                                    <li>Add <strong>@userinfobot</strong> to get numeric ID</li>
                                                    <li>Or forward a message from the chat to @userinfobot</li>
                                                    <li>Group IDs start with <strong>-100</strong></li>
                                                </ul>

                                                <p><strong>Important:</strong></p>
                                                <ul className="list-disc ml-6 space-y-1">
                                                    <li>Make sure your bot is added to the chat/channel</li>
                                                    <li>For channels, the bot must be an <strong>admin</strong></li>
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
                                    The message to send to Telegram. Use {"{{variables}}"} for simple values or {"{{json variable}}"} to stringify objects.
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