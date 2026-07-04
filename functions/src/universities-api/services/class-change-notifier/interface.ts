/** Fired when a class is cancelled (removed) before an event. */
export interface ClassCancelledEvent {
  universityId: string;
  classId: string;
  badgeTitle: string;
}

/** Fired when a class's schedule-relevant details change (badge, periods, room). */
export interface ClassChangedEvent {
  universityId: string;
  classId: string;
  badgeTitle: string;
}

/**
 * Outbound notification port for class lifecycle events affecting registered
 * scouts. Port seam only for now: classes can only be cancelled/changed while
 * a university is in `draft` status, and registration requires `published`,
 * so the two states never coexist and this can never fire with real
 * recipients yet. #108 lifts the draft-edit gate and wires the real
 * Mailgun-backed implementation + call sites.
 */
export interface ClassChangeNotifier {
  classCancelled(event: ClassCancelledEvent): Promise<void>;
  classChanged(event: ClassChangedEvent): Promise<void>;
}
