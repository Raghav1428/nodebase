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
import { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const formSchema = z.object({
  endpoint: z.string().url({ message: "Please enter a valid URL" }),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  body: z.string().optional(),
  // TODO .refine() JSON5
});

export type FormType = z.infer<typeof formSchema>;

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (values: z.infer<typeof formSchema>) => void;
    defaultEndpoint?: string;
    defaultMethod?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    defaultBody?: string;
}

export const HttpRequestDialog = ({
    open,
    onOpenChange,
    onSubmit,
    defaultEndpoint = "",
    defaultMethod = "GET",
    defaultBody = "",
}: Props) => {

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            endpoint: defaultEndpoint,
            method: defaultMethod,
            body: defaultBody,
        },
    });

    useEffect(() => {
        if (open) {
            form.reset({
                endpoint: defaultEndpoint,
                method: defaultMethod,
                body: defaultBody,
            });
        }
    }, [open, defaultEndpoint, defaultMethod, defaultBody, form])

    const watchMethod = form.watch("method");
    const showBodyField = ["POST", "PUT", "PATCH"].includes(watchMethod);

    const handleSubmit = (values: z.infer<typeof formSchema>) => {
        onSubmit(values);
        onOpenChange(false);
    };

    const methodColors: Record<string, string> = {
        GET: "text-green-500",
        POST: "text-yellow-500",
        PUT: "text-blue-500",
        PATCH: "text-purple-500",
        DELETE: "text-red-500",
    };


    return (
        <Dialog open={open} onOpenChange={onOpenChange} >
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        HTTP Request
                    </DialogTitle>
                    <DialogDescription>
                        Configure settings for <strong>HTTP Request</strong> node.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8 mt-4">
                        <FormField 
                            control={form.control}
                            name="method"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Method</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}    
                                    >
                                        <FormControl>
                                            <SelectTrigger className="w-full">
                                                <span className={`font-medium ${methodColors[field.value] || ""}`}>
                                                    {field.value || "Choose a method"}
                                                </span>
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {["GET", "POST", "PUT", "PATCH", "DELETE"].map((method) => {
                                                const textColors: Record<string, string> = {
                                                GET: "text-green-500",
                                                POST: "text-yellow-500",
                                                PUT: "text-blue-500",
                                                PATCH: "text-purple-500",
                                                DELETE: "text-red-500",
                                                };

                                                const hoverColors: Record<string, string> = {
                                                GET: "data-[highlighted]:bg-green-100 dark:data-[highlighted]:bg-green-900",
                                                POST: "data-[highlighted]:bg-yellow-100 dark:data-[highlighted]:bg-yellow-900",
                                                PUT: "data-[highlighted]:bg-blue-100 dark:data-[highlighted]:bg-blue-900",
                                                PATCH: "data-[highlighted]:bg-purple-100 dark:data-[highlighted]:bg-purple-900",
                                                DELETE: "data-[highlighted]:bg-red-100 dark:data-[highlighted]:bg-red-900",
                                                };

                                                return (
                                                <SelectItem
                                                    key={method}
                                                    value={method}
                                                    className={`font-medium cursor-pointer ${textColors[method]} ${hoverColors[method]} transition-colors`}
                                                >
                                                    {method}
                                                </SelectItem>
                                                );
                                            })}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        The HTTP method for the request
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField 
                            control={form.control}
                            name="endpoint"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Endpoint URL</FormLabel>
                                    <FormControl>
                                        <Input 
                                            placeholder="https://api.example.com/users/{{httpResponse.data.id}}" 
                                            {...field} 
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Static URL or use {"{{variables}}"} for simple values or {"{{json variable}}"} to stringify objects 
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {showBodyField && (
                            <FormField 
                                control={form.control}
                                name="body"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Request Body</FormLabel>
                                    <FormControl>
                                        <Textarea 
                                            placeholder={
                                                '{\n    "userId": "{{httpResponse.data.id}}",\n    "name": "{{httpResponse.data.name}},\n    "items": "{{httpResponse.data.items}}"\n}'
                                            } 
                                            {...field} 
                                            className="min-h-[120px] font-mono text-sm"
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        JSON with template variables. Use {"{{variables}}"} for simple values or {"{{json variable}}"} to stringify objects. 
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                            />
                        )}
                        <DialogFooter className="mt-4">
                            <Button type="submit">Save</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
};