"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";

export function EntityCardList({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-2">{children}</div>;
}

export function EntityCard({
  children,
  index = 0,
  href,
  className = "",
}: {
  children: React.ReactNode;
  index?: number;
  href?: string;
  className?: string;
}) {
  const reducedMotion = useReducedMotion() ?? false;
  const body = (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.25, delay: Math.min(index, 20) * 0.02, ease: "easeOut" }}
      className={`group flex items-center gap-4 rounded-md border border-border-steel bg-paper px-4 py-4 transition-colors duration-150 hover:border-teal ${className}`}
    >
      {children}
    </motion.div>
  );
  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}
