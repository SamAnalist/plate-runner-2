export function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] text-white/35 uppercase tracking-[0.16em] mb-1.5">
      {children}
    </p>
  );
}
