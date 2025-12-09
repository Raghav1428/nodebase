"use client";

import React from "react";
import { Container } from "../ui/container";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "../ui/button";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { authClient } from "@/lib/auth-client";
import Image from "next/image";

export const Navbar = () => {
  const { data: session } = authClient.useSession();
  return (
    <div className="fixed top-0 inset-x-0 z-50 transition-all duration-300 bg-black/20 backdrop-blur-md border-b border-white/5">
      <Container className="h-20 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl tracking-tighter flex items-center gap-2">
          <Image src="/logos/logo.svg" alt="nodebase.ai" width={72} height={72} />
        </Link>

        <div className="hidden md:block">
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuLink asChild className={cn(navigationMenuTriggerStyle(), "bg-transparent text-white hover:bg-primary/10 focus:bg-primary/10 hover:text-primary focus:text-primary")}>
                  <Link href="#home">
                    Home
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink asChild className={cn(navigationMenuTriggerStyle(), "bg-transparent text-white hover:bg-primary/10 focus:bg-primary/10 hover:text-primary focus:text-primary")}>
                  <Link href="#features">
                    Features
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink asChild className={cn(navigationMenuTriggerStyle(), "bg-transparent text-white hover:bg-primary/10 focus:bg-primary/10 hover:text-primary focus:text-primary")}>
                  <Link href="#pricing">
                    Pricing
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors">
            Login
          </Link>
          <Button size="sm" asChild>
            <Link href={session ? "/workflows" : "/signup"}>Get Started</Link>
          </Button>
        </div>
      </Container>
    </div>
  );
};
