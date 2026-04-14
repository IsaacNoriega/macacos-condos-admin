import { CommonModule, DOCUMENT } from '@angular/common';
import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { FullCalendarComponent, FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventInput } from '@fullcalendar/core';
import interactionPlugin from '@fullcalendar/interaction';
import localeEs from '@fullcalendar/core/locales/es';
import timeGridPlugin from '@fullcalendar/timegrid';
import { CrudConfig, Reservation } from '../../../core/api.models';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { CrudPageComponent } from '../../shared/crud/crud-page.component';
import { FancySelectComponent } from '../../shared/form/fancy-select.component';

interface TenantOption {
  _id: string;
  name: string;
}

interface CalendarEventView {
  id: string;
  amenity: string;
  status: 'activa' | 'cancelada' | 'finalizada';
  timeRange: string;
}

interface CalendarDay {
  isoDate: string;
  label: string;
  events: CalendarEventView[];
}

interface SummaryCard {
  label: string;
  value: string;
  note: string;
  color: string;
}

@Component({
  selector: 'app-reservations-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CrudPageComponent, FancySelectComponent, FullCalendarModule],
  templateUrl: './reservations.page.html',
  styleUrl: './reservations.page.css',
})
export class ReservationsPage implements OnInit, AfterViewInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly document = inject(DOCUMENT);

  @ViewChild(FullCalendarComponent) private calendarComponent?: FullCalendarComponent;

  readonly config: CrudConfig;
  readonly reservations = signal<Reservation[]>([]);
  readonly tenants = signal<TenantOption[]>([]);
  readonly loadingCalendar = signal(false);
  readonly calendarError = signal<string | null>(null);
  readonly calendarRangeLabel = signal('');
  readonly selectedAmenityFilter = signal('');
  readonly isSuperadmin = computed(() => this.auth.role() === 'superadmin');
  readonly nowTick = signal(Date.now());
  private refreshIntervalId: ReturnType<typeof setInterval> | null = null;

  readonly calendarForm = this.fb.group({
    tenantId: [''],
    amenity: [''],
    weekStart: [this.toDateInputValue(this.startOfWeek(new Date()))],
  });

  readonly amenities = computed(() => {
    const unique = new Set(this.reservations().map((item) => item.amenity).filter(Boolean));
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  });

  readonly tenantFilterOptions = computed(() => this.tenants().map((tenant) => ({ label: tenant.name, value: tenant._id })));
  readonly amenityFilterOptions = computed(() => this.amenities().map((amenity) => ({ label: amenity, value: amenity })));

  readonly calendarEvents = computed<EventInput[]>(() => {
    const amenityFilter = this.selectedAmenityFilter().trim();
    const now = this.nowTick();

    return this.reservations()
      .filter((reservation) => !amenityFilter || reservation.amenity === amenityFilter)
      .map((reservation) => {
        const status = this.getReservationDisplayStatus(reservation, now);

        return {
          id: reservation._id,
          title: reservation.amenity,
          start: reservation.start,
          end: reservation.end,
          backgroundColor: this.getReservationStatusColor(status),
          borderColor: this.getReservationStatusColor(status),
          textColor: '#ffffff',
          extendedProps: {
            status,
            timeRange: `${this.toTimeLabel(reservation.start)} - ${this.toTimeLabel(reservation.end)}`,
          },
        } satisfies EventInput;
      });
  });

  readonly calendarOptions = computed<CalendarOptions>(() => ({
    plugins: [timeGridPlugin, interactionPlugin],
    initialView: 'timeGridWeek',
    locale: localeEs,
    firstDay: 1,
    headerToolbar: false,
    allDaySlot: false,
    expandRows: true,
    nowIndicator: true,
    height: '100%',
    slotMinTime: '08:00:00',
    slotMaxTime: '20:00:00',
    slotLabelInterval: '02:00',
    slotLabelFormat: { hour: 'numeric', minute: '2-digit', hour12: false },
    dayHeaderFormat: { weekday: 'short', day: '2-digit', month: 'short' },
    eventDisplay: 'block',
    eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
    stickyHeaderDates: true,
    events: this.calendarEvents(),
  }));

  readonly summaryCards = computed<SummaryCard[]>(() => {
    const items = this.reservations();
    const total = items.length;
    const active = items.filter((item) => this.getReservationDisplayStatus(item) === 'activa').length;
    const finished = items.filter((item) => this.getReservationDisplayStatus(item) === 'finalizada').length;
    const cancelled = items.filter((item) => this.getReservationDisplayStatus(item) === 'cancelada').length;

    return [
      { label: 'Total semana', value: String(total), note: 'en vista actual', color: '#38bdf8' },
      { label: 'Activas', value: String(active), note: 'reservas vigentes', color: '#60a5fa' },
      { label: 'Finalizadas', value: String(finished), note: 'ya cerradas', color: '#34d399' },
      { label: 'Canceladas', value: String(cancelled), note: 'sin ocupar', color: '#f59e0b' },
    ];
  });

  readonly calendarDays = computed<CalendarDay[]>(() => {
    const weekStartRaw = this.calendarForm.get('weekStart')?.value || this.toDateInputValue(this.startOfWeek(new Date()));
    const base = this.startOfWeek(new Date(`${weekStartRaw}T00:00:00`));
    const amenityFilter = (this.calendarForm.get('amenity')?.value || '').trim();
    const now = this.nowTick();
    const events = this.reservations().filter((item) => {
      if (amenityFilter && item.amenity !== amenityFilter) {
        return false;
      }
      return true;
    });

    const days: CalendarDay[] = [];
    for (let offset = 0; offset < 7; offset += 1) {
      const date = new Date(base);
      date.setDate(base.getDate() + offset);
      const dayKey = this.toDateInputValue(date);

      const dayEvents = events
        .filter((event) => this.toDateInputValue(new Date(event.start)) === dayKey)
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
        .map((event) => ({
          id: event._id,
          amenity: event.amenity,
          status: this.getReservationDisplayStatus(event, now),
          timeRange: `${this.toTimeLabel(event.start)} - ${this.toTimeLabel(event.end)}`,
        }));

      days.push({
        isoDate: dayKey,
        label: new Intl.DateTimeFormat('es-MX', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
        }).format(date),
        events: dayEvents,
      });
    }

    return days;
  });

  constructor(
    public readonly auth: AuthService,
    private readonly api: ApiService
  ) {

    const role = this.auth.role();
    const currentUserId = this.auth.user()?._id || '';
    const isSuperadmin = role === 'superadmin';
    const isAdmin = role === 'admin';
    const isSelfServiceRole = role === 'residente' || role === 'familiar';

    this.config = {
      title: 'Reservaciones',
      endpoint: '/reservations',
      listKey: 'reservations',
      singularKey: 'reservation',
      allowEdit: true,
      allowDelete: true,
      canEditItem: (item) => !isSelfServiceRole || String(item['userId'] || '') === currentUserId,
      canDeleteItem: (item) => !isSelfServiceRole || String(item['userId'] || '') === currentUserId,
      fields: [
        ...(isSuperadmin
          ? [
              {
                key: 'tenantId',
                label: 'Tenant',
                type: 'select' as const,
                required: true,
                optionsSource: {
                  endpoint: '/tenants',
                  listKey: 'tenants',
                  valueKey: '_id',
                  labelKey: 'name',
                  labelSecondaryKey: 'contactEmail',
                },
              },
            ]
          : []),
        ...(isSuperadmin || isAdmin
          ? [
              {
                key: 'userId',
                label: 'Usuario',
                type: 'select' as const,
                required: true,
                optionsSource: {
                  endpoint: '/users',
                  listKey: 'users',
                  valueKey: '_id',
                  labelKey: 'name',
                  labelSecondaryKey: 'email',
                  dependsOnTenant: true,
                },
              },
            ]
          : []),
        {
          key: 'amenity',
          label: 'Amenidad',
          type: 'select',
          required: true,
          optionsSource: {
            endpoint: '/amenities',
            listKey: 'amenities',
            valueKey: 'name',
            labelKey: 'name',
            dependsOnTenant: true,
          },
        },
        { key: 'start', label: 'Inicio', type: 'datetime-local', required: true },
        { key: 'end', label: 'Fin', type: 'datetime-local', required: true },
        ...(isSuperadmin || isAdmin
          ? [
              {
                key: 'status',
                label: 'Estado',
                type: 'select' as const,
                options: [
                  { label: 'Activa', value: 'activa' },
                  { label: 'Cancelada', value: 'cancelada' },
                ],
              },
            ]
          : []),
      ],
    };
  }

  ngOnInit(): void {
    this.toggleNoScroll(true);
    this.selectedAmenityFilter.set(this.calendarForm.get('amenity')?.value || '');
    this.syncCalendarView();

    if (this.auth.role() === 'superadmin') {
      this.loadTenants();
    }

    this.loadCalendarReservations();

    this.refreshIntervalId = setInterval(() => {
      this.nowTick.set(Date.now());
      this.loadCalendarReservations();
    }, 60_000);
  }

  ngAfterViewInit(): void {
    this.syncCalendarView();
  }

  ngOnDestroy(): void {
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }

    this.toggleNoScroll(false);
  }

  previousWeek(): void {
    const current = this.startOfWeek(new Date(`${this.calendarForm.get('weekStart')?.value || this.toDateInputValue(new Date())}T00:00:00`));
    const previous = new Date(current);
    previous.setDate(current.getDate() - 7);
    this.calendarForm.patchValue({ weekStart: this.toDateInputValue(previous) });
    this.syncCalendarView(previous);
    this.loadCalendarReservations();
  }

  nextWeek(): void {
    const current = this.startOfWeek(new Date(`${this.calendarForm.get('weekStart')?.value || this.toDateInputValue(new Date())}T00:00:00`));
    const next = new Date(current);
    next.setDate(current.getDate() + 7);
    this.calendarForm.patchValue({ weekStart: this.toDateInputValue(next) });
    this.syncCalendarView(next);
    this.loadCalendarReservations();
  }

  goToCurrentWeek(): void {
    this.calendarForm.patchValue({ weekStart: this.toDateInputValue(this.startOfWeek(new Date())) });
    this.syncCalendarView();
    this.loadCalendarReservations();
  }

  applyCalendarFilters(): void {
    this.selectedAmenityFilter.set(this.calendarForm.get('amenity')?.value || '');
    this.syncCalendarView();
    this.loadCalendarReservations();
  }

  private loadTenants(): void {
    this.api.get<{ success: boolean; tenants: TenantOption[] }>('/tenants').subscribe({
      next: (response) => this.tenants.set(response.tenants || []),
    });
  }

  private loadCalendarReservations(): void {
    this.loadingCalendar.set(true);
    this.calendarError.set(null);

    const weekStartRaw = this.calendarForm.get('weekStart')?.value || this.toDateInputValue(this.startOfWeek(new Date()));
    const startDate = this.startOfWeek(new Date(`${weekStartRaw}T00:00:00`));
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 7);

    const role = this.auth.role();
    const selectedTenant = this.calendarForm.get('tenantId')?.value || '';
    const tenantQuery = role === 'superadmin' && selectedTenant ? `?tenantId=${selectedTenant}` : '';

    this.api
      .get<{ success: boolean; reservations: Reservation[] }>(`/reservations${tenantQuery}`)
      .pipe(finalize(() => this.loadingCalendar.set(false)))
      .subscribe({
        next: (response) => {
          const raw = response.reservations || [];
          const inWeek = raw.filter((item) => {
            const start = new Date(item.start).getTime();
            return start >= startDate.getTime() && start < endDate.getTime();
          });
          this.reservations.set(inWeek);
        },
        error: (error) => {
          this.calendarError.set(error?.error?.message || 'No fue posible cargar el calendario.');
        },
      });
  }

  private startOfWeek(date: Date): Date {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    const currentDay = normalized.getDay();
    const diff = currentDay === 0 ? -6 : 1 - currentDay;
    normalized.setDate(normalized.getDate() + diff);
    return normalized;
  }

  private toDateInputValue(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private toTimeLabel(raw: string): string {
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      return '--:--';
    }

    return new Intl.DateTimeFormat('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  }

  private getReservationDisplayStatus(reservation: Reservation, now = Date.now()): 'activa' | 'cancelada' | 'finalizada' {
    if (reservation.status === 'cancelada') {
      return 'cancelada';
    }

    if (reservation.currentStatus === 'finalizada') {
      return 'finalizada';
    }

    const endTime = new Date(reservation.end).getTime();
    if (!Number.isNaN(endTime) && endTime <= now) {
      return 'finalizada';
    }

    return 'activa';
  }

  private getReservationStatusColor(status: 'activa' | 'cancelada' | 'finalizada'): string {
    switch (status) {
      case 'cancelada':
        return '#f59e0b';
      case 'finalizada':
        return '#8b5cf6';
      default:
        return '#3b82f6';
    }
  }

  private formatWeekRange(start: Date): string {
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const formatter = new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: 'short',
    });

    return `${formatter.format(start)} - ${formatter.format(end)}`;
  }

  private syncCalendarView(weekStart?: Date): void {
    const rawValue = this.calendarForm.get('weekStart')?.value || this.toDateInputValue(this.startOfWeek(new Date()));
    const base = weekStart ? this.startOfWeek(weekStart) : this.startOfWeek(new Date(`${rawValue}T00:00:00`));

    this.calendarRangeLabel.set(this.formatWeekRange(base));
    queueMicrotask(() => {
      this.calendarComponent?.getApi().gotoDate(base);
    });
  }

  private toggleNoScroll(enabled: boolean): void {
    const className = 'reservations-no-scroll';
    const root = this.document.documentElement;
    const body = this.document.body;

    if (enabled) {
      root.classList.add(className);
      body.classList.add(className);
      return;
    }

    root.classList.remove(className);
    body.classList.remove(className);
  }
}
