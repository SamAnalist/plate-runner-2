import { Button } from './Button';

export function EmptyState({
  message,
  hint,
  action,
}: {
  message: string;
  hint?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-start gap-1.5 py-3 px-3 rounded-md border border-dashed border-white/10 bg-white/2">
      <p className="text-[10px] font-mono text-white/35">{message}</p>
      {hint && <p className="text-[9px] font-mono text-white/22 leading-snug">{hint}</p>}
      {action && (
        <Button tone="primary" onClick={action.onClick} className="mt-1">
          {action.label}
        </Button>
      )}
    </div>
  );
}
