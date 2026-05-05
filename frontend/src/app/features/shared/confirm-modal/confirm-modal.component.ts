import { ChangeDetectionStrategy, Component, HostListener, input, output } from '@angular/core';
import { MacIconComponent } from '../mac-icon/mac-icon.component';

/**
 * Reusable confirmation modal. Used primarily for delete confirmations.
 *
 * Usage:
 *   <mac-confirm-modal
 *     [open]="toDelete() !== null"
 *     title="¿Eliminar residente?"
 *     message="Esta acción no se puede deshacer."
 *     confirmLabel="Eliminar"
 *     (cancelled)="toDelete.set(null)"
 *     (confirmed)="doDelete()">
 *   </mac-confirm-modal>
 */
@Component({
  selector: 'mac-confirm-modal',
  standalone: true,
  imports: [MacIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="mcs-modal-backdrop" (click)="cancelled.emit()">
        <div class="mcs-modal" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
          <div class="mcs-modal-head">
            <div class="mcs-modal-icon">
              <mac-icon [name]="danger() ? 'alert' : 'info'" [size]="20" />
            </div>
            <div style="flex:1;">
              <div class="mcs-modal-body" style="padding:0;">
                <h3>{{ title() }}</h3>
                <p>{{ message() }}</p>
              </div>
            </div>
          </div>
          <div class="mcs-modal-foot">
            <button type="button" class="mcs-btn" (click)="cancelled.emit()">
              {{ cancelLabel() }}
            </button>
            <button
              type="button"
              [class]="'mcs-btn ' + (danger() ? 'danger' : 'primary')"
              (click)="confirmed.emit()"
            >
              {{ confirmLabel() }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmModalComponent {
  readonly open = input(false);
  readonly title = input('¿Confirmar acción?');
  readonly message = input('');
  readonly confirmLabel = input('Eliminar');
  readonly cancelLabel = input('Cancelar');
  readonly danger = input(true);

  readonly cancelled = output<void>();
  readonly confirmed = output<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open()) this.cancelled.emit();
  }
}
