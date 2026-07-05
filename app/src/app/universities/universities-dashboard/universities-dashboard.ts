import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StatusBadge } from '../../shared/status-badge/status-badge';
import { Universities } from '../../services/universities';

@Component({
  selector: 'app-universities-dashboard',
  imports: [RouterLink, DatePipe, StatusBadge],
  templateUrl: './universities-dashboard.html',
  styleUrl: './universities-dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UniversitiesDashboard {
  protected readonly universities = inject(Universities);

  protected readonly list = this.universities.mine;
  protected readonly flashMessage = this.universities.flashMessage;
  protected readonly items = computed(() => this.list.value()?.universities ?? []);
  protected readonly isEmpty = computed(() => this.items().length === 0);

  constructor() {
    this.universities.reloadMine();
  }

  protected dismissFlash(): void {
    this.universities.flashMessage.set(null);
  }
}
