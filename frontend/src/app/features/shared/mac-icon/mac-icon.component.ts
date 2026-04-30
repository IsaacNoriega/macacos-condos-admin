import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type MacIconName =
  | 'dashboard' | 'users' | 'user' | 'building' | 'home' | 'cabin' | 'store'
  | 'receipt' | 'card' | 'wrench' | 'calendar' | 'shield'
  | 'plus' | 'check' | 'checkCircle' | 'x' | 'xCircle' | 'alert'
  | 'edit' | 'trash' | 'eye' | 'eyeOff' | 'search' | 'filter'
  | 'mail' | 'lock' | 'phone' | 'clock' | 'send' | 'upload' | 'download' | 'image' | 'fileText'
  | 'chevronRight' | 'chevronLeft' | 'chevronDown' | 'chevronUp'
  | 'arrowRight' | 'arrowLeft' | 'arrowUp' | 'arrowDown'
  | 'sun' | 'moon' | 'bell' | 'logOut' | 'settings' | 'panelLeft' | 'info'
  | 'sparkle' | 'dollarSign' | 'grid' | 'list' | 'kanban' | 'minus'
  | 'refresh' | 'externalLink';

/**
 * Lucide-style line icons (1.75 stroke) used by the Macacos design.
 * viewBox is fixed at 0 0 24 24. Use `size` and `strokeWidth` to override defaults.
 */
@Component({
  selector: 'mac-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      [attr.stroke-width]="strokeWidth()"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      @switch (name()) {
        @case ('dashboard') {
          <rect x="3" y="3" width="7" height="9" rx="1"/>
          <rect x="14" y="3" width="7" height="5" rx="1"/>
          <rect x="14" y="12" width="7" height="9" rx="1"/>
          <rect x="3" y="16" width="7" height="5" rx="1"/>
        }
        @case ('users') {
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        }
        @case ('user') {
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        }
        @case ('building') {
          <rect x="4" y="2" width="16" height="20" rx="2"/>
          <path d="M9 22v-4h6v4"/>
          <path d="M8 6h.01M16 6h.01M12 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>
        }
        @case ('home') {
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        }
        @case ('cabin') {
          <path d="M2 22h20"/>
          <path d="m3 22 1-11 8-7 8 7 1 11"/>
          <path d="M8 22v-6a4 4 0 0 1 8 0v6"/>
        }
        @case ('store') {
          <path d="m2 7 2-5h16l2 5"/>
          <path d="M4 22V11M20 22V11M4 7h16"/>
          <path d="M10 22v-6h4v6"/>
        }
        @case ('receipt') {
          <path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 1 2V2"/>
          <path d="M8 7h8M8 12h8M8 17h5"/>
        }
        @case ('card') {
          <rect x="2" y="5" width="20" height="14" rx="2"/>
          <path d="M2 10h20M7 15h4"/>
        }
        @case ('wrench') {
          <path d="M14.7 6.3a4 4 0 0 0-5.65 5.65L3 18l3 3 6.05-6.05a4 4 0 0 0 5.65-5.65l-2.4 2.4-2.83-2.83 2.4-2.4Z"/>
        }
        @case ('calendar') {
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <path d="M16 2v4M8 2v4M3 10h18"/>
        }
        @case ('shield') {
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>
        }
        @case ('plus') {
          <path d="M12 5v14M5 12h14"/>
        }
        @case ('minus') {
          <path d="M5 12h14"/>
        }
        @case ('check') {
          <polyline points="20 6 9 17 4 12"/>
        }
        @case ('checkCircle') {
          <circle cx="12" cy="12" r="10"/>
          <polyline points="16 10 11 15 8 12"/>
        }
        @case ('x') {
          <path d="M18 6 6 18M6 6l12 12"/>
        }
        @case ('xCircle') {
          <circle cx="12" cy="12" r="10"/>
          <path d="m15 9-6 6M9 9l6 6"/>
        }
        @case ('alert') {
          <path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0Z"/>
          <path d="M12 9v4"/>
          <circle cx="12" cy="17" r=".5"/>
        }
        @case ('edit') {
          <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
        }
        @case ('trash') {
          <path d="M3 6h18"/>
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          <path d="m19 6-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
        }
        @case ('eye') {
          <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/>
          <circle cx="12" cy="12" r="3"/>
        }
        @case ('eyeOff') {
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6 0 10 7 10 7a17.5 17.5 0 0 1-2.6 3.56"/>
          <path d="M6.6 6.61A17.82 17.82 0 0 0 2 11s4 7 10 7a9 9 0 0 0 4.4-1.14"/>
          <path d="m2 2 20 20"/>
          <path d="M14.12 14.12a3 3 0 0 1-4.24-4.24"/>
        }
        @case ('search') {
          <circle cx="11" cy="11" r="7"/>
          <path d="m21 21-4.35-4.35"/>
        }
        @case ('filter') {
          <path d="M22 3H2l8 9.5V19l4 2v-8.5L22 3Z"/>
        }
        @case ('mail') {
          <rect x="2" y="4" width="20" height="16" rx="2"/>
          <path d="m2 7 10 7 10-7"/>
        }
        @case ('lock') {
          <rect x="3" y="11" width="18" height="11" rx="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        }
        @case ('phone') {
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z"/>
        }
        @case ('clock') {
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        }
        @case ('send') {
          <path d="m22 2-7 20-4-9-9-4 20-7Z"/>
        }
        @case ('upload') {
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <path d="M12 3v12"/>
        }
        @case ('download') {
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <path d="M12 15V3"/>
        }
        @case ('image') {
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <circle cx="9" cy="9" r="2"/>
          <path d="m21 15-4.5-4.5L5 22"/>
        }
        @case ('fileText') {
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/>
          <path d="M14 2v6h6"/>
          <path d="M9 13h6M9 17h6"/>
        }
        @case ('chevronRight') {
          <polyline points="9 18 15 12 9 6"/>
        }
        @case ('chevronLeft') {
          <polyline points="15 18 9 12 15 6"/>
        }
        @case ('chevronDown') {
          <polyline points="6 9 12 15 18 9"/>
        }
        @case ('chevronUp') {
          <polyline points="18 15 12 9 6 15"/>
        }
        @case ('arrowRight') {
          <path d="M5 12h14"/>
          <polyline points="13 6 19 12 13 18"/>
        }
        @case ('arrowLeft') {
          <path d="M19 12H5"/>
          <polyline points="11 18 5 12 11 6"/>
        }
        @case ('arrowUp') {
          <path d="M12 19V5"/>
          <polyline points="6 11 12 5 18 11"/>
        }
        @case ('arrowDown') {
          <path d="M12 5v14"/>
          <polyline points="18 13 12 19 6 13"/>
        }
        @case ('sun') {
          <circle cx="12" cy="12" r="4"/>
          <path d="M12 2v2M12 20v2M5 5l1.4 1.4M17.6 17.6l1.4 1.4M2 12h2M20 12h2M5 19l1.4-1.4M17.6 6.4l1.4-1.4"/>
        }
        @case ('moon') {
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>
        }
        @case ('bell') {
          <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
        }
        @case ('logOut') {
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <path d="M21 12H9"/>
        }
        @case ('settings') {
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06A2 2 0 1 1 7 4.29l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>
        }
        @case ('panelLeft') {
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M9 3v18"/>
        }
        @case ('info') {
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 16v-4"/>
          <path d="M12 8h.01"/>
        }
        @case ('sparkle') {
          <path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2Z"/>
        }
        @case ('dollarSign') {
          <path d="M12 1v22"/>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        }
        @case ('grid') {
          <rect x="3" y="3" width="7" height="7"/>
          <rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/>
          <rect x="3" y="14" width="7" height="7"/>
        }
        @case ('list') {
          <line x1="8" y1="6" x2="21" y2="6"/>
          <line x1="8" y1="12" x2="21" y2="12"/>
          <line x1="8" y1="18" x2="21" y2="18"/>
          <line x1="3" y1="6" x2="3.01" y2="6"/>
          <line x1="3" y1="12" x2="3.01" y2="12"/>
          <line x1="3" y1="18" x2="3.01" y2="18"/>
        }
        @case ('kanban') {
          <path d="M6 5v11M12 5v6M18 5v14"/>
        }
        @case ('refresh') {
          <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
          <path d="M21 3v5h-5"/>
        }
        @case ('externalLink') {
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
          <polyline points="15 3 21 3 21 9"/>
          <line x1="10" y1="14" x2="21" y2="3"/>
        }
      }
    </svg>
  `,
  styles: [`:host { display: inline-flex; align-items: center; justify-content: center; line-height: 0; }`],
})
export class MacIconComponent {
  readonly name = input.required<MacIconName>();
  readonly size = input<number>(16);
  readonly strokeWidth = input<number>(1.75);
}
