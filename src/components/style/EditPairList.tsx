import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export interface EditPairListItem {
  id: string;
  beforeText: string;
  afterText: string;
  surroundingBefore: string;
  surroundingAfter: string;
  editTags: string[];
  createdAt: string;
}

export function EditPairList({ events }: { events: EditPairListItem[] }) {
  if (!events.length) {
    return <p className="text-sm text-text-muted">No rewrites captured yet.</p>;
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <article
          className="rounded-md border border-border bg-surface p-4 shadow-sm"
          key={event.id}
        >
          <div className="mb-3 text-xs text-text-faint">
            {formatDate(event.createdAt)}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="mb-1 text-xs font-medium uppercase text-text-faint">
                Before
              </div>
              <p className="font-display text-base leading-7 text-text-muted">
                {event.beforeText}
              </p>
            </div>
            <div>
              <div className="mb-1 text-xs font-medium uppercase text-text-faint">
                After
              </div>
              <p className="font-display text-base leading-7">{event.afterText}</p>
            </div>
          </div>
          {event.editTags.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {event.editTags.map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}
