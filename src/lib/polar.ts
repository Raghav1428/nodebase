import { Polar } from "@polar-sh/sdk";

export const polarClient = new Polar({
    accessToken: process.env.POLAR_ACCESS_TOKEN!,
    server: (process.env.POLAR_SERVER as 'sandbox' | 'production') ?? 'sandbox',
});

const originalGetStateExternal = polarClient.customers.getStateExternal.bind(polarClient.customers);

polarClient.customers.getStateExternal = async (...args) => {
    try {
        return await originalGetStateExternal(...args);
    } catch (error: any) {
        const errorString = JSON.stringify(error);
        if (
            errorString.includes("ResourceNotFound") ||
            error?.message?.includes("Not found") ||
            error?.error === "ResourceNotFound"
        ) {
            // Return a safe default: no active subscriptions
            return { activeSubscriptions: [] } as any;
        }
        throw error;
    }
};
