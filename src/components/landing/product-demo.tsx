"use client";
import React from "react";
import { Container } from "../ui/container";
import { motion } from "framer-motion";

export const ProductDemo = () => {
  return (
    <div className="py-10 relative bg-neutral-950 overflow-hidden"> 
      <Container>
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="w-full max-w-6xl mx-auto bg-neutral-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl relative"
        >
             <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-transparent z-10" />
             {/* Glow effect */}
             <div className="absolute -inset-1 bg-gradient-to-r from-primary to-purple-600 rounded-xl blur-xl opacity-20 -z-10 animate-pulse" />
             
             <div className="aspect-video relative bg-neutral-900/50 backdrop-blur-sm flex items-center justify-center">
                <video 
                  autoPlay 
                  loop 
                  muted 
                  playsInline
                  className="w-full h-full object-cover"
                >
                  <source src="/3385370-uhd_4096_2160_24fps.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
             </div>
        </motion.div>
      </Container>
    </div>
  );
};
