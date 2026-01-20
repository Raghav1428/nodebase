import { prefetchWorkflows } from "@/features/workflows/server/prefetch";
import { requireAuth } from "@/lib/auth-utils";
import { HydrateClient } from "@/trpc/server";
import { ErrorBoundary } from "react-error-boundary";
import { Suspense } from "react";
import { WorkflowsContainer, WorkflowsContainerSkeleton, WorkflowsError, WorkflowsList, WorkflowsLoading } from "@/features/workflows/components/workflows";
import type { SearchParams } from "nuqs/server";
import { workflowParamsLoader } from "@/features/workflows/server/params-loader";

type Props = {
    searchParams: Promise<SearchParams>;
}

const Page = async ({searchParams}: Props) => {

    await requireAuth();

    const params = await workflowParamsLoader(searchParams);
    prefetchWorkflows(params);

    return(
        <HydrateClient>
            <ErrorBoundary fallback={<WorkflowsError/>}>
                <Suspense fallback={<WorkflowsContainerSkeleton/>}>
                    <WorkflowsContainer>
                        <Suspense fallback={<WorkflowsLoading/>}>
                            <WorkflowsList />
                        </Suspense>
                    </WorkflowsContainer>
                </Suspense>
            </ErrorBoundary>
        </HydrateClient>
    )
}

export default Page;
