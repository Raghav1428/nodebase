"use client";

import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { Container } from "@/components/ui/container";
import React from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "./ui/button";

export function LegalLayout({ 
  children, 
  title, 
  date,
}: { 
  children: React.ReactNode; 
  title: string; 
  date: string;
}) {
  return (
    <main className="min-h-screen bg-neutral-950 text-white selection:bg-primary selection:text-white relative overflow-hidden">
      <Navbar />
      
      <div className="absolute top-0 left-0 w-full h-[500px] bg-primary/10 blur-[120px] -z-10 rounded-full pointer-events-none" />

      <div className="pt-32 pb-20 relative z-10">
        <Container>
          <div className="flex flex-col lg:flex-row gap-12">
            <aside className="lg:w-64 flex-shrink-0 hidden lg:block">
              <div className="sticky top-32 space-y-8">
                <div>
                   <Link href="/" className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors group">
                      <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                      Back to Home
                   </Link>
                </div>

                <div>
                    <Button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors">
                        <Printer className="w-4 h-4" />
                        Print this page
                    </Button>
                </div>
              </div>
            </aside>

            <div className="flex-1 max-w-3xl">
                <header className="mb-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-neutral-300 mb-6">
                        <span>Last updated: {date}</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60 tracking-tight mb-6">
                        {title}
                    </h1>
                     <div className="h-1 w-20 bg-primary/50 rounded-full" />
                </header>

                <div className="bg-neutral-900/50 border border-white/5 rounded-2xl p-8 md:p-12 backdrop-blur-sm">
                    <article className="prose prose-invert prose-neutral max-w-none 
                        prose-headings:text-white prose-headings:font-semibold prose-headings:tracking-tight
                        prose-headings:scroll-mt-24
                        prose-p:text-neutral-400 prose-p:leading-relaxed
                        prose-strong:text-white prose-strong:font-medium
                        prose-ul:text-neutral-400 prose-li:marker:text-primary
                        prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                        prose-hr:border-white/10">
                    {children}
                    </article>
                </div>
                
                {/* Mobile Back Link */}
                <div className="mt-12 lg:hidden">
                     <Link href="/" className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors">
                      <ArrowLeft className="w-4 h-4" />
                      Back to Home
                   </Link>
                </div>
            </div>
          </div>
        </Container>
      </div>
      <Footer />
    </main>
  );
}
