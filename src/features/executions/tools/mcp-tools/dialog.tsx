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
    variableName: z
        .string()
        .min(1, "Variable name is required")
        .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, { message: "Variable name must start with a letter or underscore and can only contain letters, numbers, and underscores" }),
    transportType: z.enum(["sse", "stdio"]),
    serverUrl: z.string().optional(),
    command: z.string().optional(),
    args: z.string().optional(),
    toolName: z.string().min(1, "Tool name is required"),
    toolArguments: z.string().optional(),
});

export type McpToolsFormValues = z.infer<typeof formSchema>;

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (values: McpToolsFormValues) => void;
    defaultValues?: Partial<McpToolsFormValues>;
}

export const McpToolsDialog = ({
    open,
    onOpenChange,
    onSubmit,
    defaultValues = {},
}: Props) => {

    const form = useForm<McpToolsFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            variableName: defaultValues.variableName || '',
            transportType: defaultValues.transportType || "sse",
            serverUrl: defaultValues.serverUrl || '',
            command: defaultValues.command || '',
            args: defaultValues.args || '',
            toolName: defaultValues.toolName || '',
            toolArguments: defaultValues.toolArguments || '{}',
        },
    });

    const watchVariableName = form.watch("variableName") || "myMcpTool";
    const watchTransportType = form.watch("transportType");

    useEffect(() => {
        if (open) {
            form.reset({
                variableName: defaultValues.variableName || "",
                transportType: defaultValues.transportType || "sse",
                serverUrl: defaultValues.serverUrl || "",
                command: defaultValues.command || "",
                args: defaultValues.args || "",
                toolName: defaultValues.toolName || "",
                toolArguments: defaultValues.toolArguments || "{}",
            });
        }
    }, [open, defaultValues, form]);

    const handleSubmit = (values: McpToolsFormValues) => {
        onSubmit(values);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange} >
            <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        MCP Tools Configuration
                    </DialogTitle>
                    <DialogDescription>
                        Configure the <strong>MCP server and tool</strong> for this node.
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
                                            placeholder="myMcpTool" 
                                            {...field} 
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Store result in: {`{{${watchVariableName}.toolResult}}`}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField 
                            control={form.control}
                            name="transportType"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Transport Type</FormLabel>
                                    <Select 
                                        onValueChange={field.onChange}
                                        value={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select transport type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="sse">SSE (Server-Sent Events)</SelectItem>
                                            <SelectItem value="stdio">Stdio (Local Process)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        How to connect to the MCP server.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {watchTransportType === "sse" && (
                            <FormField 
                                control={form.control}
                                name="serverUrl"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Server URL</FormLabel>
                                        <FormControl>
                                            <Input 
                                                placeholder="http://localhost:3001/sse" 
                                                {...field} 
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            URL of the MCP SSE endpoint.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {watchTransportType === "stdio" && (
                            <>
                                <FormField 
                                    control={form.control}
                                    name="command"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Command</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    placeholder="npx" 
                                                    {...field} 
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Command to start the MCP server.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField 
                                    control={form.control}
                                    name="args"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Arguments</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    placeholder="-y @modelcontextprotocol/server-filesystem /path" 
                                                    {...field} 
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Space-separated command arguments.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </>
                        )}

                        <FormField 
                            control={form.control}
                            name="toolName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tool Name</FormLabel>
                                    <FormControl>
                                        <Input 
                                            placeholder="read_file" 
                                            {...field} 
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Name of the MCP tool to call.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField 
                            control={form.control}
                            name="toolArguments"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tool Arguments</FormLabel>
                                    <FormControl>
                                        <Textarea 
                                            placeholder='{ "path": "{{filePath}}" }'
                                            {...field} 
                                            className="min-h-[100px] font-mono text-sm"
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        JSON arguments for the tool. Use {"{{variables}}"} for dynamic values.
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
