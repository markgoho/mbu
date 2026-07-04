/** Fired when a scout is registered (enrolled or waitlisted) into a class. */
export interface RegisteredEvent {
  universityId: string;
  classId: string;
  scoutId: string;
  parentUid: string;
  badgeTitle: string;
}

/** Fired when a waitlisted scout is promoted to enrolled (a seat opened up). */
export interface PromotedEvent {
  universityId: string;
  classId: string;
  scoutId: string;
  parentUid: string;
  badgeTitle: string;
}

/**
 * Outbound notification port for registration lifecycle events. Kept separate
 * from RegistrationsService so delivery (email/push/etc.) can be swapped or
 * stubbed independently of registration business logic.
 */
export interface Notifier {
  registered(event: RegisteredEvent): Promise<void>;
  promoted(event: PromotedEvent): Promise<void>;
}
