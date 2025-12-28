"use client";

import {
    CreditCardIcon, 
    FolderOpenIcon,
    HistoryIcon,
    icons,
    KeyIcon,
    LogOutIcon,
    StarIcon
} from "lucide-react"; 
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSubItem,
    useSidebar,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { useHasActiveSubscription } from "@/features/subscriptions/hooks/use-subscription";
import { useExecutionUsage } from "@/features/executions/hooks/use-executions";
import { Progress } from "@/components/ui/progress";
import { CircularProgress } from "@/components/ui/circular-progress";

const menuItems = [
    {
        title: "Main",
        items: [
            {
                title: "Workflows",
                icon: FolderOpenIcon,
                url: "/workflows"
            },
            {
                title: "Credentials",
                icon: KeyIcon,
                url: "/credentials"
            },
            {
                title: "Executions",
                icon: HistoryIcon,
                url: "/executions"
            },
        ]
    }
]

export const AppSideBar = () => {

    const router = useRouter();
    const pathname = usePathname();
    const { hasActiveSubscription, isLoading } = useHasActiveSubscription();
    const usageQuery = useExecutionUsage();
    const { state } = useSidebar();
    
    const usedCount = usageQuery.data?.count || 0;
    const limit = 100;
    const remainingCount = Math.max(0, limit - usedCount);
    const remainingPercentage = Math.min(100, (remainingCount / limit) * 100);

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild className="gap-x-4 h-10 px-4">
                        <Link href="/" prefetch>
                            <Image src="/logos/logo.svg" alt="nodebase logo" width={30} height={30} />
                            <span className="font-semibold text-sm">Nodebase</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarHeader>
            <SidebarContent>
                {menuItems.map((group) => (
                    <SidebarGroup key={group.title}>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {group.items.map((item) => (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton
                                            tooltip={item.title}
                                            isActive={
                                                item.url === "/"
                                                    ? pathname === "/"
                                                    : pathname.startsWith(item.url)
                                            }
                                            asChild
                                            className="gap-x-4 h-10 px-4"
                                        >
                                            <Link href={item.url} prefetch>
                                                <item.icon className="size-4" />
                                                <span>{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenu>
                    {!hasActiveSubscription && !isLoading && (
                        <SidebarMenuItem>
                            {state === "collapsed" ? (
                                <div className="flex justify-center py-2" title={`${remainingCount} executions remaining`}>
                                     <CircularProgress value={remainingPercentage} size={20} className="text-muted-foreground" />
                                </div>
                            ) : (
                                <div className="px-4 py-2">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                                        <span>Executions Remaining</span>
                                        <span>{`${remainingCount} / ${limit}`}</span>
                                    </div>
                                    {!hasActiveSubscription && (
                                        <Progress value={remainingPercentage} className="h-2" />
                                    )}
                                </div>
                            )}
                        </SidebarMenuItem>
                    )}
                    {!hasActiveSubscription && !isLoading && (
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                tooltip="Upgrade to Pro"
                                className="gap-x-4 h-10 px-4"
                                onClick={() => authClient.checkout({
                                    slug: "pro"
                                })}                        
                            >
                                <StarIcon className="h-4 w-4" />
                                <span>Upgrade to Pro</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    )}
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            tooltip="Billing Portal"
                            className="gap-x-4 h-10 px-4"
                            onClick={() => authClient.customer.portal()}                        
                        >
                            <CreditCardIcon className="h-4 w-4" />
                            <span>Billing Portal</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            tooltip="Sign out"
                            className="gap-x-4 h-10 px-4"
                            onClick={() => {
                                authClient.signOut({
                                    fetchOptions: {
                                        onSuccess: () => {
                                            router.push("/")
                                        }
                                    }
                                })
                            }}                        
                        >
                            <LogOutIcon className="h-4 w-4" />
                            <span>Sign out</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    )
};