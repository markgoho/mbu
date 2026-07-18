import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { createUniversityAction } from '../../services/university-action';
import type { ClassResponse, Period } from '../../api-types/universities-api.types';
import { Universities } from '../../services/universities';
import { ClassForm } from '../class-form/class-form';

@Component({
  selector: 'app-class-list',
  imports: [ClassForm],
  templateUrl: './class-list.html',
  styleUrl: './class-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClassList {
  private readonly universities = inject(Universities);

  readonly universityId = input.required<string>();
  readonly periods = input<Period[]>([]);
  readonly classes = input<ClassResponse[]>([]);
  readonly readonly = input(false);

  protected readonly showForm = signal(false);
  protected readonly editingClass = signal<ClassResponse | undefined>(undefined);
  private readonly action = createUniversityAction(
    this.universities.apiErrorMessage.bind(this.universities),
  );
  protected readonly actionPending = this.action.pending;
  protected readonly actionError = this.action.error;

  protected startCreate(): void {
    this.editingClass.set(undefined);
    this.showForm.set(true);
  }

  protected startEdit(cls: ClassResponse): void {
    this.editingClass.set(cls);
    this.showForm.set(true);
  }

  protected closeForm(): void {
    this.showForm.set(false);
    this.editingClass.set(undefined);
  }

  protected async deleteClass(cls: ClassResponse): Promise<void> {
    await this.action.run({
      confirm: `Delete ${cls.badgeTitle}?`,
      action: () => this.universities.deleteClass(this.universityId(), cls.classId),
      fallback: 'Could not delete this class.',
    });
  }
}
