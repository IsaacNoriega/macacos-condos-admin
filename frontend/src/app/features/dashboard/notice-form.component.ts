import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Tenant } from '../../core/api.models';

@Component({
  selector: 'app-notice-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './notice-form.component.html',
  styleUrls: ['./notice-form.component.css'],
})
export class NoticeFormComponent {
  @Input() tenants: Tenant[] = [];
  @Output() submitNotice = new EventEmitter<{ tenantId: string; title: string; message: string }>();

  form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      tenantId: ['', Validators.required],
      title: ['', Validators.required],
      message: ['', Validators.required],
    });
  }

  submit() {
    if (this.form.valid) {
      this.submitNotice.emit(this.form.value);
      this.form.reset();
    }
  }
}
