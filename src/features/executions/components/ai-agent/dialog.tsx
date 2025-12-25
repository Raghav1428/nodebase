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
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { InfoIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const formSchema = z.object({
    variableName: z
        .string()
        .min(1, "Variable name is required")
        .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, { message: "Variable name must start with a letter or underscore and can only contain letters, numbers, and underscores" }),
});

export type AiAgentFormValues = z.infer<typeof formSchema>;

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (values: AiAgentFormValues) => void;
    defaultValues?: Partial<AiAgentFormValues>;
}

export const AiAgentDialog = ({
    open,
    onOpenChange,
    onSubmit,
    defaultValues = {},
}: Props) => {

    const form = useForm<AiAgentFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            variableName: defaultValues.variableName || '',
        },
    });

    const watchVariableName = form.watch("variableName") || "agent";

    useEffect(() => {
        if (open) {
            form.reset({
                variableName: defaultValues.variableName || "",
            });
        }
    }, [open, defaultValues, form]);

    const handleSubmit = (values: AiAgentFormValues) => {
        onSubmit(values);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange} >
            <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        AI Agent Configuration
                    </DialogTitle>
                    <DialogDescription>
                        Configure the AI Agent hub node. Connect AI models, databases, and tools to enable agent capabilities.
                    </DialogDescription>
                </DialogHeader>

                {/* Connection Info */}
                <Alert>
                    <InfoIcon className="h-4 w-4" />
                    <AlertTitle>Connection Points</AlertTitle>
                    <AlertDescription className="mt-2 space-y-2">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" />
                            <span className="text-sm"><strong>Chat Model</strong> — Connect to any AI chat model</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" />
                            <span className="text-sm"><strong>Database</strong> — Connect to any database</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" />
                            <span className="text-sm"><strong>Tools</strong> — Connect to any external tools</span>
                        </div>
                    </AlertDescription>
                </Alert>

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
                                            placeholder="myAgent" 
                                            {...field} 
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Access output via: {`{{${watchVariableName}.response}}`}
                                    </FormDescription>
                                    <FormDescription>
                                        Access chat history via: {`{{${watchVariableName}.chatHistory}}`}
                                    </FormDescription>
                                    <FormDescription>
                                        Access model via: {`{{${watchVariableName}.model}}`}
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
