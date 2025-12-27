import { parse } from 'shell-quote';

/**
 * Parses a space-separated arguments string respecting shell quoting rules.
 * Handles quoted arguments, escaped characters, and special shell syntax.
 * 
 * @example
 * parseArgs('file.mjs "path with spaces" --flag') 
 * // Returns: ['file.mjs', 'path with spaces', '--flag']
 */
export function parseArgs(argsString: string | undefined): string[] {
    if (!argsString || !argsString.trim()) {
        return [];
    }

    const parsed = parse(argsString);

    // shell-quote can return objects for operators like { op: '|' }
    // Filter to only string arguments
    return parsed.filter((arg): arg is string => typeof arg === 'string');
}
