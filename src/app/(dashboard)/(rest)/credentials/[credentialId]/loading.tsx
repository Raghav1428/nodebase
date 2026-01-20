import { CredentialSkeleton } from "@/features/credentials/components/credentials";

export default function Loading() {
    return (
        <div className="p-4 md:px-10 md:py-6 h-full">
            <div className="mx-auto max-w-screen-md w-full flex flex-col gap-y-8 h-full">
                <CredentialSkeleton />
            </div>
        </div>
    )
}
