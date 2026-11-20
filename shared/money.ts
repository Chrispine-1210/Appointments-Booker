export function sumAmounts(amounts: Array<string | null>): string {
  const cents = amounts.reduce((total, amount) => {
    const [whole, fraction = ""] = (amount ?? "0").split(".");
    return total + BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0").slice(0, 2));
  }, 0n);
  return `${cents / 100n}.${String(cents % 100n).padStart(2, "0")}`;
}
