import { useTRPC } from "@/trpc/client"
import { useExecutionParams } from "./use-execution-params";
import { useSuspenseQuery } from "@tanstack/react-query";

/**
 * Hook to fetch executions using suspense
 */
export const useSuspenseExecutions = () => {
    const trpc= useTRPC();
    const [params] = useExecutionParams();

    return useSuspenseQuery(trpc.executions.getMany.queryOptions(params));
}

/**
 * Hook to fetch a single execution using suspense
 */
export const useSuspenseExecution = (id: string) => {
    const trpc = useTRPC();
    return useSuspenseQuery(trpc.executions.getOne.queryOptions({ id }));
}
