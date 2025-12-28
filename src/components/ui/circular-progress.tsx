"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface CircularProgressProps extends React.HTMLAttributes<HTMLDivElement> {
    value: number;
    size?: number;
    strokeWidth?: number;
}

export const CircularProgress = ({
    value,
    size = 16,
    strokeWidth = 3,
    className,
    ...props
}: CircularProgressProps) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (value / 100) * circumference;

    return (
        <div
            className={cn("relative flex items-center justify-center", className)}
            style={{ width: size, height: size }}
            {...props}
        >
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className="transform -rotate-90"
            >
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    className="stroke-muted-foreground/20 fill-none"
                    strokeWidth={strokeWidth}
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    className="stroke-primary fill-none transition-all duration-300 ease-in-out"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                />
            </svg>
            <span className="absolute text-[10px] font-medium sr-only">
                {Math.round(value)}%
            </span>
        </div>
    );
};
