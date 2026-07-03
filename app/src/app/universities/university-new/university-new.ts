import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { UniversityForm } from '../university-form/university-form';

@Component({
  selector: 'app-university-new',
  imports: [UniversityForm, RouterLink],
  templateUrl: './university-new.html',
  styleUrl: './university-new.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UniversityNew {
  private readonly router = inject(Router);

  protected async onSaved(event: { id: string }): Promise<void> {
    await this.router.navigate(['/universities', event.id]);
  }
}
