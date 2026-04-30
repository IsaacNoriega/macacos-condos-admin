import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { MacIconComponent } from '../mac-icon/mac-icon.component';

/**
 * Generic side drawer for create / edit / detail flows.
 *
 * Usage:
 *   <mac-drawer
 *     [open]="isOpen()"
 *     title="Nuevo residente"
 *     subtitle="Registre un nuevo habitante"
 *     [width]="520"
 *     (closed)="isOpen.set(false)">
 *     <ng-container body>
 *       <!-- form / content -->
 *     </ng-container>
 *     <ng-container footer>
 *       <button class="mcs-btn" (click)="isOpen.set(false)">Cancelar</button>
 *       <button class="mcs-btn primary" (click)="save()">Guardar</button>
 *     </ng-container>
 *   </mac-drawer>
 */
@Component({
  selector: 'mac-drawer',
  standalone: true,
  imports: [CommonModule, MacIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="mcs-drawer-root">
        <div class="mcs-drawer-overlay" (click)="closed.emit()"></div>
        <div class="mcs-drawer-panel" [style.width.px]="width()" role="dialog" aria-modal="true">
          <header class="mcs-drawer-head">
            <div style="flex:1; min-width:0;">
              <div class="mcs-drawer-title">{{ title() }}</div>
              @if (subtitle()) {
                <div class="mcs-drawer-subtitle">{{ subtitle() }}</div>
              }
            </div>
            <button type="button" class="mcs-btn ghost sm icon-only" (click)="closed.emit()" aria-label="Cerrar">
              <mac-icon name="x" [size]="15"/>
            </button>
          </header>
          <div class="mcs-drawer-body mcs-scroll-soft">
            <ng-content select="[body]"></ng-content>
          </div>
          <footer class="mcs-drawer-foot">
            <ng-content select="[footer]"></ng-content>
          </footer>
        </div>
      </div>
    }
  `,
})
export class DrawerComponent {
  readonly open = input(false);
  readonly title = input('');
  readonly subtitle = input<string | null>(null);
  readonly width = input(480);
  readonly closed = output<void>();

  private readonly doc = inject(DOCUMENT);

  constructor() {
    effect(() => {
      const body = this.doc.body;
      if (!body) return;
      body.style.overflow = this.open() ? 'hidden' : '';
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open()) this.closed.emit();
  }
}
