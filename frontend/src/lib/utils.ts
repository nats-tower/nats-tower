import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// String representations of each scale
const scaleStrings = ["B", "KB", "MB", "GB", "TB", "PB", "XB"];

/**
 * Rounds a number to a specified precision
 */
function toPrecision(n: number, precision: number): number {
	const factor = 10 ** precision;
	return Math.round(n * factor) / factor;
}

/**
 * Converts a byte count into a byte string
 */
export function toStringSigBytesPerKB(
	n: number,
	sig: number,
	bytesPerKB: number,
): string {
	let f = n;
	let i;

	for (i = 0; i < scaleStrings.length; i++) {
		if (f < bytesPerKB) {
			break;
		}
		f = f / bytesPerKB;
	}

	f = toPrecision(f, sig);

	if (f === bytesPerKB) {
		return `${(f / bytesPerKB).toFixed(0)}${scaleStrings[i + 1]}`;
	}

	return `${f}${scaleStrings[i]}`;
}
