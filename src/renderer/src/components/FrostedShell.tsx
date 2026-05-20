import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import type { PropsWithChildren } from "react";

interface FrostedShellProps {
  className?: string;
}

export function FrostedShell({
  children,
  className,
}: PropsWithChildren<FrostedShellProps>) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 26 }}
      className={cn(
        "relative flex h-full w-full flex-col overflow-hidden rounded-3xl glass-card",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 accent-glow" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      {children}
    </motion.div>
  );
}
