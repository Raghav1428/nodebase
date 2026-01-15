"use client";
import React, { useState } from "react";
import { Container } from "../ui/container";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Play } from "lucide-react";
import Image from "next/image";

const useCases = [
  {
    id: "it-ops",
    label: "IT Ops",
    description: "Provision accounts & sync",
    image: "/use-cases/it-ops.webp",
  },
  {
    id: "sec-ops",
    label: "Sec Ops",
    description: "Detect & respond to threats",
    image: "/use-cases/sec-ops.webp",
  },
  {
    id: "dev-ops",
    label: "Dev Ops",
    description: "AI-powered CI/CD triggers",
    image: "/use-cases/dev-ops.webp",
  },
  {
    id: "sales",
    label: "Sales",
    description: "Enrich leads & follow up",
    image: "/use-cases/sales.webp",
  },
];

export const ProductDemo = () => {
  const [activeCase, setActiveCase] = useState(useCases[0]);
  const [slideDirection, setSlideDirection] = useState(0);

  const handleTabClick = (useCase: typeof useCases[0]) => {
    const currentIndex = useCases.findIndex(c => c.id === activeCase.id);
    const newIndex = useCases.findIndex(c => c.id === useCase.id);
    setSlideDirection(newIndex > currentIndex ? 1 : -1);
    setActiveCase(useCase);
  };

  return (
    <div className="py-10 relative bg-neutral-950 overflow-hidden">
      <Container>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
          className="w-full max-w-6xl mx-auto bg-neutral-900/80 border border-white/10 rounded-xl overflow-hidden shadow-2xl relative"
        >
          {/* Glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-primary to-purple-600 rounded-xl blur-xl opacity-20 -z-10 animate-pulse" />

          {/* Use Case Tabs */}
          <div className="grid grid-cols-4 border-b border-white/10">
            {useCases.map((useCase, index) => (
              <button
                key={useCase.id}
                onClick={() => handleTabClick(useCase)}
                className={`group flex flex-col justify-center px-5 py-4 h-20 transition-all duration-300 ${
                  index < useCases.length - 1 ? "border-r border-white/10" : ""
                } ${
                  activeCase.id === useCase.id
                    ? "bg-gradient-to-br from-purple-900/40 to-neutral-900/80"
                    : "bg-neutral-900/50 hover:bg-neutral-800/50"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`font-semibold text-base ${
                      activeCase.id === useCase.id
                        ? "text-primary"
                        : "text-neutral-300 group-hover:text-white"
                    }`}
                  >
                    {useCase.label}
                  </span>
                  <span className="text-neutral-500 text-base">can</span>
                </span>
                <span className="flex items-center gap-2 mt-1">
                  <span className="text-amber-400">⚡</span>
                  <span
                    className={`text-sm ${
                      activeCase.id === useCase.id
                        ? "text-neutral-200"
                        : "text-neutral-400"
                    }`}
                  >
                    {useCase.description}
                  </span>
                </span>
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="aspect-video relative bg-neutral-900/50 backdrop-blur-sm overflow-hidden">
            {/* Gradient overlay at bottom */}
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-transparent z-10 pointer-events-none" />

            <AnimatePresence mode="popLayout">
              <motion.div
                key={activeCase.id}
                initial={{ opacity: 0, scale: 1.02, filter: "blur(4px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
                transition={{ 
                  duration: 0.4, 
                  ease: [0.4, 0, 0.2, 1]
                }}
                className="absolute inset-0"
              >
                <Image
                  fill
                  src={activeCase.image}
                  alt={`${activeCase.label} workflow - ${activeCase.description}`}
                  className="object-contain"
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </Container>
    </div>
  );
};
