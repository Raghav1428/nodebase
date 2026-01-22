"use client";

import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const WebhookTriggerDialog = ({
    open,
    onOpenChange
}: Props) => {

    const params = useParams();
    const workflowId = params.workflowId as string;
    const trpc = useTRPC();

    const { data: secretData, mutate: generateSecret } = useMutation(
        trpc.workflows.generateWebhookSecret.mutationOptions({})
    );

    useEffect(() => {
        if (open && workflowId) {
            generateSecret({ workflowId });
        }
    }, [open, workflowId, generateSecret]);

    // Construct webhook url
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const webhookUrl = `${baseUrl}/api/webhooks/webhook-trigger?workflowId=${workflowId}`;

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(webhookUrl);
            toast.success("Webhook URL copied to clipboard")
        } catch (error) {
            toast.error("Failed to copy webhook URL to clipboard");
        }
    }

    const copySecret = async () => {
        if (secretData?.secret) {
            try {
                await navigator.clipboard.writeText(secretData.secret);
                toast.success("Secret copied to clipboard");
            } catch (error) {
                toast.error("Failed to copy secret");
            }
        }
    }

    const copyCurlExample = async () => {
        const curl = `curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -H "X-Secret: ${secretData?.secret || 'YOUR_SECRET'}" \\
  -d '{"example": "data"}'`;
        try {
            await navigator.clipboard.writeText(curl);
            toast.success("cURL example copied to clipboard");
        } catch (error) {
            toast.error("Failed to copy cURL example");
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange} >
            <DialogContent className="max-h-[95vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        Webhook Trigger Configuration
                    </DialogTitle>
                    <DialogDescription>
                        Configure this webhook URL in your application to trigger this workflow on webhook events.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="webhook-url">
                            Webhook URL
                        </Label>
                        <div className="flex gap-2">
                            <Input
                                id="webhook-url"
                                value={webhookUrl}
                                readOnly
                                className="font-mono text-sm"
                            />
                            <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                onClick={copyToClipboard}
                            >
                                <CopyIcon className="size-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="secret">
                            Secret
                        </Label>
                        <div className="flex gap-2">
                            <Input
                                id="secret"
                                value={secretData?.secret || "Generating..."}
                                readOnly
                                className="font-mono text-sm"
                            />
                            <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                onClick={copySecret}
                                disabled={!secretData?.secret}
                            >
                                <CopyIcon className="size-4" />
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Include this in the <code className="bg-muted px-1 py-0.5 rounded">X-Secret</code> header to authenticate requests.
                        </p>
                    </div>

                    <div className="rounded-lg bg-muted p-4 space-y-2">
                        <h4 className="font-medium text-sm">Setup Instructions</h4>
                        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                            <li>Copy the webhook URL above</li>
                            <li>Configure your application to POST to this URL</li>
                            <li>Include the secret in the <code className="bg-background px-1 py-0.5 rounded">X-Secret</code> header</li>
                            <li>Send JSON data in the request body</li>
                        </ol>
                    </div>

                    <div className="rounded-lg bg-muted p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="font-medium text-sm">Example Request</h4>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={copyCurlExample}
                            >
                                <CopyIcon className="size-3 mr-1" />
                                Copy cURL
                            </Button>
                        </div>
                        <pre className="text-xs text-muted-foreground bg-background p-3 rounded overflow-x-auto whitespace-pre-wrap break-all">
                            {`curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -H "X-Secret: ${secretData?.secret || 'YOUR_SECRET'}" \\
  -d '{"example": "data"}'`}
                        </pre>
                    </div>

                    <div className="rounded-lg bg-muted p-4 space-y-2">
                        <h4 className="font-medium text-sm">Available Variables</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                            <li>
                                <code className="bg-background px-1 py-0.5 rounded">
                                    {"{{webhook.raw}}"}
                                </code>
                                - Raw webhook data
                            </li>
                            <li>
                                <code className="bg-background px-1 py-0.5 rounded">
                                    {"{{json webhook}}"}
                                </code>
                                - All Event data as JSON
                            </li>
                        </ul>
                    </div>

                </div>
            </DialogContent>
        </Dialog>
    )
};