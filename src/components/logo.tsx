"use client";

import { cn } from "@/lib/utils";

export function Logo({ className, size = 40 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-label="LS Notes logo"
      role="img"
    >
      <defs>
        <linearGradient id="lsLogoBg" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
          <stop stopColor="currentColor" stopOpacity="1" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.75" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill="url(#lsLogoBg)" />
      <rect x="96" y="120" width="320" height="272" rx="40" fill="white" fillOpacity="0.95" />
      <circle cx="176" cy="120" r="14" fill="currentColor" fillOpacity="0.55" />
      <circle cx="336" cy="120" r="14" fill="currentColor" fillOpacity="0.55" />
      <rect x="140" y="186" width="232" height="14" rx="7" fill="currentColor" fillOpacity="0.85" />
      <rect x="140" y="220" width="180" height="12" rx="6" fill="currentColor" fillOpacity="0.22" />
      <rect x="140" y="250" width="210" height="12" rx="6" fill="currentColor" fillOpacity="0.22" />
      <rect x="140" y="280" width="150" height="12" rx="6" fill="currentColor" fillOpacity="0.22" />
      <path
        d="M196 372 L196 322 Q196 314 204 314 L232 314 M232 372 L204 372 Q196 372 196 364 L196 350"
        stroke="currentColor"
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M300 372 Q324 372 324 358 Q324 344 300 344 Q276 344 276 330 Q276 316 300 316 L320 316"
        stroke="currentColor"
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function LogoMark({ className, size = 40 }: { className?: string; size?: number }) {
  return (
    <span
      className={cn("inline-flex items-center justify-center rounded-2xl text-primary", className)}
      style={{ width: size, height: size }}
    >
      <Logo size={size} className="text-primary" />
    </span>
  );
}
