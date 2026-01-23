"use client";

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
import { CopyIcon, Plus } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useCredentialByType } from "@/features/credentials/hooks/use-credentials";
import { CredentialType } from "@/generated/prisma";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useReactFlow } from "@xyflow/react";
import { AddCredentialDialog } from "@/features/credentials/components/add-credential-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import Image from "next/image";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    nodeId: string;
    credentialId?: string;
}

export const StripeTriggerDialog = ({
    open,
    onOpenChange,
    nodeId,
    credentialId
}: Props) => {

    const params = useParams();
    const workflowId = params.workflowId as string;
    const { setNodes } = useReactFlow();
    const queryClient = useQueryClient();
    const trpc = useTRPC();

    // Fetch credentials
    const { data: credentials, isLoading } = useCredentialByType(CredentialType.STRIPE);
    const [addCredentialOpen, setAddCredentialOpen] = useState(false);

    // Construct webhook url
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const webhookUrl = `${baseUrl}/api/webhooks/stripe?workflowId=${workflowId}`;

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(webhookUrl);
            toast.success("Webhook URL copied to clipboard")
        } catch (error) {
            toast.error("Failed to copy webhook URL to clipboard");
        }
    }

    const handleCredentialChange = (value: string) => {
        if (value === "__add_new__") {
            setAddCredentialOpen(true);
            return;
        }
        setNodes((nodes) => nodes.map((node) => {
            if (node.id === nodeId) {
                return {
                    ...node,
                    data: {
                        ...node.data,
                        credentialId: value
                    }
                }
            }
            return node;
        }));
    };

    const handleCredentialCreated = (newCredentialId: string) => {
        // Invalidate credentials query to refetch the list
        queryClient.invalidateQueries(trpc.credentials.getByType.queryOptions({ type: CredentialType.STRIPE }));
        // Auto-select the newly created credential
        handleCredentialChange(newCredentialId);
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange} >
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            Stripe Trigger Configuration
                        </DialogTitle>
                        <DialogDescription>
                            Configure this webhook URL in your Stripe Dashboard to trigger this workflow on payment events.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6">

                        {/* Credential Selection */}
                        <div className="space-y-2">
                            <Label htmlFor="credential">Stripe Credential</Label>
                            <Select
                                value={credentialId || ""}
                                onValueChange={handleCredentialChange}
                                disabled={isLoading}
                            >
                                <SelectTrigger id="credential" className="w-full">
                                    <SelectValue placeholder={isLoading ? "Loading..." : "Select a Stripe Account"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {credentials?.map((cred) => (
                                        <SelectItem key={cred.id} value={cred.id}>
                                            <div className="flex items-center gap-2">
                                                <Image src="/logos/stripe.svg" alt="Stripe" width={16} height={16} />
                                                <span>{cred.name}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                    <SelectItem value="__add_new__" className="hover:text-primary">
                                        <div className="flex items-center gap-2">
                                            <Plus className="h-4 w-4" />
                                            <span>Add new credential</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-[0.8rem] text-muted-foreground">
                                Required to verify the webhook signature.
                            </p>
                        </div>

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

                        <div className="rounded-lg bg-muted p-4 space-y-2">
                            <h4 className="font-medium text-sm">Setup Instructions</h4>
                            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                                <li>Go to your Stripe Dashboard</li>
                                <li>Go to Developers → Webhooks</li>
                                <li>Click on Add endpoint</li>
                                <li>Paste the webhook URL from above</li>
                                <li>Select events to listen for (e.g., payment_intent.succeeded)</li>
                                <li>Save and copy the signing secret</li>
                                <li>Create a new credential with this secret</li>
                            </ol>
                        </div>

                        <div className="rounded-lg bg-muted p-4 space-y-2">
                            <h4 className="font-medium text-sm">Available Variables</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                                <li>
                                    <code className="bg-background px-1 py-0.5 rounded">
                                        {"{{stripe.amount}}"}
                                    </code>
                                    - Payment amount
                                </li>
                                <li>
                                    <code className="bg-background px-1 py-0.5 rounded">
                                        {"{{stripe.currency}}"}
                                    </code>
                                    - Payment currency code
                                </li>
                                <li>
                                    <code className="bg-background px-1 py-0.5 rounded">
                                        {"{{stripe.customerId}}"}
                                    </code>
                                    - Customer ID
                                </li>
                                <li>
                                    <code className="bg-background px-1 py-0.5 rounded">
                                        {"{{stripe.eventType}}"}
                                    </code>
                                    - Event type (e.g., payment_intent.succeeded)
                                </li>
                                <li>
                                    <code className="bg-background px-1 py-0.5 rounded">
                                        {"{{json stripe}}"}
                                    </code>
                                    - All Event data as JSON
                                </li>
                            </ul>
                        </div>

                    </div>
                </DialogContent>
            </Dialog>

            <AddCredentialDialog
                open={addCredentialOpen}
                onOpenChange={setAddCredentialOpen}
                credentialType={CredentialType.STRIPE}
                onSuccess={handleCredentialCreated}
            />
        </>
    )
};