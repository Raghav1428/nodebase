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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getAvailableOpenAIModels } from "./actions";


const formSchema = z.object({
    variableName: z
        .string()
        .min(1, "Variable name is required")
        .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, { message: "Variable name must start with a letter or underscore and can only contain letters, numbers, and underscores" }),
    model: z.string().min(1, "Model is required"),
    systemPrompt: z.string().optional(),
    userPrompt: z.string().min(1, "User prompt is required"),
});

export type OpenAIFormValues = z.infer<typeof formSchema>;

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (values: OpenAIFormValues) => void;
    defaultValues?: Partial<OpenAIFormValues>;
}

export const OpenAIDialog = ({
    open,
    onOpenChange,
    onSubmit,
    defaultValues = {},
}: Props) => {

    const [models, setModels] = useState<string[]>([]);
    const [isLoadingModels, setIsLoadingModels] = useState(false);

    const form = useForm<OpenAIFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            variableName: defaultValues.variableName || '',
            model: defaultValues.model || "gpt-4",
            systemPrompt: defaultValues.systemPrompt || '',
            userPrompt: defaultValues.userPrompt || '',
        },
    });

    useEffect(() => {
        const loadModels = async () => {
            setIsLoadingModels(true);
            try {
                const fetchedModels = await getAvailableOpenAIModels();
                setModels(fetchedModels);
                
                // If the current default value isn't in the list, default to the first available
                if (fetchedModels.length > 0 && !form.getValues("model")) {
                    form.setValue("model", fetchedModels[0]);
                }
            } catch (err) {
                console.error("Failed to load models", err);
            } finally {
                setIsLoadingModels(false);
            }
        };
        loadModels();
    }, [form]);

    useEffect(() => {
        if (open) {
            form.reset({
                variableName: defaultValues.variableName || '',
                model: defaultValues.model || "gpt-4",
                systemPrompt: defaultValues.systemPrompt || '',
                userPrompt: defaultValues.userPrompt || '',
            });
        }
    }, [open, defaultValues, form])

    const watchVariableName = form.watch("variableName") || "myOpenAICall";

    const handleSubmit = (values: OpenAIFormValues) => {
        onSubmit(values);
        onOpenChange(false);
    };


    return (
        <Dialog open={open} onOpenChange={onOpenChange} >
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        OpenAI Configuration
                    </DialogTitle>
                    <DialogDescription>
                        Configure the <strong>prompt and model</strong> for this node.
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
                                            placeholder="myOpenAICall" 
                                            {...field} 
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Name of the variable to store the response in. It can be used later to reference in other nodes:{" "} {`{{${watchVariableName}.openAIResponse}}`}
                                    </FormDescription>
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
                            <Button type="submit">Save</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
};