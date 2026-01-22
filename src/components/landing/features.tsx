"use client";

import { Box, Lock, Search, Settings, Sparkles, Workflow } from "lucide-react";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { Container } from "@/components/ui/container";
import React from "react";

export function Features() {
  return (
    <section id="features" className="bg-neutral-950">
      <Container>
        <div className="mb-12 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-neutral-200 to-neutral-500">
            Why Choose <strong className="text-primary">Nodebase</strong>?
          </h2>
          <p className="text-neutral-400 max-w-lg mx-auto">
            Packed with features to supercharge your automation development.
          </p>
        </div>
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <GridItem
            icon={<Box className="h-4 w-4 text-white" />}
            title="Visual Workflow Builder"
            description="Drag and drop nodes to create complex automations in minutes. No coding required."
          />

          <GridItem
            icon={<Settings className="h-4 w-4 text-white" />}
            title="AI-Powered Nodes"
            description="Leverage the power of LLMs directly within your workflows for intelligent decision making."
          />

          <GridItem
            icon={<Lock className="h-4 w-4 text-white" />}
            title="Enterprise-Grade Security"
            description="SOC2 compliant infrastructure with end-to-end encryption for your sensitive data."
          />

          <GridItem
            icon={<Sparkles className="h-4 w-4 text-white" />}
            title="Real-time Analytics"
            description="Monitor execution logs, track performance, and debug workflows in real-time."
          />

          <GridItem
            icon={<Search className="h-4 w-4 text-white" />}
            title="Global Edge Execution"
            description="Deploy your workflows to our global edge network for lightning-fast response times worldwide."
          />

          <GridItem
            icon={<Workflow className="h-4 w-4 text-white" />}
            title="Seamless Integrations"
            description="Connect with your favorite tools and services with over 20+ pre-built integrations."
          />
        </ul>
      </Container>
    </section>
  );
}

interface GridItemProps {
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
}

const GridItem = ({ icon, title, description }: GridItemProps) => {
  return (
    <li className="min-h-[14rem] list-none">
      <div className="relative h-full rounded-2xl border border-white/5 p-2 md:rounded-3xl md:p-3 bg-neutral-900/50">
        <GlowingEffect
          blur={0}
          borderWidth={3}
          spread={80}
          glow={true}
          disabled={false}
          proximity={64}
          inactiveZone={0.01}
        />
        <div className="border-0.75 relative flex h-full flex-col justify-between gap-6 overflow-hidden rounded-xl p-6 md:p-6 shadow-none">
          <div className="relative flex flex-1 flex-col justify-between gap-3">
            <div className="w-fit rounded-lg border border-white/10 p-2 bg-neutral-800">
              {icon}
            </div>
            <div className="space-y-3">
              <h3 className="-tracking-4 pt-0.5 font-sans text-xl/[1.375rem] font-semibold text-balance text-white md:text-2xl/[1.875rem]">
                {title}
              </h3>
              <h2 className="font-sans text-sm/[1.125rem] text-neutral-400 md:text-base/[1.375rem]">
                {description}
              </h2>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
};
