import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';
import { MacIconComponent } from '../mac-icon/mac-icon.component';

/**
 * Renders the global toast stack. Mount once at the app root.
 * Feed it via `ToastService.push(...)` / `.ok()` / `.bad()` / `.info()`.
 */
@Component({
  selector: 'mac-toast-container',
  standalone: true,
  imports: [MacIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mcs-toast-stack" aria-live="polite" aria-atomic="true">
      @for (t of toast.toasts(); track t.id) {
        <div
          class="mcs-toast"
          [class.ok]="t.kind === 'ok'"
          [class.bad]="t.kind === 'bad'"
          [class.info]="t.kind === 'info'"
        >
          <span class="mcs-toast-icon">
            @switch (t.kind) {
              @case ('ok') {
                <mac-icon name="checkCircle" [size]="18" />
              }
              @case ('bad') {
                <mac-icon name="xCircle" [size]="18" />
              }
              @case ('info') {
                <mac-icon name="info" [size]="18" />
              }
            }
          </span>
          <div style="flex:1; min-width:0;">
            <div class="mcs-toast-title">{{ t.title }}</div>
            @if (t.msg) {
              <div class="mcs-toast-msg">{{ t.msg }}</div>
            }
          </div>
          <button
            type="button"
            class="mcs-btn ghost sm icon-only"
            (click)="toast.dismiss(t.id)"
            aria-label="Cerrar aviso"
          >
            <mac-icon name="x" [size]="13" />
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastContainerComponent {
  readonly toast = inject(ToastService);
}
