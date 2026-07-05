import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Universities } from '../../services/universities';

@Component({
  selector: 'app-review-queue',
  imports: [RouterLink, DatePipe],
  templateUrl: './review-queue.html',
  styleUrl: './review-queue.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewQueue {
  protected readonly universities = inject(Universities);

  protected readonly queue = this.universities.reviewQueue;
  protected readonly rows = computed(() => this.queue.value()?.universities ?? []);
  protected readonly isEmpty = computed(() => this.rows().length === 0);

  constructor() {
    this.universities.openReviewQueue();
  }
}
