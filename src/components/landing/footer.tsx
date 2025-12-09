"use client";

import React from "react";
import Link from "next/link";
import { Container } from "../ui/container";
import { Github, Twitter, Disc, Linkedin } from "lucide-react";

export const Footer = () => {
    return (
        <footer className="bg-neutral-950 border-t border-white/10 py-12 md:py-16">
            <Container>
                {/* Make footer content read as a navigation region for assistive tech */}
                <nav aria-label="Footer" className="mb-12">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
                        {/* Brand / about */}
                        <div className="sm:col-span-2 lg:col-span-2 flex flex-col">
                            <Link href="/" className="flex items-center gap-3 mb-4">
                                <img
                                    src="/logos/logo.svg"
                                    alt="nodebase.ai"
                                    className="h-8 w-auto"
                                    width={128}
                                    height={32}
                                />
                                <span className="font-bold text-xl tracking-tighter text-white">Nodebase</span>
                            </Link>

                            <p className="text-neutral-400 text-sm max-w-md mb-6">
                                Building the next generation of automation infrastructure. Visual workflows for modern developers.
                            </p>

                            <div className="flex items-center gap-4 mt-auto">
                                <Link
                                    href="https://github.com/Raghav1428/nodebase"
                                    className="text-neutral-400 hover:text-white transition-colors"
                                    aria-label="Nodebase on GitHub"
                                >
                                    <Github className="h-5 w-5" />
                                    <span className="sr-only">GitHub</span>
                                </Link>

                                <Link
                                    href="http://www.linkedin.com/in/raghav-seth-a49902205"
                                    className="text-neutral-400 hover:text-white transition-colors"
                                    aria-label="Raghav Seth on LinkedIn"
                                >
                                    <Linkedin className="h-5 w-5" />
                                    <span className="sr-only">LinkedIn</span>
                                </Link>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-semibold text-white mb-4">Product</h3>
                            <ul className="space-y-2" role="list" aria-label="Product links">
                                <li>
                                    <Link href="#features" className="text-neutral-400 hover:text-white text-sm transition-colors">Features</Link>
                                </li>
                                <li>
                                    <Link href="#pricing" className="text-neutral-400 hover:text-white text-sm transition-colors">Pricing</Link>
                                </li>
                                <li>
                                    <Link href="/workflows" className="text-neutral-400 hover:text-white text-sm transition-colors">Workflows</Link>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-semibold text-white mb-4">Legal</h3>
                            <ul className="space-y-2" role="list" aria-label="Legal links">
                                <li>
                                    <Link href="/privacy" className="text-neutral-400 hover:text-white text-sm transition-colors">Privacy Policy</Link>
                                </li>
                                <li>
                                    <Link href="/terms" className="text-neutral-400 hover:text-white text-sm transition-colors">Terms of Service</Link>
                                </li>
                                <li>
                                    <Link href="/cookie-policy" className="text-neutral-400 hover:text-white text-sm transition-colors">Cookie Policy</Link>
                                </li>
                            </ul>
                        </div>
                    </div>
                </nav>

                <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-neutral-500 text-sm">
                        &copy; {new Date().getFullYear()} Nodebase. All rights reserved.
                    </p>
                </div>
            </Container>
        </footer>
    );
};
