"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

const tiers = [
  {
    name: "Starter",
    price: "Free",
    description: "Perfect for hobbyists and students.",
    features: [
      "Access to basic features",
      "Community support",
      "3 workflows",
      "3 Credentials",
      "100 executions per month",
    ],
    highlight: false,
    cta: "Get Started",
  },
  {
    name: "Pro",
    price: "$1.49",
    description: "For professionals who need more power.",
    features: [
      "Early access to new features",
      "Priority support",
      "Unlimited workflows",
      "Unlimited Credentials",
      "Unlimited executions per month",
    ],
    highlight: true,
    cta: "Upgrade to Pro",
  },
];

export const Pricing = () => {
  const router = useRouter();
  const { data: session } = authClient.useSession();

  const handleTierClick = (tier: typeof tiers[0]) => {
    if (!session) {
      router.push("/login");
      return;
    }

    if (tier.highlight) {
      authClient.checkout({
        slug: "pro"
      });
    } else {
      router.push("/workflows");
    }
  };

  return (
    <section id="pricing" className="py-24 bg-neutral-950 relative overflow-hidden">
        {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      
      <Container>
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl md:text-4xl font-bold mb-4 tracking-tight"
          >
            Simple and Transparent Pricing
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-neutral-400 max-w-xl mx-auto"
          >
            Choose the specific plan that fits your needs. No hidden fees.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {tiers.map((tier, index) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}
              className={cn(
                "relative rounded-2xl p-8 border backdrop-blur-sm",
                tier.highlight
                  ? "border-primary/50 bg-primary/5 shadow-2xl shadow-primary/10"
                  : "border-white/10 bg-white/5"
              )}
            >
              {tier.highlight && (
                <div className="absolute -top-4 left-0 right-0 flex justify-center">
                  <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-lg font-medium text-white mb-2">{tier.name}</h3>
                <p className="text-neutral-400 text-sm mb-6">{tier.description}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">{tier.price}</span>
                  <span className="text-neutral-500">/month</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-primary shrink-0" />
                    <span className="text-neutral-300 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button 
                type="button"
                variant={tier.highlight ? "default" : "outline"}
                className={cn(
                    "w-full", 
                    !tier.highlight && "bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white"
                )}
                size="lg"
                onClick={() => handleTierClick(tier)}
              >
                {tier.cta}
              </Button>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
};
