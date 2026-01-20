"use client";

import { Suspense, useEffect } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { viewModeAtom } from "../store/atoms";
import { Editor } from "./editor";
import { ExecutionsContainer, ExecutionsList, ExecutionsLoading, ExecutionsContainerSkeleton } from "@/features/executions/components/executions";

export const WorkflowEditor = ({ workflowId }: { workflowId: string }) => {
    const viewMode = useAtomValue(viewModeAtom);
    const setViewMode = useSetAtom(viewModeAtom);

    useEffect(() => {
        return () => setViewMode('workflow');
    }, [setViewMode]);

    if (viewMode === 'executions') {
        return (
            <div className="flex-1 h-full p-4">
                <Suspense fallback={<ExecutionsContainerSkeleton/>}>
                     <ExecutionsContainer workflowId={workflowId}>
                        <ExecutionsList workflowId={workflowId} />
                     </ExecutionsContainer>
                </Suspense>
            </div>
        )
    }

    return <Editor workflowId={workflowId} />
}
