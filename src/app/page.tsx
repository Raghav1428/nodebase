import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { ProductDemo } from "@/components/landing/product-demo";
import { Features } from "@/components/landing/features";
import { Pricing } from "@/components/landing/pricing";
import { CTA } from "@/components/landing/cta";
import { Footer } from "@/components/landing/footer";

export default function LandingPage() {

  return (
    <main className="min-h-screen bg-neutral-950 text-white selection:bg-primary selection:text-white">
      <Navbar />
      <Hero />
      <ProductDemo />
      <Features />
      <Pricing />
      <CTA />
      <Footer />
    </main>
  );
}
