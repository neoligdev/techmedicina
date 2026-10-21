import "@tanstack/react-start/server-only";
import { isIP } from "node:net";

/** Conservative probe policy based on IANA special-purpose registries (2026-10-21).
 * Special protocol allocations are rejected even where individual public exceptions exist. */
export function isPublicProbeAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    const [a, b, c] = address.split(".").map(Number) as [number, number, number, number];
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 168 || (b === 0 && (c === 0 || c === 2)) || (b === 88 && c === 99))) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
      (a === 203 && b === 0 && c === 113)
    );
  }
  if (family !== 6 || address.includes("%") || address.includes(".")) return false;
  const sides = address.toLowerCase().split("::");
  const left = sides[0] ? sides[0].split(":") : [];
  const right = sides.length === 2 && sides[1] ? sides[1].split(":") : [];
  const words =
    sides.length === 2
      ? [...left, ...Array(8 - left.length - right.length).fill("0"), ...right]
      : left;
  const a = parseInt(words[0]!, 16),
    b = parseInt(words[1]!, 16);
  // Only ordinary global unicast; no mapped, NAT64, Teredo, 6to4 or special assignments.
  return (
    (a & 0xe000) === 0x2000 &&
    !(a === 0x2001 && (b < 0x0200 || b === 0x0db8)) &&
    a !== 0x2002 &&
    !(a === 0x3fff && b < 0x1000)
  );
}
