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
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CopyIcon, Loader2, LinkIcon, UnlinkIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { setTelegramWebhook, removeTelegramWebhook } from "./actions";
import { useReactFlow } from "@xyflow/react";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    nodeId: string;
    defaultValues?: {
        botToken?: string;
        secretToken?: string;
        webhookActive?: boolean;
    };
}

export const TelegramTriggerDialog = ({
    open,
    onOpenChange,
    nodeId,
    defaultValues = {},
}: Props) => {

    const params = useParams();
    const workflowId = params.workflowId as string;
    const { setNodes } = useReactFlow();

    const [botToken, setBotToken] = useState(defaultValues.botToken || "");
    const [isSettingWebhook, setIsSettingWebhook] = useState(false);
    const [isRemovingWebhook, setIsRemovingWebhook] = useState(false);

    // Construct webhook url
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const webhookUrl = `${baseUrl}/api/webhooks/telegram-trigger?workflowId=${workflowId}`;

    // Generate a stable secret token from workflowId
    const secretToken = useMemo(() => {
        // Create a deterministic but hard-to-guess secret
        const raw = `tg-${workflowId}-${nodeId}`;
        // Simple hash-like transformation for a secret token
        let hash = 0;
        for (let i = 0; i < raw.length; i++) {
            const char = raw.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        return `nb_${Math.abs(hash).toString(36)}_${workflowId.slice(0, 8)}`;
    }, [workflowId, nodeId]);

    const updateNodeData = useCallback((data: Record<string, unknown>) => {
        setNodes((nodes) => nodes.map((node) => {
            if (node.id === nodeId) {
                return {
                    ...node,
                    data: {
                        ...node.data,
                        ...data,
                    }
                }
            }
            return node;
        }));
    }, [nodeId, setNodes]);

    const handleSaveBotToken = useCallback(() => {
        if (!botToken.trim()) {
            toast.error("Bot Token is required");
            return;
        }
        updateNodeData({ botToken: botToken.trim(), secretToken });
        toast.success("Bot Token saved");
    }, [botToken, secretToken, updateNodeData]);

    const handleSetWebhook = useCallback(async () => {
        if (!botToken.trim()) {
            toast.error("Please enter and save a Bot Token first");
            return;
        }

        setIsSettingWebhook(true);
        try {
            const result = await setTelegramWebhook({
                botToken: botToken.trim(),
                webhookUrl,
                secretToken,
            });

            if (result.ok) {
                updateNodeData({
                    botToken: botToken.trim(),
                    secretToken,
                    webhookActive: true,
                });
                toast.success("Telegram webhook set successfully!");
            } else {
                toast.error(`Failed to set webhook: ${result.description || "Unknown error"}`);
            }
        } catch (error) {
            toast.error("Failed to set webhook. Check your Bot Token.");
        } finally {
            setIsSettingWebhook(false);
        }
    }, [botToken, webhookUrl, secretToken, updateNodeData]);

    const handleRemoveWebhook = useCallback(async () => {
        if (!botToken.trim()) {
            toast.error("Bot Token is required to remove webhook");
            return;
        }

        setIsRemovingWebhook(true);
        try {
            const result = await removeTelegramWebhook({
                botToken: botToken.trim(),
            });

            if (result.ok) {
                updateNodeData({ webhookActive: false });
                toast.success("Telegram webhook removed successfully");
            } else {
                toast.error(`Failed to remove webhook: ${result.description || "Unknown error"}`);
            }
        } catch (error) {
            toast.error("Failed to remove webhook");
        } finally {
            setIsRemovingWebhook(false);
        }
    }, [botToken, updateNodeData]);

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(webhookUrl);
            toast.success("Webhook URL copied to clipboard")
        } catch (error) {
            toast.error("Failed to copy webhook URL");
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[95vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        Telegram Trigger Configuration
                    </DialogTitle>
                    <DialogDescription>
                        Configure your Telegram bot to trigger this workflow when it receives a message.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    {/* Bot Token */}
                    <div className="space-y-2">
                        <Label htmlFor="bot-token">Bot Token</Label>
                        <div className="flex gap-2">
                            <Input
                                id="bot-token"
                                type="password"
                                placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                                value={botToken}
                                onChange={(e) => setBotToken(e.target.value)}
                                className="font-mono text-sm"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleSaveBotToken}
                            >
                                Save
                            </Button>
                        </div>
                        <Collapsible>
                            <CollapsibleTrigger className="cursor-pointer text-xs font-medium text-muted-foreground">
                                How to get your Telegram Bot Token (click to expand)
                            </CollapsibleTrigger>
                            <CollapsibleContent className="mt-2 space-y-2 text-xs sm:text-sm text-muted-foreground">
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
                                    <li>Paste it in the field above and click Save</li>
                                </ul>
                            </CollapsibleContent>
                        </Collapsible>
                    </div>

                    {/* Webhook URL */}
                    <div className="space-y-2">
                        <Label htmlFor="webhook-url">Webhook URL</Label>
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
                        <p className="text-xs text-muted-foreground">
                            This URL will be registered with Telegram to receive message updates.
                        </p>
                    </div>

                    {/* Webhook Controls */}
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            onClick={handleSetWebhook}
                            disabled={isSettingWebhook || !botToken.trim()}
                            className="flex-1"
                        >
                            {isSettingWebhook ? (
                                <Loader2 className="size-4 mr-2 animate-spin" />
                            ) : (
                                <LinkIcon className="size-4 mr-2" />
                            )}
                            Set Webhook
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleRemoveWebhook}
                            disabled={isRemovingWebhook || !botToken.trim()}
                            className="flex-1"
                        >
                            {isRemovingWebhook ? (
                                <Loader2 className="size-4 mr-2 animate-spin" />
                            ) : (
                                <UnlinkIcon className="size-4 mr-2" />
                            )}
                            Remove Webhook
                        </Button>
                    </div>

                    {defaultValues.webhookActive && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                            <div className="size-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-sm text-green-600 dark:text-green-400 font-medium">Webhook is active</span>
                        </div>
                    )}

                    {/* Setup Instructions */}
                    <div className="rounded-lg bg-muted p-4 space-y-2">
                        <h4 className="font-medium text-sm">Setup Instructions</h4>
                        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                            <li>Create a bot with @BotFather and get the Bot Token</li>
                            <li>Paste the Bot Token above and click Save</li>
                            <li>Click &quot;Set Webhook&quot; to register this URL with Telegram</li>
                            <li>Save the workflow</li>
                            <li>Send a message to your bot — it will trigger this workflow!</li>
                        </ol>
                    </div>

                    {/* Available Variables */}
                    <div className="rounded-lg bg-muted p-4 space-y-2">
                        <h4 className="font-medium text-sm">Available Variables</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                            <li>
                                <code className="bg-background px-1 py-0.5 rounded">
                                    {"{{telegram.text}}"}
                                </code>
                                {" "}- Message text
                            </li>
                            <li>
                                <code className="bg-background px-1 py-0.5 rounded">
                                    {"{{telegram.from.first_name}}"}
                                </code>
                                {" "}- Sender&apos;s first name
                            </li>
                            <li>
                                <code className="bg-background px-1 py-0.5 rounded">
                                    {"{{telegram.from.username}}"}
                                </code>
                                {" "}- Sender&apos;s username
                            </li>
                            <li>
                                <code className="bg-background px-1 py-0.5 rounded">
                                    {"{{telegram.chatId}}"}
                                </code>
                                {" "}- Chat ID
                            </li>
                            <li>
                                <code className="bg-background px-1 py-0.5 rounded">
                                    {"{{telegram.messageId}}"}
                                </code>
                                {" "}- Message ID
                            </li>
                            <li>
                                <code className="bg-background px-1 py-0.5 rounded">
                                    {"{{telegram.date}}"}
                                </code>
                                {" "}- Message timestamp
                            </li>
                            <li>
                                <code className="bg-background px-1 py-0.5 rounded">
                                    {"{{json telegram}}"}
                                </code>
                                {" "}- All message data as JSON
                            </li>
                        </ul>
                    </div>

                </div>
            </DialogContent>
        </Dialog>
    )
};
