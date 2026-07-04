import { DatePipe } from '@angular/common';
import { HttpErrorResponse, httpResource } from '@angular/common/http';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { PublicUniversity } from '../api-types/universities-api.types';

@Component({
  selector: 'app-public-event',
  imports: [DatePipe, RouterLink],
  templateUrl: './public-event.html',
  styleUrl: './public-event.css',
})
export class PublicEvent {
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap);

  protected readonly eventId = computed(() => this.params()?.get('id') ?? '');

  // Keyed on the route id: navigating between events refetches and cancels the
  // superseded request, so a slow earlier response can't overwrite a later one.
  protected readonly event = httpResource<PublicUniversity>(() => {
    const id = this.eventId();
    return id ? `/api/universities/${id}/public` : undefined;
  });

  /** A 404 means missing or unpublished; any other error is a generic failure. */
  protected readonly notFound = computed(() => {
    const error = this.event.error();
    return error instanceof HttpErrorResponse && error.status === 404;
  });

  protected signInReturnTo(): string {
    return `/e/${this.eventId()}`;
  }

  protected counselorNames(
    counselors: PublicUniversity['classes'][number]['counselors'],
  ): string {
    return counselors.map((c) => c.displayName).join(', ');
  }

  protected formatLocation(event: PublicUniversity): string {
    const { location } = event;
    return `${location.name}, ${location.city}, ${location.state}`;
  }
}
