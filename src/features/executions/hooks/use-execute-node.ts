"use client";

import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";

/**
 * Hook to execute a single node for testing
 */
export const useExecuteNode = () => {
    const trpc = useTRPC();

    return useMutation(trpc.workflows.executeNode.mutationOptions({}));
};
