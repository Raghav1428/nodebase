"use client";

import { createId } from "@paralleldrive/cuid2"
import { useReactFlow } from "@xyflow/react";
import {
    GlobeIcon,
    MousePointer2Icon,
    TimerIcon
} from "lucide-react"
import { useCallback } from "react";
import { toast } from "sonner";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger
} from "@/components/ui/sheet";
import { NodeType } from "@/generated/prisma";
import { Separator } from "./ui/separator";

export type NodeTypeOption = {
    type: NodeType;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }> | string;
};

const triggerNodes: NodeTypeOption[] = [
    {
        type: NodeType.MANUAL_TRIGGER,
        label: "Trigger manually",
        description: "Runs the flow on clicking a button. Good for getting started quickly.",
        icon: MousePointer2Icon,
    },
    {
        type: NodeType.GOOGLE_FORM_TRIGGER,
        label: "Google Form",
        description: "Runs the flow when a Google Form is submitted.",
        icon: "/logos/googleform.svg",
    },
    {
        type: NodeType.STRIPE_TRIGGER,
        label: "Stripe Event",
        description: "Runs the flow when a Stripe event is captured.",
        icon: "/logos/stripe.svg",
    },
    {
        type: NodeType.WEBHOOK_TRIGGER,
        label: "Webhook",
        description: "Runs the flow when a webhook event is captured.",
        icon: "/logos/webhook.svg",
    },
    {
        type: NodeType.SCHEDULED_TRIGGER,
        label: "Schedule",
        description: "Runs the flow at a scheduled time.",
        icon: TimerIcon,
    },
];

const executionNodes: NodeTypeOption[] =[
    {
        type: NodeType.HTTP_REQUEST,
        label: "HTTP request",
        description: "Makes a HTTP request",
        icon: GlobeIcon,
    },
    {
        type: NodeType.GEMINI,
        label: "Gemini",
        description: "Uses Gemini to generate a response",
        icon: "/logos/gemini.svg",
    },
    {
        type: NodeType.OPENAI,
        label: "OpenAI",
        description: "Uses OpenAI to generate a response",
        icon: "/logos/openai.svg",
    },
    {
        type: NodeType.ANTHROPIC,
        label: "Anthropic",
        description: "Uses Anthropic to generate a response",
        icon: "/logos/anthropic.svg",
    },
    {
        type: NodeType.OPENROUTER,
        label: "OpenRouter",
        description: "Uses OpenRouter to generate a response",
        icon: "/logos/openrouter.svg",
    },
    {
        type: NodeType.DISCORD,
        label: "Discord",
        description: "Send a message to Discord",
        icon: "/logos/discord.svg",
    },
    {
        type: NodeType.SLACK,
        label: "Slack",
        description: "Send a message to Slack",
        icon: "/logos/slack.svg",
    },
    {
        type: NodeType.TELEGRAM,
        label: "Telegram",
        description: "Send a message to Telegram",
        icon: "/logos/telegram.svg",
    },
];

interface NodeSelectorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
};

/**
 * Renders a right-side sheet UI that lets the user pick a node type to add to the workflow.
 *
 * Selecting a node will add a new node to the React Flow instance: if an `INITIAL` node exists the selection replaces all nodes, otherwise it appends the new node positioned near the center of the viewport. Selecting a `MANUAL_TRIGGER` will show an error and abort if a manual trigger already exists.
 *
 * @param open - Whether the sheet is open
 * @param onOpenChange - Callback invoked with the new open state when the sheet is opened or closed
 * @param children - Trigger element that opens the sheet when interacted with
 * @returns The NodeSelector sheet component JSX
 */
export function NodeSelector ({
    open,
    onOpenChange,
    children
}: NodeSelectorProps) {

    const {setNodes, getNodes, screenToFlowPosition} = useReactFlow();
    const handleNodeSelect = useCallback((selection: NodeTypeOption) => {
        if (selection.type === NodeType.MANUAL_TRIGGER) {
            const nodes = getNodes();
            const hasManualTrigger = nodes.some(
                (node) => node.type === NodeType.MANUAL_TRIGGER
            );
            if(hasManualTrigger) {
                toast.error("Only one manual trigger is allowed per workflow");
                return;
            }
        }

        setNodes((nodes) => {
            const hasInitialTrigger = nodes.some(
                (node) => node.type === NodeType.INITIAL,
            );
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;

            const flowPosition = screenToFlowPosition({
                x: centerX + (Math.random() - 0.5)*200,
                y: centerY + (Math.random() - 0.5)*200,
            })

            const newNode = {
                id: createId(),
                data: {},
                position: flowPosition,
                type: selection.type
            };

            if(hasInitialTrigger) {
                return [newNode];
            }
            return [...nodes, newNode];
        });

        onOpenChange(false)

    }, [setNodes, getNodes, onOpenChange, screenToFlowPosition]);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetTrigger asChild>
                {children}
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>
                        What triggers this workflow?
                    </SheetTitle>
                    <SheetDescription>
                        A trigger is a step that starts your workflow
                    </SheetDescription>
                </SheetHeader>
                <div>
                    {triggerNodes.map((nodeType) => {
                        const Icon = nodeType.icon;
                        return (
                            <div
                                key={nodeType.type}
                                className="w-full justify-start h-auto py-5 px-4 rounded-none cursor-pointer border-l-2 border-transparent hover:border-l-primary"
                                onClick={() => handleNodeSelect(nodeType)}
                            >
                                <div className="flex items-center gap-6 w-full overflow-hidden">
                                    {typeof Icon === "string" ? (
                                        <img src={Icon} alt={nodeType.label} className="size-5 rounded-sm object-contain" />
                                    ) : (
                                        <Icon className="size-5" />
                                    )}
                                    <div className="flex flex-col items-start text-left">
                                        <span className="font-medium text-sm">
                                            {nodeType.label}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {nodeType.description}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
                <Separator />
                <div>
                    {executionNodes.map((nodeType) => {
                        const Icon = nodeType.icon;
                        return (
                            <div
                                key={nodeType.type}
                                className="w-full justify-start h-auto py-5 px-4 rounded-none cursor-pointer border-l-2 border-transparent hover:border-l-primary"
                                onClick={() => handleNodeSelect(nodeType)}
                            >
                                <div className="flex items-center gap-6 w-full overflow-hidden">
                                    {typeof Icon === "string" ? (
                                        <img src={Icon} alt={nodeType.label} className="size-5 rounded-sm object-contain" />
                                    ) : (
                                        <Icon className="size-5" />
                                    )}
                                    <div className="flex flex-col items-start text-left">
                                        <span className="font-medium text-sm">
                                            {nodeType.label}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {nodeType.description}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </SheetContent>
        </Sheet>
    )
}