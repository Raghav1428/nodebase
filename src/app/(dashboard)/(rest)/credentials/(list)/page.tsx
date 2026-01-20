import { CredentialsContainer, CredentialsContainerSkeleton, CredentialsError, CredentialsList, CredentialsLoading } from "@/features/credentials/components/credentials";
import { credentialParamsLoader } from "@/features/credentials/server/params-loader";
import { prefetchCredentials } from "@/features/credentials/server/prefetch";
import { requireAuth } from "@/lib/auth-utils";
import { HydrateClient } from "@/trpc/server";
import { SearchParams } from "nuqs";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

type Props = {
    searchParams: Promise<SearchParams>
}

const Page = async ({ searchParams }: Props) => {

    await requireAuth();

    const params = await credentialParamsLoader(searchParams);
    prefetchCredentials(params);

    return(
        <HydrateClient>
            <ErrorBoundary fallback={<CredentialsError />}>
                <Suspense fallback={<CredentialsContainerSkeleton />}>
                    <CredentialsContainer>
                        <Suspense fallback={<CredentialsLoading />}>
                            <CredentialsList/>
                        </Suspense>
                    </CredentialsContainer>
                </Suspense>
            </ErrorBoundary>
        </HydrateClient>
    )
}

export default Page;