import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { NoticesPanelComponent } from '../../dashboard/notices-panel.component';
import { NoticeAdminComponent } from '../../dashboard/notice-admin.component';
import { NoticeService } from '../../../core/services/notice.service';


@Component({
  selector: 'app-notices-page',
  standalone: true,
  imports: [CommonModule, NoticesPanelComponent, NoticeAdminComponent],
  templateUrl: './notices.page.html',
  styleUrls: ['./notices.page.css'],
})
export class NoticesPage {
  private readonly noticeService = inject(NoticeService);
  get notices() {
    return this.noticeService.notices();
  }
}
