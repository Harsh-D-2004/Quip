/** Matches quip-frontend/src/components/AppLogo.tsx. */
export default function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "text-xl", md: "text-2xl", lg: "text-4xl" };
  return (
    <span className={`${sizes[size]} font-bold tracking-tight`}>
      <span className="text-primary">Q</span>
      <span className="text-foreground">uip</span>
    </span>
  );
}
