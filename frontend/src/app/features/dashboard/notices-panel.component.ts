import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { Notice } from '../../core/models/notice.model';

@Component({
  selector: 'app-notices-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notices-panel.component.html',
  styleUrls: ['./notices-panel.component.css'],
})
export class NoticesPanelComponent implements OnInit {
  @Input() notices: Notice[] = [];

  ngOnInit(): void {}
}
