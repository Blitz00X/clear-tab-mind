import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utility to conditionally join class names with Tailwind merge.
 *
 * @param inputs - Class values to combine.
 * @returns Merged class name string.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
