import { USDC_DECIMALS } from "./constants";

/** Convert raw USDC base units (u64) to a human-readable string. */
export function formatUsdc(baseUnits: number | bigint): string {
    const n = Number(baseUnits) / Math.pow(10, USDC_DECIMALS);
    return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(n);
}

/** Convert a human-readable USDC amount to base units (×10^6). */
export function usdcToBaseUnits(amount: number): bigint {
    return BigInt(Math.round(amount * Math.pow(10, USDC_DECIMALS)));
}

/** Shorten a Solana public key for display. e.g. "AbCd…1234" */
export function truncateAddress(address: string, chars = 4): string {
    if (address.length <= chars * 2 + 3) return address;
    return `${address.slice(0, chars)}…${address.slice(-chars)}`;
}

/** Format a Unix timestamp (seconds) to a locale date-time string. */
export function formatTimestamp(ts: number): string {
    return new Date(ts * 1000).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}
