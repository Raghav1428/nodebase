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
import { CopyIcon, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { generateGoogleFormScript } from "./utils";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const GoogleFormTriggerDialog = ({
    open,
    onOpenChange
}: Props) => {

    const params = useParams();
    const workflowId = params.workflowId as string;
    const trpc = useTRPC();

    const { data: secretData, mutate: generateSecret, isPending: isGeneratingSecret, isError, error } = useMutation(
        trpc.workflows.generateGoogleFormSecret.mutationOptions({})
    );

    const isLoading = isGeneratingSecret;

    useEffect(() => {
        if (open && workflowId) {
            generateSecret({ workflowId });
        }
    }, [open, workflowId, generateSecret]);

    // Show warning if node doesn't exist yet (workflow not saved)
    useEffect(() => {
        if (isError && error) {
            if (error.message?.includes("not found")) {
                toast.warning("Save the workflow first to generate a secure webhook secret. You can still copy scripts, but they will use an empty secret.");
            } else {
                toast.error(`Failed to generate webhook secret: ${error.message}`);
            }
        }
    }, [isError, error]);

    // Construct webhook url
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const webhookUrl = `${baseUrl}/api/webhooks/google-form?workflowId=${workflowId}`;

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(webhookUrl);
            toast.success("Webhook URL copied to clipboard")
        } catch (error) {
            toast.error("Failed to copy webhook URL to clipboard");
        }
    }

    const copyScript = async () => {
        if (isLoading) {
            toast.error("Please wait for webhook secret to be generated");
            return;
        }
        if (isError || !secretData?.secret) {
            toast.error("Secret generation failed — cannot copy script");
            return;
        }
        const script = generateGoogleFormScript(webhookUrl, secretData.secret);
        try {
            await navigator.clipboard.writeText(script);
            toast.success("Google Apps Script copied to clipboard");
        } catch (error) {
            toast.error("Failed to copy Google Apps Script to clipboard");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange} >
            <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        Google Form Trigger Configuration
                    </DialogTitle>
                    <DialogDescription>
                        Use this webhook URL in your Google Form's Apps Script to trigger this workflow when the form is submitted.
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

                    <div className="rounded-lg bg-muted p-4 space-y-2">
                        <h4 className="font-medium text-sm">Setup Instructions</h4>
                        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                            <li>Go to your Google Form</li>
                            <li>Click the three dots → Script Editor </li>
                            <li>Delete any existing code and paste the script below</li>
                            <li>Save the project (Ctrl+S)</li>
                            <li>Click "Triggers" (clock icon) → Add Trigger</li>
                            <li>Choose: onFormSubmit → From form → On form submit → Save</li>
                        </ol>
                    </div>

                    <div className="rounded-lg bg-muted p-4 space-y-3 border border-primary/20">
                        <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm">Google Apps Script</h4>
                            <span className="px-2 py-0.5 text-[10px] font-medium bg-primary/10 text-primary rounded-full">
                                Includes Secret
                            </span>
                        </div>
                        <Button
                            type="button"
                            onClick={copyScript}
                            className="w-full"
                            disabled={isLoading}
                        >
                            {isGeneratingSecret ? (
                                <Loader2 className="size-4 mr-2 animate-spin" />
                            ) : (
                                <CopyIcon className="size-4 mr-2" />
                            )}
                            {isGeneratingSecret ? "Generating Secret..." : "Copy Google Apps Script"}
                        </Button>
                        <p className="text-xs text-muted-foreground">
                            This script includes your webhook URL and a secret token for secure authentication.
                        </p>
                    </div>

                    <div className="rounded-lg bg-muted p-4 space-y-2">
                        <h4 className="font-medium text-sm">Available Variables</h4>
                        <ul className="text-sm text-muted-foreground space-y-1.5">
                            <li>
                                <code className="bg-background px-1 py-0.5 rounded text-xs">
                                    {"{{googleForm.formTitle}}"}
                                </code>
                                <span className="text-xs"> - Form title</span>
                            </li>
                            <li>
                                <code className="bg-background px-1 py-0.5 rounded text-xs">
                                    {"{{googleForm.respondentEmail}}"}
                                </code>
                                <span className="text-xs"> - Respondent's email</span>
                            </li>
                            <li>
                                <code className="bg-background px-1 py-0.5 rounded text-xs">
                                    {"{{googleForm.timestamp}}"}
                                </code>
                                <span className="text-xs"> - Submission time</span>
                            </li>
                            <li>
                                <code className="bg-background px-1 py-0.5 rounded text-xs">
                                    {"{{googleForm.responses['Question Name']}}"}
                                </code>
                                <span className="text-xs"> - Specific answer</span>
                            </li>
                            <li>
                                <code className="bg-background px-1 py-0.5 rounded text-xs">
                                    {"{{json googleForm.responses}}"}
                                </code>
                                <span className="text-xs"> - All responses as JSON</span>
                            </li>
                        </ul>
                    </div>

                </div>
            </DialogContent>
        </Dialog>
    )
};
