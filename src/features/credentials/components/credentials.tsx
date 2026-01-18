"use client";

import { formatDistanceToNow } from "date-fns";
import { EmptyView, EntityContainer, EntityHeader, EntityItem, EntityList, EntityPagination, EntitySearch, ErrorView, LoadingView } from "@/components/entity-components";
import { useRouter } from "next/navigation";
import { useCredentialParams } from "../hooks/use-credential-params";
import { useEntitySearch } from "../hooks/use-entity-search";
import { CredentialType, type Credential } from "@/generated/prisma"
import { useRemoveCredential, useSuspenseCredentials } from "../hooks/use-credentials";
import Image from "next/image";
import { getLogoClassName } from "@/lib/logo-utils";

export const CredentialsSearch = () => {

    const [params, setParams] = useCredentialParams();
    const {searchValue, onSearchChange} = useEntitySearch({
        params,
        setParams
    })

    return(
        <EntitySearch 
            value={searchValue}
            onChange={onSearchChange}
            placeholder="Search credentials"
        />
    );
}

export const CredentialsList = () => {
    const credentials = useSuspenseCredentials();

    return (
        <EntityList 
            items={credentials.data.items}
            getKey={(credential) => credential.id}
            renderItem={(credential) => <CredentialsItem data={credential}/>}
            emptyView={<CredentialsEmpty/>}
        />
    )
}

export const CredentialsHeader = ({ disabled }: {disabled?: boolean}) => {

    return (
        <EntityHeader 
            title="Credentials"
            description="Create and manage your credentials"
            newButtonHref="/credentials/new"
            newButtonLabel="New credential"
            disabled={disabled}
        />
    )
}

export const CredentialsPagination = () => {
    const credentials = useSuspenseCredentials();
    const [params, setParams] = useCredentialParams();
    return (
        <EntityPagination
            disabled={credentials.isFetching}
            totalPages={credentials.data.totalPages}
            page={credentials.data.page}
            onPageChange={(page) => setParams({...params, page})}
        />
    );
};

export const CredentialsContainer = ({children}: {children: React.ReactNode}) => {
    return (
        <EntityContainer
            header={<CredentialsHeader/>}
            search={<CredentialsSearch/>}
            pagination={<CredentialsPagination/>}
        >
            {children}
        </EntityContainer>
    );
}

export const CredentialsLoading = () => {
    return <LoadingView message="Loading credentials..."/>
}

export const CredentialsError = () => {
    return <ErrorView message="Error loading credentials..."/>
}

export const CredentialsEmpty = () => {

    const router = useRouter();

    const handleCreate = () => {
        router.push(`/credentials/new`);
    };

    return (
        <EmptyView onNew={handleCreate} message="No credentials found. Get started by creating a credential."/>
    )
}

const credentialLogos: Record<CredentialType, string> = {
    [CredentialType.GEMINI]: "/logos/gemini.svg",
    [CredentialType.OPENAI]: "/logos/openai.svg",
    [CredentialType.ANTHROPIC]: "/logos/anthropic.svg",
    [CredentialType.OPENROUTER]: "/logos/openrouter.svg",
    [CredentialType.POSTGRES]: "/logos/postgres.svg",
    [CredentialType.MONGODB]: "/logos/mongodb.svg",
    [CredentialType.EMAIL_SMTP]: "/logos/email.svg",
    [CredentialType.EMAIL_GMAIL]: "/logos/google.svg",
    [CredentialType.GOOGLE_SHEETS]: "/logos/google.svg",
}

export const CredentialsItem = ({ data }: { data: Credential }) => {

    const removeCredential = useRemoveCredential();
    const handleRemove = () => {
        removeCredential.mutate({
            id: data.id
        })
    }

    const logo = credentialLogos[data.type] || "/logos/openai.svg";

    return(
        <EntityItem
            href={`/credentials/${data.id}`}
            title={data.name}
            subtitle={
                <>
                    Updated {formatDistanceToNow(data.updatedAt, { addSuffix: true })}{" "}
                    &bull; Created{" "}
                    {formatDistanceToNow(data.createdAt, { addSuffix: true })}
                </>
            }
            image={
                <div className="size-8 flex items-center justify-center">
                    <Image src={logo} alt={data.type} width={30} height={30} className={getLogoClassName(logo)}/>
                </div>
            }
            onRemove={handleRemove}
            isRemoving={removeCredential.isPending}
        />
    )
}