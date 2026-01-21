"use client";

import { formatDistanceToNow } from "date-fns";
import { EmptyView, EntityContainer, EntityHeader, EntityItem, EntityList, EntityPagination, EntitySearch, ErrorView, LoadingView, EntityListSkeleton } from "@/components/entity-components";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Execution, ExecutionStatus } from "@/generated/prisma";
import { useSuspenseExecutions } from "../hooks/use-executions";
import { useExecutionParams } from "../hooks/use-execution-params";
import { CheckCircle2Icon, ClockIcon, Loader2Icon, XCircleIcon } from "lucide-react";

export const ExecutionsList = ({ workflowId }: { workflowId?: string }) => {
    const executions = useSuspenseExecutions(workflowId);

    return (
        <EntityList 
            items={executions.data.items}
            getKey={(execution) => execution.id}
            renderItem={(execution, index) => (
                <div data-onboarding={index === 0 ? "first-execution-row" : undefined}>
                    <ExecutionsItem data={execution}/>
                </div>
            )}
            emptyView={<ExecutionsEmpty/>}
        />
    )
}

export const ExecutionsHeader = () => {

    return (
        <div data-onboarding="executions-header">
            <EntityHeader 
                title="Executions"
                description="View your workflow execution history"
            />
        </div>
    )
}

export const ExecutionsPagination = ({ workflowId }: { workflowId?: string }) => {
    const executions = useSuspenseExecutions(workflowId);
    const [params, setParams] = useExecutionParams();
    return (
        <EntityPagination
            disabled={executions.isFetching}
            totalPages={executions.data.totalPages}
            page={executions.data.page}
            onPageChange={(page) => setParams({...params, page})}
        />
    );
};

export const ExecutionsContainer = ({children, workflowId}: {children: React.ReactNode, workflowId?: string}) => {
    return (
        <EntityContainer
            header={<ExecutionsHeader/>}
            pagination={<ExecutionsPagination workflowId={workflowId}/>}
            containerDataOnboarding="executions-container"
        >
            {children}
        </EntityContainer>
    );
}

export const ExecutionsLoading = () => {
    return <EntityListSkeleton firstItemOnboardingId="first-execution-row" />
}

export const ExecutionsContainerSkeleton = () => {
    return (
        <EntityContainer
             header={<ExecutionsHeader/>}
        >
            <ExecutionsLoading />
        </EntityContainer>
    )
}

export const ExecutionSkeleton = () => {
    return (
        <Card className="shadow-none">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <Skeleton className="size-5 rounded-full" />
                    <div>
                        <Skeleton className="h-6 w-32 mb-1" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i}>
                            <Skeleton className="h-4 w-24 mb-2" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}

export const ExecutionsError = () => {
    return <ErrorView message="Error loading executions..."/>
}

export const ExecutionsEmpty = () => {
    return (
        <EmptyView message="You have no executions yet. Get started by running your first workflow."/>
    )
}

const getStatusIcon = (status: ExecutionStatus) => {
    switch(status) {
        case ExecutionStatus.SUCCESS:
            return <CheckCircle2Icon className="size-5 text-green-600" />;

        case ExecutionStatus.FAILED:
            return <XCircleIcon className="size-5 text-red-600" />;

        case ExecutionStatus.RUNNING:
            return <Loader2Icon className="size-5 text-blue-600 animate-spin" />;

        default:
            return <ClockIcon className="size-5 text-muted-foreground" />;
    }
}

const formatStatus = (status: ExecutionStatus) => {
    return status.charAt(0) + status.slice(1).toLowerCase();
}

export const ExecutionsItem = ({ data }: { data: Execution & { workflow: { id: string, name: string } } }) => {

    const duration = data.completedAt ? Math.round((new Date(data.completedAt).getTime() - new Date(data.startedAt).getTime()) / 1000) : null;
    const subtitle = (
        <>
            {data.workflow.name} &bull; Started{" "}
            {formatDistanceToNow(data.startedAt, { addSuffix: true})}
            {duration !== null && <> &bull; Took {duration} seconds</>}
        </>
    )

    return(
        <EntityItem
            href={`/executions/${data.id}`}
            title={formatStatus(data.status)}
            subtitle={subtitle}
            image={
                <div className="size-8 flex items-center justify-center">
                    {getStatusIcon(data.status)}
                </div>
            }
        />
    )
}