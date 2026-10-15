export function splitSale(price) {
  const value = String(price).trim();
  if (!/^\d+(?:\.\d{1,18})?$/.test(value))
    throw new RangeError(
      "Enter a non-negative price with at most 18 decimals.",
    );
  const [whole, fraction = ""] = value.split(".");
  const total = BigInt(whole) * 10n ** 18n + BigInt(fraction.padEnd(18, "0"));
  const platform = total / 10n;
  return { seller: total - platform, platform, total };
}

export function formatAvax(units) {
  const whole = units / 10n ** 18n;
  const fraction = (units % 10n ** 18n)
    .toString()
    .padStart(18, "0")
    .replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : `${whole}`;
}
