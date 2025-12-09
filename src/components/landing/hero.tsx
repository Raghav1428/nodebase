"use client";

import DarkVeil from "./dark-veil";
import { ShinyButton } from "../ui/shiny-button";
import { motion } from "framer-motion";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export const Hero = () => {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  return (
    <div id="home" className="min-h-[30rem] w-full relative flex flex-col items-center justify-center antialiased overflow-hidden pb-10">
        <div className="absolute inset-0 top-16 w-full h-full">
            <DarkVeil />
             <div className="absolute inset-0 bg-neutral-950/30 bg-gradient-to-t from-neutral-950 via-transparent to-transparent pointer-events-none" />
        </div>

      <div className="max-w-4xl mx-auto p-4 relative z-10 w-full pt-32 md:pt-48">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          className="text-center"
        >
          <h1 className="text-5xl md:text-8xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60 text-center font-sans tracking-tight mb-6">
            Automate your workflows
          </h1>
          <p className="text-neutral-200/90 max-w-lg mx-auto my-4 text-base md:text-xl text-center relative z-10 font-light tracking-wide">
            Build, test, and deploy powerful automation workflows visually. No coding required. Just drag, drop, and automate.
          </p>
          <div className="mt-10 flex justify-center gap-4">
             <ShinyButton onClick={() => router.push(session ? "/workflows" : "/signup")} disabled={isPending} className="bg-black/50 backdrop-blur-md border border-white/10 hover:bg-black/70">
               Get Started
             </ShinyButton>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
