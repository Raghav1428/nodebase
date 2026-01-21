import prisma from "@/lib/db";
import { NodeType } from "@/generated/prisma";
import { getExecutor } from "@/features/executions/lib/executor-registry";
import type { WorkflowContext } from "@/features/executions/types";

// Trigger node types that should NOT be testable
const TRIGGER_NODE_TYPES: NodeType[] = [
    NodeType.INITIAL,
    NodeType.MANUAL_TRIGGER,
    NodeType.SCHEDULED_TRIGGER,
    NodeType.WEBHOOK_TRIGGER,
    NodeType.GOOGLE_FORM_TRIGGER,
    NodeType.GOOGLE_SHEETS_TRIGGER,
    NodeType.STRIPE_TRIGGER,
];

/**
 * Creates a mock step object that executes functions immediately
 * without the Inngest durability features.
 */
function createMockStep() {
    const runFn = async <T>(_name: string, fn: () => Promise<T> | T): Promise<T> => {
        return await fn();
    };

    return {
        run: runFn,
        // Mock the AI wrapper - just call the function directly
        ai: {
            wrap: async <T>(_name: string, fn: (...args: unknown[]) => Promise<T>, ...args: unknown[]): Promise<T> => {
                return await fn(...args);
            },
        },
        // Add other step methods as no-ops
        sleep: async () => { },
        sleepUntil: async () => { },
        sendEvent: async () => ({ ids: [] }),
        invoke: async () => ({}),
        waitForEvent: async () => null,
        waitForSignal: async () => null,
        sendSignal: async () => { },
        fetch: async () => new Response(),
    };
}

/**
 * Creates a no-op publish function since we don't need realtime updates for test execution
 */
function createMockPublish() {
    return async () => { };
}

interface TestNodeParams {
    workflowId: string;
    nodeId: string;
    userId: string;
    mockContext?: Record<string, unknown>;
}

interface TestNodeResult {
    success: boolean;
    output?: WorkflowContext;
    error?: string;
}

/**
 * Executes a single node for testing purposes, running synchronously
 * without the full Inngest infrastructure.
 */
export async function executeNodeForTest(params: TestNodeParams): Promise<TestNodeResult> {
    const { workflowId, nodeId, userId, mockContext = {} } = params;

    try {
        // Fetch the node from DB
        const node = await prisma.node.findFirst({
            where: {
                id: nodeId,
                workflowId,
            },
            include: {
                workflow: {
                    select: { userId: true }
                }
            }
        });

        if (!node) {
            return { success: false, error: "Node not found" };
        }

        // Verify user owns the workflow
        if (node.workflow.userId !== userId) {
            return { success: false, error: "Unauthorized" };
        }

        // Prevent testing trigger nodes
        if (TRIGGER_NODE_TYPES.includes(node.type as NodeType)) {
            return { success: false, error: "Trigger nodes cannot be tested individually" };
        }

        // Get the executor for this node type
        const executor = getExecutor(node.type as NodeType);

        // Create mock step and publish - cast through unknown to satisfy TypeScript
        const step = createMockStep() as unknown as Parameters<typeof executor>[0]["step"];
        const publish = createMockPublish() as unknown as Parameters<typeof executor>[0]["publish"];

        // Execute the node
        const result = await executor({
            data: (node.data && typeof node.data === 'object' && !Array.isArray(node.data))
                ? (node.data as Record<string, unknown>)
                : {},
            nodeId: node.id,
            userId,
            context: mockContext,
            step,
            publish,
        });
        return {
            success: true,
            output: result,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
