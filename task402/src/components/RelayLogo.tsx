import Link from "next/link";

export function RelayLogo({ size = "md" }: { size?: "sm" | "md" }) {
  const icon = size === "sm" ? "h-7 w-7 text-xs" : "h-8 w-8 text-sm";
  const text = size === "sm" ? "text-base" : "text-lg";

  return (
    <Link href="/" className="flex items-center gap-2">
      <span
        className={`grid ${icon} place-items-center rounded-lg bg-gradient-to-br from-[#3f8bff] to-[#22d3ee] font-bold text-[#04101f]`}
      >
        R
      </span>
      <span className={`${text} font-bold tracking-tight`}>
        Re<span className="text-[var(--accent-2)]">lay</span>
      </span>
    </Link>
  );
}
