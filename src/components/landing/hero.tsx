"use client";

import DarkVeil from "./dark-veil";
import { ShinyButton } from "../ui/shiny-button";
import { ContainerScroll } from "../ui/container-scroll-animation";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Image from "next/image";

export const Hero = () => {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  return (
    <div id="home" className="w-full relative antialiased overflow-hidden">
      <div className="absolute inset-0 top-16 w-full h-full">
        <DarkVeil />
        <div className="absolute inset-0 bg-neutral-950/30 bg-gradient-to-t from-neutral-950 via-transparent to-transparent pointer-events-none" />
      </div>

      <ContainerScroll
        titleComponent={
          <>
            <h1 className="text-5xl md:text-8xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60 text-center font-sans tracking-tight mb-6">
              Automate your workflows
            </h1>
            <p className="text-neutral-200/90 max-w-lg mx-auto my-4 text-base md:text-xl text-center relative z-10 font-light tracking-wide">
              Build, test, and deploy powerful automation workflows visually. No coding required. Just drag, drop, and automate.
            </p>
          </>
        }
      >
        <div className="relative h-full w-full">
          <Image
            src="/use-cases/image.png"
            alt="IT Ops workflow - Provision accounts & sync"
            width={1911}
            height={929}
            className="rounded-2xl object-cover h-full object-left-top"
          />
        </div>
      </ContainerScroll>
    </div>
  );
};
