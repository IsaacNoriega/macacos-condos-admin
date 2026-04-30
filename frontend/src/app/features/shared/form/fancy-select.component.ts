import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, HostListener, Input, Output, forwardRef, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface FancySelectOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-fancy-select',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FancySelectComponent),
      multi: true,
    },
  ],
  template: `
    <div class="fancy-select" [class.open]="isOpen()" [class.disabled]="isDisabled" [class.empty]="!selectedLabel()">
      <button type="button" class="fancy-trigger" (click)="toggle($event)" [disabled]="isDisabled" [attr.aria-expanded]="isOpen()">
        <span class="trigger-label">{{ selectedLabel() || placeholder }}</span>
        <span class="trigger-arrow" aria-hidden="true">▾</span>
      </button>

      @if (isOpen()) {
      <ul class="fancy-menu" role="listbox">
        @for (option of options; track option.value) {
        <li>
          <button
            type="button"
            class="fancy-option"
            [class.active]="option.value === value"
            (click)="choose(option.value)">
            {{ option.label }}
          </button>
        </li>
        }
      </ul>
      }
    </div>
  `,
  styles: [
    `
      .fancy-select {
        position: relative;
        width: 100%;
      }

      .fancy-trigger {
        width: 100%;
        min-height: 2.45rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        text-align: left;
        padding: 0.62rem 0.78rem;
        border-radius: 0.72rem;
        border: 1px solid rgba(14, 165, 233, 0.22);
        background: rgba(255, 255, 255, 0.92);
        color: var(--text-primary);
        font: inherit;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
      }

      .fancy-select.open .fancy-trigger {
        border-color: rgba(14, 165, 233, 0.45);
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.16);
        background: #ffffff;
      }

      .fancy-select.disabled .fancy-trigger {
        opacity: 0.65;
        cursor: not-allowed;
      }

      .trigger-label {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .fancy-select.empty .trigger-label {
        color: var(--text-muted);
      }

      .trigger-arrow {
        color: #0284c7;
        font-size: 0.82rem;
      }

      .fancy-menu {
        position: absolute;
        top: calc(100% + 0.28rem);
        left: 0;
        right: 0;
        z-index: 30;
        margin: 0;
        padding: 0.3rem;
        list-style: none;
        border-radius: 0.72rem;
        border: 1px solid rgba(14, 165, 233, 0.28);
        background: #ffffff;
        box-shadow: 0 14px 24px rgba(15, 23, 42, 0.14);
        max-height: 14rem;
        overflow: auto;
      }

      .fancy-option {
        width: 100%;
        border: none;
        background: transparent;
        border-radius: 0.52rem;
        padding: 0.5rem 0.6rem;
        text-align: left;
        color: var(--text-primary);
        font: inherit;
        font-size: 0.9rem;
      }

      .fancy-option:hover {
        background: #e0f2fe;
        color: #0c4a6e;
      }

      .fancy-option.active {
        background: linear-gradient(135deg, #0ea5e9, #0284c7);
        color: #ffffff;
      }
    `,
  ],
})
export class FancySelectComponent implements ControlValueAccessor {
  @Input() options: readonly FancySelectOption[] = [];
  @Input() placeholder = 'Selecciona una opcion';
  @Output() selectionChange = new EventEmitter<string>();

  readonly isOpen = signal(false);
  isDisabled = false;
  value = '';

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private readonly elementRef: ElementRef<HTMLElement>) {}

  selectedLabel(): string {
    return this.options.find((option) => option.value === this.value)?.label || '';
  }

  toggle(event: MouseEvent): void {
    event.stopPropagation();
    if (this.isDisabled) {
      return;
    }
    this.isOpen.set(!this.isOpen());
  }

  choose(nextValue: string): void {
    this.value = nextValue;
    this.onChange(nextValue);
    this.onTouched();
    this.selectionChange.emit(nextValue);
    this.isOpen.set(false);
  }

  writeValue(value: string | null): void {
    this.value = value || '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.isOpen.set(false);
    }
  }
}
