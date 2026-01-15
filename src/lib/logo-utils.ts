/**
 * Black logos that need to be inverted in dark mode.
 * These logos are primarily black/dark colored and won't be visible on dark backgrounds.
 */
export const BLACK_LOGOS = [
    "/logos/openai.svg",
    "/logos/anthropic.svg",
    "/logos/github.svg",
    "/logos/mcp.svg",
    "/logos/openrouter.svg",
    "/logos/ai-agent.svg",
    "/logos/email.svg",
    "/logos/webhook.svg",
] as const;

/**
 * Check if a logo path is a black logo that needs dark mode inversion.
 */
export function isBlackLogo(logoPath: string): boolean {
    return BLACK_LOGOS.includes(logoPath as typeof BLACK_LOGOS[number]);
}

/**
 * Get the appropriate className for a logo based on whether it needs dark mode inversion.
 * @param logoPath - The path to the logo
 * @param additionalClasses - Optional additional classes to include
 * @returns CSS classes including 'dark-invert' if the logo is black
 */
export function getLogoClassName(logoPath: string, additionalClasses?: string): string {
    const classes: string[] = [];

    if (additionalClasses) {
        classes.push(additionalClasses);
    }

    if (isBlackLogo(logoPath)) {
        classes.push("dark-invert");
    }

    return classes.join(" ");
}
