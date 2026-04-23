import type { UsageEvent } from "@/lib/db/schema";

export function UsageOverview({ events }: { events: UsageEvent[] }) {
  if (!events.length) {
    return <p className="text-sm text-text-muted">No AI calls yet.</p>;
  }

  const groups = new Map<
    string,
    { input: number; cached: number; output: number; cost: number }
  >();

  events.forEach((event) => {
    const key = `${event.provider} · ${event.callTier} · ${event.model}`;
    const current = groups.get(key) ?? {
      input: 0,
      cached: 0,
      output: 0,
      cost: 0,
    };

    groups.set(key, {
      input: current.input + event.inputTokens,
      cached: current.cached + event.cachedInputTokens,
      output: current.output + event.outputTokens,
      cost: current.cost + Number(event.estimatedCostUsd),
    });
  });

  return (
    <div className="divide-y divide-border rounded-sm border border-border bg-surface">
      {Array.from(groups.entries()).map(([key, value]) => (
        <div className="grid grid-cols-5 gap-3 px-3 py-2 text-sm" key={key}>
          <div className="col-span-2 font-medium">{key}</div>
          <div>{value.input} in</div>
          <div>{value.cached} cached</div>
          <div>${value.cost.toFixed(4)}</div>
        </div>
      ))}
    </div>
  );
}
