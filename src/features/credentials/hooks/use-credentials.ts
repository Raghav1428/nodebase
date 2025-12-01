import { useTRPC } from "@/trpc/client"
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCredentialParams } from "./use-credential-params";
import { CredentialType } from "@/generated/prisma";

/**
 * Hook to fetch credentials using suspense
 */
export const useSuspenseCredentials = () => {
    const trpc= useTRPC();
    const [params] = useCredentialParams();

    return useSuspenseQuery(trpc.credentials.getMany.queryOptions(params));
}

/**
 * Hook to create a new credential
 */
export const useCreateCredential = () => {
    const queryClient = useQueryClient();
    const trpc = useTRPC();

    return useMutation(trpc.credentials.create.mutationOptions({
        onSuccess: (data) => {
            toast.success(`Credential "${data.name}" created`);
            queryClient.invalidateQueries(trpc.credentials.getMany.queryOptions({}))
        },
        onError: (error) => {
            toast.error(`Failed to create credential ${error.message}`)
        }
    }))

}

/**
 * Hook to delete a credential
 */
export const useRemoveCredential = () => {
    const trpc = useTRPC();
    const queryClient = useQueryClient();

    return useMutation(
        trpc.credentials.remove.mutationOptions({
            onSuccess: (data) => {
                toast.success(`Credential "${data.name}" deleted successfully.`);
                queryClient.invalidateQueries(trpc.credentials.getMany.queryOptions({}));
                queryClient.invalidateQueries(trpc.credentials.getOne.queryFilter({ id: data.id }));
            },
            onError: (error) => {
                toast.error(`Error: ${error.message}`)
            }
        })
    )
}

/**
 * Hook to fetch a single credential using suspense
 */
export const useSuspenseCredential = (id: string) => {
    const trpc = useTRPC();
    return useSuspenseQuery(trpc.credentials.getOne.queryOptions({ id }));
}

/**
 * Hook to update a credential
 */
export const useUpdateCredential = () => {
    const queryClient = useQueryClient();
    const trpc = useTRPC();

    return useMutation(trpc.credentials.update.mutationOptions({
        onSuccess: (data) => {
            toast.success(`Credential "${data.name}" saved`);
            queryClient.invalidateQueries(trpc.credentials.getMany.queryOptions({}));
            queryClient.invalidateQueries(trpc.credentials.getOne.queryOptions({ id: data.id}));

        },
        onError: (error) => {
            toast.error(`Failed to save credential ${error.message}`)
        }
    }));
};

/**
 * Hook to fetch credentials by type
 */
export const useCredentialByType = (type: CredentialType) => {
    const trpc = useTRPC();
    return useQuery(trpc.credentials.getByType.queryOptions({ type }));
}
