import { EditorError, EditorLoading } from "@/features/editor/components/editor";
import { EditorHeader, ViewModeSelector } from "@/features/editor/components/editor-header";
import { WorkflowEditor } from "@/features/editor/components/workflow-editor";
import { prefetchWorkflow } from "@/features/workflows/server/prefetch";
import { requireAuth } from "@/lib/auth-utils";
import { HydrateClient } from "@/trpc/server";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

interface PageProps {
    params: Promise<{
        workflowId: string;
    }>
};

const Page = async ( { params }: PageProps) => {

    await requireAuth();

    const { workflowId } = await params;
    prefetchWorkflow(workflowId);

    return(
        <HydrateClient>
            <ErrorBoundary fallback={<EditorError/>}>
                <Suspense fallback={<EditorLoading/>}>
                    <EditorHeader workflowId={workflowId} />
                    <main className="flex-1 relative">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[10]">
                            <ViewModeSelector />
                        </div>
                        <WorkflowEditor workflowId={workflowId}/>
                    </main>
                </Suspense>
            </ErrorBoundary>
        </HydrateClient>
    )
}

export default Page;