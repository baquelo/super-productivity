import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Task } from '../../../../features/tasks/task.model';
import { catchError, first, map, switchMap } from 'rxjs/operators';
import { IssueServiceInterface } from '../../issue-service-interface';
import { ClickupApiService } from './clickup-api.service';
import { SnackService } from '../../../../core/snack/snack.service';
import { ProjectService } from '../../../project/project.service';
import { SearchResultItem } from '../../issue.model';
import { ClickupIssue, ClickupIssueReduced } from './clickup-issue/clickup-issue.model';
import { TaskAttachment } from '../../../tasks/task-attachment/task-attachment.model';
import { mapClickupAttachmentToAttachment } from './clickup-issue/clickup-issue-map.util';
import { T } from '../../../../t.const';
import { ClickupCfg } from './clickup.model';

@Injectable({
  providedIn: 'root',
})
export class ClickupCommonInterfacesService implements IssueServiceInterface {
  constructor(
    private readonly _clickupApiService: ClickupApiService,
    private readonly _snackService: SnackService,
    private readonly _projectService: ProjectService,
  ) {}

  // NOTE: we're using the issueKey instead of the real issueId
  getById$(issueId: string | number, projectId: string): Observable<ClickupIssue> {
    return this._getCfgOnce$(projectId).pipe(
      switchMap((clickupCfg) =>
        this._clickupApiService.getIssueById$(issueId as string, clickupCfg),
      ),
    );
  }

  // NOTE: this gives back issueKey instead of issueId
  searchIssues$(searchTerm: string, projectId: string): Observable<SearchResultItem[]> {
    return this._getCfgOnce$(projectId).pipe(
      switchMap((clickupCfg) =>
        clickupCfg && clickupCfg.isEnabled
          ? this._clickupApiService
              .issuePicker$(searchTerm, clickupCfg)
              .pipe(catchError(() => []))
          : of([]),
      ),
    );
  }

  async refreshIssue(
    task: Task,
    isNotifySuccess: boolean = true,
    isNotifyNoUpdateRequired: boolean = false,
  ): Promise<{ taskChanges: Partial<Task>; issue: ClickupIssue } | null> {
    if (!task.projectId) {
      throw new Error('No projectId');
    }
    if (!task.issueId) {
      throw new Error('No issueId');
    }

    const cfg = await this._getCfgOnce$(task.projectId).toPromise();
    const issue = (await this._clickupApiService
      .getIssueById$(task.issueId, cfg)
      .toPromise()) as ClickupIssue;

    // @see https://developer.atlassian.com/cloud/clickup/platform/clickup-expressions-type-reference/#date
    const newUpdated = new Date(issue.updated).getTime();
    const wasUpdated = newUpdated > (task.issueLastUpdated || 0);

    // NOTIFICATIONS
    if (wasUpdated && isNotifySuccess) {
      this._snackService.open({
        msg: T.F.CLICKUP.S.ISSUE_UPDATE,
        translateParams: {
          issueText: `${issue.key}`,
        },
        ico: 'cloud_download',
      });
    } else if (isNotifyNoUpdateRequired) {
      this._snackService.open({
        msg: T.F.CLICKUP.S.ISSUE_NO_UPDATE_REQUIRED,
        translateParams: {
          issueText: `${issue.key}`,
        },
        ico: 'cloud_download',
      });
    }

    if (wasUpdated) {
      return {
        taskChanges: {
          title: `${issue.key} ${issue.summary}`,
          issueLastUpdated: newUpdated,
          issueWasUpdated: wasUpdated,
          // circumvent errors for old clickup versions #652
          issueAttachmentNr: issue.attachments?.length,
          issuePoints: issue.storyPoints,
        },
        issue,
      };
    }
    return null;
  }

  getAddTaskData(issue: ClickupIssueReduced): {
    title: string;
    additionalFields: Partial<Task>;
  } {
    return {
      title: `${issue.key} ${issue.summary}`,
      additionalFields: {
        issuePoints: issue.storyPoints,
        issueAttachmentNr: issue.attachments ? issue.attachments.length : 0,
        issueWasUpdated: false,
        issueLastUpdated: new Date(issue.updated).getTime(),
      },
    };
  }

  issueLink$(issueId: string | number, projectId: string): Observable<string> {
    if (!issueId || !projectId) {
      throw new Error('No issueId or no projectId');
    }
    // const isIssueKey = isNaN(Number(issueId));
    return this._projectService.getClickupCfgForProject$(projectId).pipe(
      first(),
      map((clickupCfg) => clickupCfg.host + '/browse/' + issueId),
    );
  }

  getMappedAttachments(issueData: ClickupIssue): TaskAttachment[] {
    return (
      issueData &&
      issueData.attachments &&
      issueData.attachments.map(mapClickupAttachmentToAttachment)
    );
  }

  private _getCfgOnce$(projectId: string): Observable<ClickupCfg> {
    return this._projectService.getClickupCfgForProject$(projectId).pipe(first());
  }
}
