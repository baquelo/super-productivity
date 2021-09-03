import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TaskWithSubTasks } from '../../../../../tasks/task.model';
import { ClickupIssue } from '../clickup-issue.model';
import { expandAnimation } from '../../../../../../ui/animations/expand.ani';
import { TaskAttachment } from '../../../../../tasks/task-attachment/task-attachment.model';
import { T } from '../../../../../../t.const';
import { TaskService } from '../../../../../tasks/task.service';
// @ts-ignore
import * as j2m from 'jira2md';
import { ClickupCommonInterfacesService } from '../../clickup-common-interfaces.service';
import { Observable, ReplaySubject } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'clickup-issue-content',
  templateUrl: './clickup-issue-content.component.html',
  styleUrls: ['./clickup-issue-content.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation],
})
export class ClickupIssueContentComponent {
  description?: string;
  attachments?: TaskAttachment[];
  T: typeof T = T;
  issue?: ClickupIssue;
  task?: TaskWithSubTasks;
  private _task$: ReplaySubject<TaskWithSubTasks> = new ReplaySubject(1);
  issueUrl$: Observable<string> = this._task$.pipe(
    switchMap((task) =>
      this._clickupCommonInterfacesService.issueLink$(
        task.issueId as string,
        task.projectId as string,
      ),
    ),
  );

  constructor(
    private readonly _taskService: TaskService,
    private readonly _clickupCommonInterfacesService: ClickupCommonInterfacesService,
  ) {}

  @Input('issue') set issueIn(i: ClickupIssue) {
    this.issue = i;
    this.description = i && i.description && j2m.to_markdown(i.description);
  }

  @Input('task') set taskIn(v: TaskWithSubTasks) {
    this.task = v;
    this._task$.next(v);
  }

  hideUpdates(): void {
    if (!this.task) {
      throw new Error('No task');
    }
    this._taskService.markIssueUpdatesAsRead(this.task.id);
  }

  trackByIndex(i: number, p: any): number {
    return i;
  }
}
