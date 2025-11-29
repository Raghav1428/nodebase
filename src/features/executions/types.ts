import type { Realtime } from "@inngest/realtime";
import type { GetStepTools, Inngest } from "inngest";

export type WorkflowContext = Record<string, unknown>;

export type StepTools = GetStepTools<Inngest.Any>;

export interface NodeExecutionParams<TData = Record<string, unknown>> {
    data: TData;
    nodeId: string;
    context: WorkflowContext;
    step: StepTools;
    publish: Realtime.PublishFn 
}

export type NodeExecutor<TData = Record<string, unknown>, TContext = WorkflowContext> = (
    params: NodeExecutionParams<TData>
) => Promise<WorkflowContext>;