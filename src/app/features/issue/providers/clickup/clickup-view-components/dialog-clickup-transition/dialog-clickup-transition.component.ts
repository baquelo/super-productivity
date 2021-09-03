import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { IssueLocalState } from '../../../../issue.model';
import { ClickupIssueReduced } from '../../clickup-issue/clickup-issue.model';
import { Observable } from 'rxjs';
import { ClickupApiService } from '../../clickup-api.service';
import { ClickupOriginalTransition } from '../../clickup-api-responses';
import { SnackService } from '../../../../../../core/snack/snack.service';
import { concatMap, first, switchMap } from 'rxjs/operators';
import { T } from '../../../../../../t.const';
import { Task } from '../../../../../tasks/task.model';
import { ClickupCommonInterfacesService } from '../../clickup-common-interfaces.service';
import { ProjectService } from '../../../../../project/project.service';
import { ClickupCfg } from '../../clickup.model';

@Component({
  selector: 'dialog-clickup-transition',
  templateUrl: './dialog-clickup-transition.component.html',
  styleUrls: ['./dialog-clickup-transition.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogClickupTransitionComponent {
  T: typeof T = T;

  _clickupCfg$: Observable<ClickupCfg> = this._projectService.getClickupCfgForProject$(
    this.data.task.projectId as string,
  );

  availableTransitions$: Observable<ClickupOriginalTransition[]> = this._clickupCfg$.pipe(
    first(),
    switchMap((cfg) =>
      this._clickupApiService.getTransitionsForIssue$(this.data.issue.id, cfg),
    ),
  );

  chosenTransition?: ClickupOriginalTransition;

  constructor(
    private _clickupApiService: ClickupApiService,
    private _projectService: ProjectService,
    private _clickupCommonInterfacesService: ClickupCommonInterfacesService,
    private _matDialogRef: MatDialogRef<DialogClickupTransitionComponent>,
    private _snackService: SnackService,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      issue: ClickupIssueReduced;
      localState: IssueLocalState;
      task: Task;
    },
  ) {
    if (!this.data.task.projectId) {
      throw new Error('No projectId for task');
    }
  }

  close(): void {
    this._matDialogRef.close();
  }

  transitionIssue(): void {
    if (this.chosenTransition && this.chosenTransition.id) {
      const trans: ClickupOriginalTransition = this.chosenTransition;

      this._clickupCfg$
        .pipe(
          concatMap((clickupCfg) =>
            this._clickupApiService.transitionIssue$(
              this.data.issue.id,
              trans.id,
              clickupCfg,
            ),
          ),
          first(),
        )
        .subscribe(() => {
          this._clickupCommonInterfacesService.refreshIssue(this.data.task, false, false);
          this._snackService.open({
            type: 'SUCCESS',
            msg: T.F.CLICKUP.S.TRANSITION,
            translateParams: { issueKey: this.data.issue.key, name: trans.name },
          });
          this.close();
        });
    }
  }

  trackByIndex(i: number, p: any): number {
    return i;
  }
}
