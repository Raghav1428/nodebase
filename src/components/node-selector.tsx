"use client";

import { createId } from "@paralleldrive/cuid2"
import { useReactFlow } from "@xyflow/react";
import {
    GlobeIcon,
    MousePointer2Icon,
    TimerIcon,
    BotIcon,
    DatabaseIcon,
    WrenchIcon,
    MessageSquareIcon,
    BrainCircuitIcon,
    ZapIcon,
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
import { Badge } from "./ui/badge";
import { getLogoClassName } from "@/lib/logo-utils";

export type NodeTypeOption = {
    type: NodeType;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }> | string;
    badge?: string;
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
        type: NodeType.GOOGLE_SHEETS_TRIGGER,
        label: "Google Sheets",
        description: "Runs the flow when a Google Sheet is edited.",
        icon: "/logos/google-sheets.svg",
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

// AI Agent main node
const aiAgentNode: NodeTypeOption = {
    type: NodeType.AI_AGENT,
    label: "AI Agent",
    description: "Autonomous AI agent with memory, tools, and chat models",
    icon: "/logos/ai-agent.svg",
};

// Nodes that connect to AI Agent
const aiAgentChatModels: NodeTypeOption[] = [
    {
        type: NodeType.GEMINI_CHAT_MODEL,
        label: "Gemini Chat Model",
        description: "Google's Gemini for AI Agent conversations",
        icon: "/logos/gemini.svg",
        badge: "AI Agent",
    },
    {
        type: NodeType.OPENAI_CHAT_MODEL,
        label: "OpenAI Chat Model",
        description: "GPT models for AI Agent conversations",
        icon: "/logos/openai.svg",
        badge: "AI Agent",
    },
    {
        type: NodeType.ANTHROPIC_CHAT_MODEL,
        label: "Anthropic Chat Model",
        description: "Claude models for AI Agent conversations",
        icon: "/logos/anthropic.svg",
        badge: "AI Agent",
    },
    {
        type: NodeType.OPENROUTER_CHAT_MODEL,
        label: "OpenRouter Chat Model",
        description: "Access multiple models via OpenRouter for AI Agent",
        icon: "/logos/openrouter.svg",
        badge: "AI Agent",
    },
];

const aiAgentDatabase: NodeTypeOption[] = [
    {
        type: NodeType.POSTGRES,
        label: "PostgreSQL",
        description: "Store AI Agent chat history in PostgreSQL",
        icon: "/logos/postgres.svg",
        badge: "AI Agent",
    },
    {
        type: NodeType.MONGODB,
        label: "MongoDB",
        description: "Store AI Agent chat history in MongoDB",
        icon: "/logos/mongodb.svg",
        badge: "AI Agent",
    },
];

const aiAgentTools: NodeTypeOption[] = [
    {
        type: NodeType.MCP_TOOLS,
        label: "MCP Tools",
        description: "Connect MCP server tools to AI Agent",
        icon: "/logos/mcp.svg",
        badge: "AI Agent",
    },
];

const actionNodes: NodeTypeOption[] = [
    {
        type: NodeType.HTTP_REQUEST,
        label: "HTTP Request",
        description: "Make HTTP requests to APIs",
        icon: GlobeIcon,
    },
    {
        type: NodeType.GEMINI,
        label: "Gemini",
        description: "Generate text with Gemini (standalone)",
        icon: "/logos/gemini.svg",
    },
    {
        type: NodeType.OPENAI,
        label: "OpenAI",
        description: "Generate text with OpenAI (standalone)",
        icon: "/logos/openai.svg",
    },
    {
        type: NodeType.ANTHROPIC,
        label: "Anthropic",
        description: "Generate text with Anthropic (standalone)",
        icon: "/logos/anthropic.svg",
    },
    {
        type: NodeType.OPENROUTER,
        label: "OpenRouter",
        description: "Generate text with OpenRouter (standalone)",
        icon: "/logos/openrouter.svg",
    },
];

const messagingNodes: NodeTypeOption[] = [
    {
        type: NodeType.DISCORD,
        label: "Discord",
        description: "Send messages to Discord",
        icon: "/logos/discord.svg",
    },
    {
        type: NodeType.SLACK,
        label: "Slack",
        description: "Send messages to Slack",
        icon: "/logos/slack.svg",
    },
    {
        type: NodeType.TELEGRAM,
        label: "Telegram",
        description: "Send messages to Telegram",
        icon: "/logos/telegram.svg",
    },
    {
        type: NodeType.EMAIL,
        label: "Email",
        description: "Send emails via SMTP or Gmail",
        icon: "/logos/email.svg",
    },
    {
        type: NodeType.GOOGLE_SHEETS,
        label: "Google Sheets",
        description: "Export data to Google Spreadsheets",
        icon: "/logos/google-sheets.svg",
    },
];

interface NodeSelectorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
};

function SectionHeader({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>, title: string }) {
    return (
        <div className="flex items-center gap-2 px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <Icon className="size-4" />
            {title}
        </div>
    );
}

function NodeItem({ nodeType, onClick }: { nodeType: NodeTypeOption, onClick: () => void }) {
    const Icon = nodeType.icon;
    return (
        <div
            className="w-full justify-start h-auto py-4 px-4 rounded-none cursor-pointer border-l-2 border-transparent hover:border-l-primary hover:bg-muted/50 transition-colors"
            onClick={onClick}
            data-onboarding-type={nodeType.type}
            id={`node-item-${nodeType.type}`}
        >
            <div className="flex items-center gap-4 w-full overflow-hidden">
                {typeof Icon === "string" ? (
                    <img src={Icon} alt={nodeType.label} className={getLogoClassName(Icon, "size-5 rounded-sm object-contain")} />
                ) : (
                    <Icon className="size-5" />
                )}
                <div className="flex flex-col items-start text-left flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                            {nodeType.label}
                        </span>
                        {nodeType.badge && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                → {nodeType.badge}
                            </Badge>
                        )}
                    </div>
                    <span className="text-xs text-muted-foreground truncate w-full">
                        {nodeType.description}
                    </span>
                </div>
            </div>
        </div>
    );
}

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
                        Add Node
                    </SheetTitle>
                    <SheetDescription>
                        Select a node to add to your workflow
                    </SheetDescription>
                </SheetHeader>

                {/* Triggers */}
                <SectionHeader icon={MousePointer2Icon} title="Triggers" />
                <div>
                    {triggerNodes.map((nodeType) => (
                        <NodeItem 
                            key={nodeType.type} 
                            nodeType={nodeType} 
                            onClick={() => handleNodeSelect(nodeType)} 
                        />
                    ))}
                </div>

                <Separator className="my-1" />

                {/* Actions */}
                <SectionHeader icon={ZapIcon} title="Actions" />
                <div>
                    {actionNodes.map((nodeType) => (
                        <NodeItem 
                            key={nodeType.type} 
                            nodeType={nodeType} 
                            onClick={() => handleNodeSelect(nodeType)} 
                        />
                    ))}
                </div>

                <Separator className="my-1" />

                {/* Messaging */}
                <SectionHeader icon={MessageSquareIcon} title="Messaging" />
                <div>
                    {messagingNodes.map((nodeType) => (
                        <NodeItem 
                            key={nodeType.type} 
                            nodeType={nodeType} 
                            onClick={() => handleNodeSelect(nodeType)} 
                        />
                    ))}
                </div>

                <Separator className="my-1" />

                {/* AI Agent Section */}
                <SectionHeader icon={BotIcon} title="AI Agent" />
                <NodeItem 
                    nodeType={aiAgentNode} 
                    onClick={() => handleNodeSelect(aiAgentNode)} 
                />
                
                {/* AI Agent Sub-nodes */}
                <div className="pl-2 border-l-2 border-muted ml-4">
                    <div className="px-4 py-2 text-xs text-muted-foreground flex items-center gap-1">
                        <BrainCircuitIcon className="size-3" />
                        <span>Chat Models</span>
                    </div>
                    {aiAgentChatModels.map((nodeType) => (
                        <NodeItem 
                            key={nodeType.type} 
                            nodeType={nodeType} 
                            onClick={() => handleNodeSelect(nodeType)} 
                        />
                    ))}
                    
                    <div className="px-4 py-2 text-xs text-muted-foreground flex items-center gap-1">
                        <DatabaseIcon className="size-3" />
                        <span>Memory / Database</span>
                    </div>
                    {aiAgentDatabase.map((nodeType) => (
                        <NodeItem 
                            key={nodeType.type} 
                            nodeType={nodeType} 
                            onClick={() => handleNodeSelect(nodeType)} 
                        />
                    ))}
                    
                    <div className="px-4 py-2 text-xs text-muted-foreground flex items-center gap-1">
                        <WrenchIcon className="size-3" />
                        <span>Tools</span>
                    </div>
                    {aiAgentTools.map((nodeType) => (
                        <NodeItem 
                            key={nodeType.type} 
                            nodeType={nodeType} 
                            onClick={() => handleNodeSelect(nodeType)} 
                        />
                    ))}
                </div>
            </SheetContent>
        </Sheet>
    )
}