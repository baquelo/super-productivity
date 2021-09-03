import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { ClickupApiService } from '../../clickup-api.service';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SnackService } from '../../../../../../core/snack/snack.service';
import { ClickupIssue } from '../../clickup-issue/clickup-issue.model';
import { Task } from '../../../../../tasks/task.model';
import { T } from '../../../../../../t.const';
import { ProjectService } from '../../../../../project/project.service';
import { first } from 'rxjs/operators';
import * as moment from 'moment';

@Component({
  selector: 'dialog-clickup-add-worklog',
  templateUrl: './dialog-clickup-add-worklog.component.html',
  styleUrls: ['./dialog-clickup-add-worklog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogClickupAddWorklogComponent {
  T: typeof T = T;
  timeSpent: number;
  started: string;
  comment: string;
  issue: ClickupIssue;

  constructor(
    private _clickupApiService: ClickupApiService,
    private _matDialogRef: MatDialogRef<DialogClickupAddWorklogComponent>,
    private _snackService: SnackService,
    private _projectService: ProjectService,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      issue: ClickupIssue;
      task: Task;
    },
  ) {
    this.timeSpent = this.data.task.timeSpent;
    this.issue = this.data.issue;
    this.started = this._convertTimestamp(this.data.task.created);
    this.comment = this.data.task.title;
  }

  close(): void {
    this._matDialogRef.close();
  }

  async submitWorklog(): Promise<void> {
    if (this.issue.id && this.started && this.timeSpent && this.data.task.projectId) {
      const cfg = await this._projectService
        .getClickupCfgForProject$(this.data.task.projectId)
        .pipe(first())
        .toPromise();
      this._clickupApiService
        .addWorklog$({
          issueId: this.issue.id,
          started: this.started,
          timeSpent: this.timeSpent,
          comment: this.comment,
          cfg,
        })
        .subscribe((res) => {
          this._snackService.open({
            type: 'SUCCESS',
            msg: T.F.CLICKUP.S.ADDED_WORKLOG_FOR,
            translateParams: { issueKey: this.issue.key },
          });
          this.close();
        });
    }
  }

  private _convertTimestamp(timestamp: number): string {
    const date = moment(timestamp);
    const isoStr = date.seconds(0).local().format();
    return isoStr.substring(0, 19);
  }
}
