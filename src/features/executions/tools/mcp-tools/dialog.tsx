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
import { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Globe, Terminal, Wifi } from "lucide-react";

const formSchema = z.object({
    transportType: z.enum(["sse", "http", "stdio"]),
    serverUrl: z.string().optional(),
    command: z.string().optional(),
    args: z.string().optional(),
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
            transportType: defaultValues.transportType || "sse",
            serverUrl: defaultValues.serverUrl || '',
            command: defaultValues.command || '',
            args: defaultValues.args || '',
        },
    });

    const watchTransportType = form.watch("transportType");

    useEffect(() => {
        if (open) {
            form.reset({
                transportType: defaultValues.transportType || "sse",
                serverUrl: defaultValues.serverUrl || "",
                command: defaultValues.command || "",
                args: defaultValues.args || "",
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
                        Connect to an MCP server to make its tools available to the AI Agent.
                        All tools from the server will be automatically discovered.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 mt-4">
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
                                            <SelectItem value="stdio">
                                                <div className="flex items-center gap-2">
                                                    <Terminal className="h-4 w-4" />
                                                    <span>Stdio (Local Process)</span>
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="sse">
                                                <div className="flex items-center gap-2">
                                                    <Wifi className="h-4 w-4" />
                                                    <span>SSE (Server-Sent Events)</span>
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="http">
                                                <div className="flex items-center gap-2">
                                                    <Globe className="h-4 w-4" />
                                                    <span>HTTP (Remote Server)</span>
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        {watchTransportType === "stdio" && (
                                            <span>Spawns a local process. Best for local MCP servers or npm packages.</span>
                                        )}
                                        {watchTransportType === "sse" && (
                                            <span>Connects via Server-Sent Events. Best for remote/online MCP servers.</span>
                                        )}
                                        {watchTransportType === "http" && (
                                            <span>Connects via HTTP. Best for REST-based MCP servers.</span>
                                        )}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {(watchTransportType === "sse" || watchTransportType === "http") && (
                            <FormField 
                                control={form.control}
                                name="serverUrl"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Server URL</FormLabel>
                                        <FormControl>
                                            <Input 
                                                placeholder={watchTransportType === "sse" 
                                                    ? "https://mcp.example.com/sse" 
                                                    : "https://mcp.example.com/api"
                                                }
                                                {...field} 
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Full URL to the MCP server endpoint.
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
                                                The executable to run. Examples: <code className="bg-muted px-1 rounded">npx</code>, <code className="bg-muted px-1 rounded">node</code>, <code className="bg-muted px-1 rounded">python</code>
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
                                                    placeholder="-y @modelcontextprotocol/server-filesystem C:/allowed/path" 
                                                    {...field} 
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Space-separated arguments. For npm packages use: <code className="bg-muted px-1 rounded">-y @package/name [args]</code>
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </>
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
