import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TaskWithSubTasks } from '../../../../../tasks/task.model';
import { isOnline$ } from '../../../../../../util/is-online';
import { Observable } from 'rxjs';

@Component({
  selector: 'clickup-issue-header',
  templateUrl: './clickup-issue-header.component.html',
  styleUrls: ['./clickup-issue-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClickupIssueHeaderComponent {
  @Input() task?: TaskWithSubTasks;
  isOnline$: Observable<boolean> = isOnline$;

  constructor() {}
}
