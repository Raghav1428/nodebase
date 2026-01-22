"use client";
import React from "react";
import { Container } from "../ui/container";
import { ShinyButton } from "../ui/shiny-button";
import { motion } from "framer-motion";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export const CTA = () => {
    const { data: session } = authClient.useSession();
    const router = useRouter();
    return (
        <section className="py-20 relative overflow-hidden bg-neutral-950">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-neutral-900/50 pointer-events-none" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(ellipse_at_top,var(--primary),transparent_50%)] opacity-20 pointer-events-none" />

            <Container className="relative z-10 flex flex-col items-center justify-center text-center">
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-3xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-neutral-400 mb-6 pb-2"
                >
                    Ready to automate your future?
                </motion.h2>
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                    className="text-neutral-400 max-w-xl mb-8 text-lg"
                >
                    Join hundreds of developers building the next generation of automation tools. Start for free today.
                </motion.p>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                >
                    <ShinyButton onClick={() => router.push(session ? "/workflows" : "/signup")} className="bg-black/50 backdrop-blur-md border border-white/10 hover:bg-black/70">
                        Start Building Now
                    </ShinyButton>
                </motion.div>
            </Container>
        </section>
    );
};
