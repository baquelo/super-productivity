import { Injectable } from '@angular/core';
import * as shortid from 'shortid';
import { ChromeExtensionInterfaceService } from '../../../../core/chrome-extension-interface/chrome-extension-interface.service';
import {
  CLICKUP_ADDITIONAL_ISSUE_FIELDS,
  CLICKUP_DATETIME_FORMAT,
  CLICKUP_MAX_RESULTS,
  CLICKUP_REQUEST_TIMEOUT_DURATION,
} from './clickup.const';
import {
  mapIssueResponse,
  mapIssuesResponse,
  mapResponse,
  mapToSearchResults,
  mapTransitionResponse,
} from './clickup-issue/clickup-issue-map.util';
import {
  ClickupOriginalStatus,
  ClickupOriginalTransition,
  ClickupOriginalUser,
} from './clickup-api-responses';
import { ClickupCfg } from './clickup.model';
import { IPC } from '../../../../../../electron/ipc-events.const';
import { SnackService } from '../../../../core/snack/snack.service';
import { HANDLED_ERROR_PROP_STR, IS_ELECTRON } from '../../../../app.constants';
import { Observable, of, throwError } from 'rxjs';
import { SearchResultItem } from '../../issue.model';
import {
  catchError,
  concatMap,
  finalize,
  first,
  mapTo,
  shareReplay,
  take,
} from 'rxjs/operators';
import { ClickupIssue, ClickupIssueReduced } from './clickup-issue/clickup-issue.model';
import * as moment from 'moment';
import { BannerService } from '../../../../core/banner/banner.service';
import { BannerId } from '../../../../core/banner/banner.model';
import { T } from '../../../../t.const';
import { ElectronService } from '../../../../core/electron/electron.service';
// import { stringify } from 'query-string';
import { fromPromise } from 'rxjs/internal-compatibility';
import { getErrorTxt } from '../../../../util/get-error-text';
import { isOnline } from '../../../../util/is-online';
import { GlobalProgressBarService } from '../../../../core-ui/global-progress-bar/global-progress-bar.service';
import { ipcRenderer, IpcRendererEvent } from 'electron';
import { SS_CLICKUP_WONKY_COOKIE } from '../../../../core/persistence/ls-keys.const';
import { MatDialog } from '@angular/material/dialog';
import { DialogPromptComponent } from '../../../../ui/dialog-prompt/dialog-prompt.component';
import { stripTrailing } from '../../../../util/strip-trailing';

const BLOCK_ACCESS_KEY = 'SUP_BLOCK_CLICKUP_ACCESS';
const API_VERSION = 'v2';

interface ClickupRequestLogItem {
  transform: (res: any, cfg: any) => any;
  requestInit: RequestInit;
  timeoutId: number;
  clickupCfg: ClickupCfg;

  resolve(res: any): Promise<void>;

  reject(reason?: any): Promise<unknown>;
}

interface ClickupRequestCfg {
  pathname: string;
  followAllRedirects?: boolean;
  method?: 'GET' | 'POST' | 'PUT';
  query?: {
    [key: string]: string | boolean | number | string[];
  };
  transform?: (res: any, clickupCfg?: ClickupCfg) => any;
  body?: Record<string, unknown>;
}

@Injectable({
  providedIn: 'root',
})
export class ClickupApiService {
  private _requestsLog: { [key: string]: ClickupRequestLogItem } = {};
  private _isBlockAccess: boolean = !!sessionStorage.getItem(BLOCK_ACCESS_KEY);
  private _isExtension: boolean = false;
  private _isInterfacesReadyIfNeeded$: Observable<boolean> = IS_ELECTRON
    ? of(true).pipe()
    : this._chromeExtensionInterfaceService.onReady$.pipe(mapTo(true), shareReplay(1));

  constructor(
    private _chromeExtensionInterfaceService: ChromeExtensionInterfaceService,
    private _electronService: ElectronService,
    private _globalProgressBarService: GlobalProgressBarService,
    private _snackService: SnackService,
    private _bannerService: BannerService,
    private _matDialog: MatDialog,
  ) {
    // set up callback listener for electron
    if (IS_ELECTRON) {
      (this._electronService.ipcRenderer as typeof ipcRenderer).on(
        IPC.CLICKUP_CB_EVENT,
        (ev: IpcRendererEvent, res: any) => {
          this._handleResponse(res);
        },
      );
    }

    this._chromeExtensionInterfaceService.onReady$.subscribe(() => {
      this._isExtension = true;
      this._chromeExtensionInterfaceService.addEventListener(
        'SP_CLICKUP_RESPONSE',
        (ev: unknown, data: any) => {
          this._handleResponse(data);
        },
      );
    });
  }

  unblockAccess(): void {
    this._isBlockAccess = false;
    sessionStorage.removeItem(BLOCK_ACCESS_KEY);
  }

  issuePicker$(searchTerm: string, cfg: ClickupCfg): Observable<SearchResultItem[]> {
    const searchStr = `${searchTerm}`;

    return this._sendRequest$({
      clickupReqCfg: {
        pathname: 'issue/picker',
        followAllRedirects: true,
        query: {
          showSubTasks: true,
          showSubTaskParent: true,
          query: searchStr,
          currentJQL: cfg.searchJqlQuery,
        },
        transform: mapToSearchResults,
        // NOTE: we pass the cfg as well to avoid race conditions
      },
      cfg,
    });
  }

  listFields$(cfg: ClickupCfg): Observable<any> {
    return this._sendRequest$({
      clickupReqCfg: {
        pathname: 'field',
      },
      cfg,
    });
  }

  findAutoImportIssues$(
    cfg: ClickupCfg,
    isFetchAdditional?: boolean,
    maxResults: number = CLICKUP_MAX_RESULTS,
  ): Observable<ClickupIssueReduced[]> {
    const options = {
      maxResults,
      fields: [
        ...CLICKUP_ADDITIONAL_ISSUE_FIELDS,
        ...(cfg.storyPointFieldId ? [cfg.storyPointFieldId] : []),
      ],
    };
    const searchQuery = cfg.autoAddBacklogJqlQuery;

    if (!searchQuery) {
      this._snackService.open({
        type: 'ERROR',
        msg: T.F.CLICKUP.S.NO_AUTO_IMPORT_JQL,
      });
      return throwError({
        [HANDLED_ERROR_PROP_STR]: 'ClickupApi: No search query for auto import',
      });
    }

    return this._sendRequest$({
      clickupReqCfg: {
        transform: mapIssuesResponse as (res: any, cfg?: ClickupCfg) => any,
        pathname: 'search',
        method: 'POST',
        body: {
          ...options,
          jql: searchQuery,
        },
      },
      cfg,
    });
  }

  getIssueById$(issueId: string, cfg: ClickupCfg): Observable<ClickupIssue> {
    return this._getIssueById$(issueId, cfg, true);
  }

  getReducedIssueById$(
    issueId: string,
    cfg: ClickupCfg,
  ): Observable<ClickupIssueReduced> {
    return this._getIssueById$(issueId, cfg, false);
  }

  getCurrentUser$(
    cfg: ClickupCfg,
    isForce: boolean = false,
  ): Observable<ClickupOriginalUser> {
    return this._sendRequest$({
      clickupReqCfg: {
        pathname: `user`,
        transform: mapResponse,
      },
      cfg,
      isForce,
    });
  }

  listStatus$(cfg: ClickupCfg): Observable<ClickupOriginalStatus[]> {
    return this._sendRequest$({
      clickupReqCfg: {
        pathname: `status`,
        transform: mapResponse,
      },
      cfg,
    });
  }

  getTransitionsForIssue$(
    issueId: string,
    cfg: ClickupCfg,
  ): Observable<ClickupOriginalTransition[]> {
    return this._sendRequest$({
      clickupReqCfg: {
        pathname: `issue/${issueId}/transitions`,
        method: 'GET',
        query: {
          expand: 'transitions.fields',
        },
        transform: mapTransitionResponse,
      },
      cfg,
    });
  }

  transitionIssue$(
    issueId: string,
    transitionId: string,
    cfg: ClickupCfg,
  ): Observable<any> {
    return this._sendRequest$({
      clickupReqCfg: {
        pathname: `issue/${issueId}/transitions`,
        method: 'POST',
        body: {
          transition: {
            id: transitionId,
          },
        },
        transform: mapResponse,
      },
      cfg,
    });
  }

  updateAssignee$(issueId: string, accountId: string, cfg: ClickupCfg): Observable<any> {
    return this._sendRequest$({
      clickupReqCfg: {
        pathname: `issue/${issueId}/assignee`,
        method: 'PUT',
        body: {
          accountId,
        },
      },
      cfg,
    });
  }

  addWorklog$({
    issueId,
    started,
    timeSpent,
    comment,
    cfg,
  }: {
    issueId: string;
    started: string;
    timeSpent: number;
    comment: string;
    cfg: ClickupCfg;
  }): Observable<any> {
    const worklog = {
      started: moment(started).locale('en').format(CLICKUP_DATETIME_FORMAT),
      timeSpentSeconds: Math.floor(timeSpent / 1000),
      comment,
    };
    return this._sendRequest$({
      clickupReqCfg: {
        pathname: `issue/${issueId}/worklog`,
        method: 'POST',
        body: worklog,
        transform: mapResponse,
      },
      cfg,
    });
  }

  private _getIssueById$(
    issueId: string,
    cfg: ClickupCfg,
    isGetChangelog: boolean = false,
  ): Observable<ClickupIssue> {
    return this._sendRequest$({
      clickupReqCfg: {
        transform: mapIssueResponse as (res: any, cfg?: ClickupCfg) => any,
        pathname: `issue/${issueId}`,
        query: {
          expand: isGetChangelog ? ['changelog', 'description'] : ['description'],
        },
      },
      cfg,
    });
  }

  // Complex Functions

  // --------
  private _isMinimalSettings(settings: ClickupCfg): boolean {
    return !!(settings && settings.apiToken && (IS_ELECTRON || this._isExtension));
  }

  private _sendRequest$({
    clickupReqCfg,
    cfg,
    isForce = false,
  }: {
    clickupReqCfg: ClickupRequestCfg;
    cfg: ClickupCfg;
    isForce?: boolean;
  }): Observable<any> {
    return this._isInterfacesReadyIfNeeded$.pipe(
      take(1),
      concatMap(() =>
        IS_ELECTRON && cfg.isWonkyCookieMode ? this._checkSetWonkyCookie(cfg) : of(true),
      ),
      concatMap(() => {
        // assign uuid to request to know which responsive belongs to which promise
        const requestId = `${clickupReqCfg.pathname}__${
          clickupReqCfg.method || 'GET'
        }__${shortid()}`;

        if (!isOnline()) {
          this._snackService.open({
            type: 'CUSTOM',
            msg: T.G.NO_CON,
            ico: 'cloud_off',
          });
          return throwError({ [HANDLED_ERROR_PROP_STR]: 'Clickup Offline ' + requestId });
        }

        if (!this._isMinimalSettings(cfg)) {
          this._snackService.open({
            type: 'ERROR',
            msg:
              !IS_ELECTRON && !this._isExtension
                ? T.F.CLICKUP.S.EXTENSION_NOT_LOADED
                : T.F.CLICKUP.S.INSUFFICIENT_SETTINGS,
          });
          return throwError({
            [HANDLED_ERROR_PROP_STR]: 'Insufficient Settings for Clickup ' + requestId,
          });
        }

        if (this._isBlockAccess && !isForce) {
          console.error('Blocked Clickup Access to prevent being shut out');
          this._bannerService.open({
            id: BannerId.ClickupUnblock,
            msg: T.F.CLICKUP.BANNER.BLOCK_ACCESS_MSG,
            svgIco: 'clickup',
            action: {
              label: T.F.CLICKUP.BANNER.BLOCK_ACCESS_UNBLOCK,
              fn: () => this.unblockAccess(),
            },
          });
          return throwError({
            [HANDLED_ERROR_PROP_STR]:
              'Blocked access to prevent being shut out ' + requestId,
          });
        }

        // BUILD REQUEST START
        // -------------------
        const requestInit = this._makeRequestInit(clickupReqCfg, cfg);

        // const queryStr = clickupReqCfg.query
        //   ? `?${stringify(clickupReqCfg.query, { arrayFormat: 'comma' })}`
        //   : '';
        const host = 'https://api.clickup.com';
        // const base = `${stripTrailing(cfg.host || 'null', '/')}/rest/api/${API_VERSION}`;
        const base = `${stripTrailing(host || 'null', '/')}/api/${API_VERSION}`;
        // const url = `${base}/${clickupReqCfg.pathname}${queryStr}`.trim();
        const url = `${base}/${clickupReqCfg.pathname}`.trim();

        return this._sendRequestToExecutor$(
          requestId,
          url,
          requestInit,
          clickupReqCfg.transform,
          cfg,
        );
        // NOTE: offline is sexier & easier than cache, but in case we change our mind...
        // const args = [requestId, url, requestInit, clickupReqCfg.transform];
        // return this._issueCacheService.cache(url, requestInit, this._sendRequestToExecutor$.bind(this), args);
      }),
    );
  }

  private _sendRequestToExecutor$(
    requestId: string,
    url: string,
    requestInit: RequestInit,
    transform: any,
    clickupCfg: ClickupCfg,
  ): Observable<any> {
    // TODO refactor to observable for request canceling etc
    let promiseResolve;
    let promiseReject;
    const promise = new Promise((resolve, reject) => {
      promiseResolve = resolve;
      promiseReject = reject;
    });

    // save to request log (also sets up timeout)
    this._requestsLog[requestId] = this._makeClickupRequestLogItem({
      promiseResolve,
      promiseReject,
      requestId,
      requestInit,
      transform,
      clickupCfg,
    });

    const requestToSend = { requestId, requestInit, url };
    if (this._electronService.isElectronApp) {
      (this._electronService.ipcRenderer as typeof ipcRenderer).send(
        IPC.CLICKUP_MAKE_REQUEST_EVENT,
        {
          ...requestToSend,
          clickupCfg,
        },
      );
    } else if (this._isExtension) {
      this._chromeExtensionInterfaceService.dispatchEvent(
        'SP_CLICKUP_REQUEST',
        requestToSend,
      );
    }

    this._globalProgressBarService.countUp(url);
    return fromPromise(promise).pipe(
      catchError((err) => {
        console.log(err);
        console.log(getErrorTxt(err));
        const errTxt = `Clickup: ${getErrorTxt(err)}`;
        this._snackService.open({ type: 'ERROR', msg: errTxt });
        return throwError({ [HANDLED_ERROR_PROP_STR]: errTxt });
      }),
      first(),
      finalize(() => this._globalProgressBarService.countDown()),
    );
  }

  private _makeRequestInit(jr: ClickupRequestCfg, cfg: ClickupCfg): RequestInit {
    return {
      method: jr.method || 'GET',

      ...(jr.body ? { body: JSON.stringify(jr.body) } : {}),

      headers: {
        Authorization: cfg.apiToken,
        'Content-Type': 'application/json',
      },
    };
  }

  private async _checkSetWonkyCookie(cfg: ClickupCfg): Promise<string | null> {
    const ssVal = sessionStorage.getItem(SS_CLICKUP_WONKY_COOKIE);
    if (ssVal && ssVal.length > 0) {
      return ssVal;
    } else {
      const loginUrl = `${cfg.host}`;
      const apiUrl = `${cfg.host}/rest/api/${API_VERSION}/myself`;

      const val = await this._matDialog
        .open(DialogPromptComponent, {
          data: {
            // TODO add message to translations
            placeholder: 'Insert Cookie String',
            message: `<h3>Clickup Wonky Cookie Authentication</h3>
<ol>
  <li><a href="${loginUrl}">Log into Clickup from your browser</a></li>
  <li><a href="${apiUrl}" target="_blank">Go to this api url</a></li>
  <li>Open up the dev tools</li>
  <li>Navigate to "network" and reload page</li>
  <li>Copy all request header cookies from the api request and enter them here</li>
</ol>`,
          },
        })
        .afterClosed()
        .toPromise();

      if (typeof val === 'string') {
        sessionStorage.setItem(SS_CLICKUP_WONKY_COOKIE, val);
        return val;
      }
    }

    this._blockAccess();
    return null;
  }

  private _makeClickupRequestLogItem({
    promiseResolve,
    promiseReject,
    requestId,
    requestInit,
    transform,
    clickupCfg,
  }: {
    promiseResolve: any;
    promiseReject: any;
    requestId: string;
    requestInit: RequestInit;
    transform: any;
    clickupCfg: ClickupCfg;
  }): ClickupRequestLogItem {
    return {
      transform,
      resolve: promiseResolve,
      reject: promiseReject,
      // NOTE: only needed for debug
      requestInit,
      clickupCfg,

      timeoutId: window.setTimeout(() => {
        console.log('ERROR', 'Clickup Request timed out', requestInit);
        this._blockAccess();
        // delete entry for promise
        this._snackService.open({
          msg: T.F.CLICKUP.S.TIMED_OUT,
          type: 'ERROR',
        });
        this._requestsLog[requestId].reject('Request timed out');
        delete this._requestsLog[requestId];
      }, CLICKUP_REQUEST_TIMEOUT_DURATION),
    };
  }

  private _handleResponse(res: { requestId?: string; error?: any }): void {
    // check if proper id is given in callback and if exists in requestLog
    if (res.requestId && this._requestsLog[res.requestId]) {
      const currentRequest = this._requestsLog[res.requestId];
      // cancel timeout for request
      window.clearTimeout(currentRequest.timeoutId);

      // resolve saved promise
      if (!res || res.error) {
        console.error('CLICKUP_RESPONSE_ERROR', res, currentRequest);
        // let msg =
        if (
          res?.error &&
          (res.error.statusCode === 401 ||
            res.error === 401 ||
            res.error.message === 'Forbidden' ||
            res.error.message === 'Unauthorized')
        ) {
          this._blockAccess();
        }

        currentRequest.reject(res);
      } else {
        // console.log('CLICKUP_RESPONSE', res);
        if (currentRequest.transform) {
          // data can be invalid, that's why we check
          try {
            currentRequest.resolve(
              currentRequest.transform(res, currentRequest.clickupCfg),
            );
          } catch (e) {
            console.log(res);
            console.log(currentRequest);
            console.error(e);
            this._snackService.open({
              type: 'ERROR',
              msg: T.F.CLICKUP.S.INVALID_RESPONSE,
            });
          }
        } else {
          currentRequest.resolve(res);
        }
      }
      // delete entry for promise afterwards
      delete this._requestsLog[res.requestId];
    } else {
      console.warn('Clickup: Response Request ID not existing', res && res.requestId);
    }
  }

  private _blockAccess(): void {
    // TODO also shut down all existing requests
    this._isBlockAccess = true;
    sessionStorage.setItem(BLOCK_ACCESS_KEY, 'true');
    sessionStorage.removeItem(SS_CLICKUP_WONKY_COOKIE);
  }

  private _b64EncodeUnicode(str: string): string {
    if (typeof (btoa as any) === 'function') {
      return btoa(str);
    }
    throw new Error('Clickup: btoo not supported');
  }
}
