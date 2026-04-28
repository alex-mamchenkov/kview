import React from "react";
import EmptyState from "./EmptyState";
import EventCard from "./EventCard";

type EventDTO = {
  type: string;
  reason: string;
  message: string;
  count: number;
  firstSeen: number;
  lastSeen: number;
  involvedKind?: string;
  involvedName?: string;
};

type EventsListProps = {
  events: EventDTO[];
  emptyMessage?: string;
  showTarget?: boolean;
  getEventTarget?: (event: EventDTO) => {
    kind?: string;
    name?: string;
    label: string;
    title?: string;
    onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  } | null;
};

export default function EventsList({
  events,
  emptyMessage = "No events found.",
  showTarget = false,
  getEventTarget,
}: EventsListProps) {
  if (events.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <>
      {events.map((event, idx) => {
        const target = getEventTarget?.(event);
        return (
          <EventCard
            key={`${event.lastSeen || "event"}-${event.reason || ""}-${idx}`}
            event={event}
            showTarget={showTarget}
            targetKind={target?.kind}
            targetName={target?.name}
            targetLabel={target?.label}
            targetTitle={target?.title}
            onTargetClick={target?.onClick}
          />
        );
      })}
    </>
  );
}
