import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { select, Store } from '@ngrx/store';
import {
  concatMap,
  filter,
  first,
  map,
  mapTo,
  switchMap,
  take,
  takeUntil,
  tap,
  throttleTime,
  withLatestFrom,
} from 'rxjs/operators';
import { ClickupApiService } from '../clickup-api.service';
import { ClickupIssueReduced } from './clickup-issue.model';
import { SnackService } from '../../../../../core/snack/snack.service';
import { Task, TaskWithSubTasks } from '../../../../tasks/task.model';
import { TaskService } from '../../../../tasks/task.service';
import {
  BehaviorSubject,
  EMPTY,
  forkJoin,
  Observable,
  of,
  throwError,
  timer,
} from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { DialogClickupTransitionComponent } from '../clickup-view-components/dialog-clickup-transition/dialog-clickup-transition.component';
import { IssueLocalState } from '../../../issue.model';
import {
  CLICKUP_INITIAL_POLL_BACKLOG_DELAY,
  CLICKUP_POLL_INTERVAL,
} from '../clickup.const';
import { ProjectService } from '../../../../project/project.service';
import { IssueService } from '../../../issue.service';
import { CLICKUP_TYPE } from '../../../issue.const';
import { T } from '../../../../../t.const';
import { truncate } from '../../../../../util/truncate';
import { WorkContextService } from '../../../../work-context/work-context.service';
import { ClickupCfg, ClickupTransitionOption } from '../clickup.model';
import { IssueEffectHelperService } from '../../../issue-effect-helper.service';
import { setCurrentTask, updateTask } from '../../../../tasks/store/task.actions';
import { DialogClickupAddWorklogComponent } from '../clickup-view-components/dialog-clickup-add-worklog/dialog-clickup-add-worklog.component';
import {
  selectCurrentTaskParentOrCurrent,
  selectTaskEntities,
} from '../../../../tasks/store/task.selectors';
import { HANDLED_ERROR_PROP_STR } from '../../../../../app.constants';
import { DialogConfirmComponent } from '../../../../../ui/dialog-confirm/dialog-confirm.component';
import { setActiveWorkContext } from '../../../../work-context/store/work-context.actions';
import { WorkContextType } from '../../../../work-context/work-context.model';
import { isClickupEnabled } from '../is-clickup-enabled.util';

@Injectable()
export class ClickupIssueEffects {
  // -----

  addWorklog$: any = createEffect(
    () =>
      this._actions$.pipe(
        ofType(updateTask),
        filter(({ task }) => task.changes.isDone === true),
        withLatestFrom(
          this._workContextService.isActiveWorkContextProject$,
          this._workContextService.activeWorkContextId$,
        ),
        filter(([, isActiveContextProject]) => isActiveContextProject),
        concatMap(([act, , projectId]) =>
          this._getCfgOnce$(projectId as string).pipe(
            map((clickupCfg) => ({
              act,
              projectId,
              clickupCfg,
            })),
          ),
        ),
        filter(({ clickupCfg }) => isClickupEnabled(clickupCfg)),
        withLatestFrom(this._store$.pipe(select(selectTaskEntities))),
        tap(([{ act, projectId, clickupCfg }, taskEntities]) => {
          const taskId = act.task.id;
          const task = taskEntities[taskId];
          if (!task) {
            throw new Error('No task');
          }

          if (clickupCfg.isAddWorklogOnSubTaskDone && clickupCfg.isWorklogEnabled) {
            if (
              task &&
              task.issueType === CLICKUP_TYPE &&
              task.issueId &&
              !(clickupCfg.isAddWorklogOnSubTaskDone && task.subTaskIds.length > 0)
            ) {
              this._openWorklogDialog(task, task.issueId, clickupCfg);
            } else if (task.parentId) {
              const parent = taskEntities[task.parentId];
              if (parent && parent.issueId && parent.issueType === CLICKUP_TYPE) {
                // NOTE we're still sending the sub task for the meta data we need
                this._openWorklogDialog(task, parent.issueId, clickupCfg);
              }
            }
          }
          return undefined;
        }),
      ),
    { dispatch: false },
  );

  // CHECK CONNECTION
  // ----------------
  // NOTE: we don't handle the case of a tag list with multiple and possibly different clickup cfgs
  // we only handle the case when we are in a project. This also makes sense because this might
  // be the most likely scenario for us encountering lots of clickup requests, which might get us
  // locked out from the server
  // NOTE2: this should work 99.9% of the time. It might however not always work when we switch
  // from a project with a working clickup cfg to one with a non working one, but on the other hand
  // this is already complicated enough as is...
  // I am sorry future me O:)

  checkForReassignment: any = createEffect(
    () =>
      this._actions$.pipe(
        ofType(setCurrentTask),
        // only if a task is started
        filter(({ id }) => !!id),
        withLatestFrom(this._store$.pipe(select(selectCurrentTaskParentOrCurrent))),
        filter(
          ([, currentTaskOrParent]) =>
            !!currentTaskOrParent &&
            currentTaskOrParent.issueType === CLICKUP_TYPE &&
            !!currentTaskOrParent.issueId,
        ),
        concatMap(([, currentTaskOrParent]) => {
          if (!currentTaskOrParent.projectId) {
            throw new Error('No projectId for task');
          }
          return this._getCfgOnce$(currentTaskOrParent.projectId).pipe(
            map((clickupCfg) => ({ clickupCfg, currentTaskOrParent })),
          );
        }),
        filter(
          ({ clickupCfg, currentTaskOrParent }) =>
            isClickupEnabled(clickupCfg) && clickupCfg.isCheckToReAssignTicketOnTaskStart,
        ),
        // show every 15s max to give time for updates
        throttleTime(15000),
        // TODO there is probably a better way to to do this
        // TODO refactor to actions
        switchMap(({ clickupCfg, currentTaskOrParent }) => {
          return this._clickupApiService
            .getReducedIssueById$(currentTaskOrParent.issueId as string, clickupCfg)
            .pipe(
              withLatestFrom(this._clickupApiService.getCurrentUser$(clickupCfg)),
              concatMap(([issue, currentUser]) => {
                const assignee = issue.assignee;

                if (!issue) {
                  return throwError({
                    [HANDLED_ERROR_PROP_STR]: 'Clickup: Issue Data not found',
                  });
                } else if (
                  !issue.assignee ||
                  issue.assignee.accountId !== currentUser.accountId
                ) {
                  return this._matDialog
                    .open(DialogConfirmComponent, {
                      restoreFocus: true,
                      data: {
                        okTxt: T.F.CLICKUP.DIALOG_CONFIRM_ASSIGNMENT.OK,
                        translateParams: {
                          summary: issue.summary,
                          assignee: assignee ? assignee.displayName : 'nobody',
                        },
                        message: T.F.CLICKUP.DIALOG_CONFIRM_ASSIGNMENT.MSG,
                      },
                    })
                    .afterClosed()
                    .pipe(
                      switchMap((isConfirm) => {
                        return isConfirm
                          ? this._clickupApiService.updateAssignee$(
                              issue.id,
                              currentUser.accountId,
                              clickupCfg,
                            )
                          : EMPTY;
                      }),
                      // tap(() => {
                      // TODO fix
                      // this._clickupIssueService.updateIssueFromApi(issue.id, issue, false, false);
                      // }),
                    );
                } else {
                  return EMPTY;
                }
              }),
            );
        }),
      ),
    { dispatch: false },
  );

  // POLLING & UPDATES

  checkForStartTransition$: Observable<any> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(setCurrentTask),
        // only if a task is started
        filter(({ id }) => !!id),
        withLatestFrom(this._store$.pipe(select(selectCurrentTaskParentOrCurrent))),
        filter(
          ([, currentTaskOrParent]) =>
            currentTaskOrParent && currentTaskOrParent.issueType === CLICKUP_TYPE,
        ),
        concatMap(([, currentTaskOrParent]) => {
          if (!currentTaskOrParent.projectId) {
            throw new Error('No projectId for task');
          }
          return this._getCfgOnce$(currentTaskOrParent.projectId).pipe(
            map((clickupCfg) => ({ clickupCfg, currentTaskOrParent })),
          );
        }),
        filter(
          ({ clickupCfg, currentTaskOrParent }) =>
            isClickupEnabled(clickupCfg) && clickupCfg.isTransitionIssuesEnabled,
        ),
        concatMap(({ clickupCfg, currentTaskOrParent }) =>
          this._handleTransitionForIssue(
            IssueLocalState.IN_PROGRESS,
            clickupCfg,
            currentTaskOrParent,
          ),
        ),
      ),
    { dispatch: false },
  );

  checkForDoneTransition$: Observable<any> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(updateTask),
        filter(({ task }): boolean => !!task.changes.isDone),
        // NOTE: as this is only a partial object we need to get the full one
        concatMap(({ task }) => this._taskService.getByIdOnce$(task.id as string)),
        filter((task: Task) => task && task.issueType === CLICKUP_TYPE),
        concatMap((task: Task) => {
          if (!task.projectId) {
            throw new Error('No projectId for task');
          }
          return this._getCfgOnce$(task.projectId).pipe(
            map((clickupCfg) => ({ clickupCfg, task })),
          );
        }),
        filter(
          ({ clickupCfg, task }) =>
            isClickupEnabled(clickupCfg) && clickupCfg.isTransitionIssuesEnabled,
        ),
        concatMap(({ clickupCfg, task }) => {
          return this._handleTransitionForIssue(IssueLocalState.DONE, clickupCfg, task);
        }),
      ),
    { dispatch: false },
  );

  // HOOKS
  private _isInitialRequestForProjectDone$: BehaviorSubject<boolean> =
    new BehaviorSubject<boolean>(false);

  checkConnection$: Observable<any> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(setActiveWorkContext),
        tap(() => this._isInitialRequestForProjectDone$.next(false)),
        filter(({ activeType }) => activeType === WorkContextType.PROJECT),
        concatMap(({ activeId }) => this._getCfgOnce$(activeId)),
        // NOTE: might not be loaded yet
        filter((clickupCfg) => isClickupEnabled(clickupCfg)),
        // just fire any single request
        concatMap((clickupCfg) => this._clickupApiService.getCurrentUser$(clickupCfg)),
        tap(() => this._isInitialRequestForProjectDone$.next(true)),
      ),
    { dispatch: false },
  );
  private _pollTimer$: Observable<number> = timer(
    CLICKUP_INITIAL_POLL_BACKLOG_DELAY,
    CLICKUP_POLL_INTERVAL,
  );
  // -----------------

  pollNewIssuesToBacklog$: any = createEffect(
    () =>
      this._issueEffectHelperService.pollToBacklogTriggerToProjectId$.pipe(
        switchMap(this._afterInitialRequestCheckForProjectClickupSuccessfull$.bind(this)),
        switchMap((pId: string) =>
          this._getCfgOnce$(pId).pipe(
            filter(
              (clickupCfg) =>
                isClickupEnabled(clickupCfg) && clickupCfg.isAutoAddToBacklog,
            ),
            // tap(() => console.log('POLL TIMER STARTED')),
            switchMap((clickupCfg) =>
              this._pollTimer$.pipe(
                // NOTE: required otherwise timer stays alive for filtered actions
                takeUntil(this._issueEffectHelperService.pollToBacklogActions$),
                tap(() => console.log('CLICKUP_POLL_BACKLOG_CHANGES')),
                tap(() => this._importNewIssuesToBacklog(pId, clickupCfg)),
              ),
            ),
          ),
        ),
      ),
    { dispatch: false },
  );

  pollIssueChangesForCurrentContext$: any = createEffect(
    () =>
      this._issueEffectHelperService.pollIssueTaskUpdatesActions$.pipe(
        switchMap((inVal) =>
          this._workContextService.isActiveWorkContextProject$.pipe(
            take(1),
            switchMap((isProject) =>
              isProject
                ? this._afterInitialRequestCheckForProjectClickupSuccessfull$(inVal)
                : of(inVal),
            ),
          ),
        ),
        switchMap(() => this._pollTimer$),
        switchMap(() =>
          this._workContextService.allTasksForCurrentContext$.pipe(
            first(),
            switchMap((tasks) => {
              const clickupIssueTasks = tasks.filter(
                (task) => task.issueType === CLICKUP_TYPE,
              );
              return forkJoin(
                clickupIssueTasks.map((task) => {
                  if (!task.projectId) {
                    throw new Error('No projectId for task');
                  }
                  return this._getCfgOnce$(task.projectId).pipe(
                    map((cfg) => ({ cfg, task })),
                  );
                }),
              );
            }),
            map((cos) =>
              cos
                .filter(
                  ({ cfg, task }: { cfg: ClickupCfg; task: TaskWithSubTasks }) =>
                    isClickupEnabled(cfg) && cfg.isAutoPollTickets,
                )
                .map(({ task }: { cfg: ClickupCfg; task: TaskWithSubTasks }) => task),
            ),
            tap((clickupTasks: TaskWithSubTasks[]) => {
              if (clickupTasks && clickupTasks.length > 0) {
                this._snackService.open({
                  msg: T.F.CLICKUP.S.POLLING,
                  svgIco: 'clickup',
                  isSpinner: true,
                });
                clickupTasks.forEach((task) =>
                  this._issueService.refreshIssue(task, true, false),
                );
              }
            }),
          ),
        ),
      ),
    { dispatch: false },
  );

  constructor(
    private readonly _actions$: Actions,
    private readonly _store$: Store<any>,
    private readonly _snackService: SnackService,
    private readonly _projectService: ProjectService,
    private readonly _taskService: TaskService,
    private readonly _workContextService: WorkContextService,
    private readonly _clickupApiService: ClickupApiService,
    private readonly _issueService: IssueService,
    private readonly _matDialog: MatDialog,
    private readonly _issueEffectHelperService: IssueEffectHelperService,
  ) {}

  private _afterInitialRequestCheckForProjectClickupSuccessfull$<TY>(
    args: TY,
  ): Observable<TY> {
    return this._isInitialRequestForProjectDone$.pipe(
      filter((isDone) => isDone),
      take(1),
      mapTo(args),
    );
  }

  private _handleTransitionForIssue(
    localState: IssueLocalState,
    clickupCfg: ClickupCfg,
    task: Task,
  ): Observable<any> {
    const chosenTransition: ClickupTransitionOption =
      clickupCfg.transitionConfig[localState];

    if (!task.issueId) {
      throw new Error('No issueId for task');
    }

    switch (chosenTransition) {
      case 'DO_NOT':
        return EMPTY;
      case 'ALWAYS_ASK':
        return this._clickupApiService
          .getReducedIssueById$(task.issueId, clickupCfg)
          .pipe(
            concatMap((issue) => this._openTransitionDialog(issue, localState, task)),
          );
      default:
        if (!chosenTransition || !chosenTransition.id) {
          this._snackService.open({
            msg: T.F.CLICKUP.S.NO_VALID_TRANSITION,
            type: 'ERROR',
          });
          // NOTE: we would kill the whole effect chain if we do this
          // return throwError({[HANDLED_ERROR_PROP_STR]: 'Clickup: No valid transition configured'});
          return timer(2000).pipe(
            concatMap(() =>
              this._clickupApiService.getReducedIssueById$(
                task.issueId as string,
                clickupCfg,
              ),
            ),
            concatMap((issue: ClickupIssueReduced) =>
              this._openTransitionDialog(issue, localState, task),
            ),
          );
        }

        return this._clickupApiService
          .getReducedIssueById$(task.issueId, clickupCfg)
          .pipe(
            concatMap((issue) => {
              if (!issue.status || issue.status.name !== chosenTransition.name) {
                return this._clickupApiService
                  .transitionIssue$(issue.id, chosenTransition.id, clickupCfg)
                  .pipe(
                    concatMap(() => {
                      this._snackService.open({
                        type: 'SUCCESS',
                        msg: T.F.CLICKUP.S.TRANSITION_SUCCESS,
                        translateParams: {
                          issueKey: `${issue.key}`,
                          chosenTransition: `${chosenTransition.name}`,
                        },
                      });
                      return this._issueService.refreshIssue(task, false, false);
                    }),
                  );
              } else {
                // no transition required
                return EMPTY;
              }
            }),
          );
    }
  }

  private _openWorklogDialog(task: Task, issueId: string, clickupCfg: ClickupCfg): void {
    this._clickupApiService
      .getReducedIssueById$(issueId, clickupCfg)
      .pipe(take(1))
      .subscribe((issue) => {
        this._matDialog.open(DialogClickupAddWorklogComponent, {
          restoreFocus: true,
          data: {
            issue,
            task,
          },
        });
      });
  }

  private _openTransitionDialog(
    issue: ClickupIssueReduced,
    localState: IssueLocalState,
    task: Task,
  ): Observable<any> {
    return this._matDialog
      .open(DialogClickupTransitionComponent, {
        restoreFocus: true,
        data: {
          issue,
          localState,
          task,
        },
      })
      .afterClosed();
  }

  private _importNewIssuesToBacklog(projectId: string, cfg: ClickupCfg): void {
    this._clickupApiService
      .findAutoImportIssues$(cfg)
      .subscribe(async (issues: ClickupIssueReduced[]) => {
        if (!Array.isArray(issues)) {
          return;
        }
        const allTaskClickupIssueIds = (await this._taskService.getAllIssueIdsForProject(
          projectId,
          CLICKUP_TYPE,
        )) as string[];

        // NOTE: we check for key as well as id although normally the key should suffice
        const issuesToAdd = issues.filter(
          (issue) =>
            !allTaskClickupIssueIds.includes(issue.id) &&
            !allTaskClickupIssueIds.includes(issue.key),
        );

        issuesToAdd.forEach((issue) => {
          this._issueService.addTaskWithIssue(CLICKUP_TYPE, issue, projectId, true);
        });

        if (issuesToAdd.length === 1) {
          this._snackService.open({
            translateParams: {
              issueText: truncate(`${issuesToAdd[0].key} ${issuesToAdd[0].summary}`),
            },
            msg: T.F.CLICKUP.S.IMPORTED_SINGLE_ISSUE,
            ico: 'cloud_download',
          });
        } else if (issuesToAdd.length > 1) {
          this._snackService.open({
            translateParams: {
              issuesLength: issuesToAdd.length,
            },
            msg: T.F.CLICKUP.S.IMPORTED_MULTIPLE_ISSUES,
            ico: 'cloud_download',
          });
        }
      });
  }

  private _getCfgOnce$(projectId: string): Observable<ClickupCfg> {
    return this._projectService.getClickupCfgForProject$(projectId).pipe(first());
  }
}
