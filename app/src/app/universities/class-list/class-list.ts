import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
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

  protected readonly showForm = signal(false);
  protected readonly editingClass = signal<ClassResponse | undefined>(undefined);

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
    if (!globalThis.confirm(`Delete ${cls.badgeTitle}?`)) return;
    await this.universities.deleteClass(this.universityId(), cls.classId);
  }
}
