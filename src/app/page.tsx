"use client";

import { requireAuth } from "@/lib/auth-utils";
import { caller } from "@/trpc/server";
import { LogoutButton } from "./logout";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { use } from "react";
import { toast } from "sonner";

const Page = () => {

  // await requireAuth();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const testAi = useMutation(trpc.testAi.mutationOptions({
    onSuccess: () => {
      toast.success("AI Job queued")
    }
  }));

  const { data } = useQuery(trpc.getWorkflows.queryOptions());

  const create = useMutation(trpc.createWorkflow.mutationOptions({
    onSuccess: () => {
      toast.success("Workflow created");
    }
  }));

  return (
    <div className="min-h-screen min-w-screen flex items-center justify-center flex-col gap-y-6">
      <div>
        protected server component
        {JSON.stringify(data, null ,2)}
      </div>
      <Button disabled={testAi.isPending} onClick={() => {
        testAi.mutate()
      }}>
        Test AI
      </Button>
      <Button disabled={create.isPending} onClick={() => create.mutate()}>
        Create Workflow
      </Button>
      <LogoutButton/>
    </div>
    
  );
}

export default Page;