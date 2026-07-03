import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HealthService } from '../services/health.service';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private readonly health = inject(HealthService).health;

  protected readonly status = computed(() => {
    if (this.health.error()) {
      return 'unavailable';
    }
    return this.health.value()?.status ?? 'loading…';
  });

  protected readonly error = computed(() =>
    this.health.error() ? 'Could not reach the API.' : null,
  );
}
