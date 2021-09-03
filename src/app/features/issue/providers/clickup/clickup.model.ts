import { ClickupOriginalTransition } from './clickup-api-responses';

export type ClickupTransitionOption = 'ALWAYS_ASK' | 'DO_NOT' | ClickupOriginalTransition;

export interface ClickupTransitionConfig {
  // NOTE: keys mirror IssueLocalState type
  OPEN: ClickupTransitionOption;
  IN_PROGRESS: ClickupTransitionOption;
  DONE: ClickupTransitionOption;
}

export interface ClickupCfg {
  isEnabled: boolean;
  _isBlockAccess: boolean;
  apiToken: string;
  host: string | null;
  userName: string | null;
  password?: string | null;
  isAutoPollTickets: boolean;
  isWonkyCookieMode: boolean;

  isAllowSelfSignedCertificate: boolean;
  searchJqlQuery: string;

  isAutoAddToBacklog: boolean;
  autoAddBacklogJqlQuery: string;

  isWorklogEnabled: boolean;
  isAutoWorklog: boolean;
  isAddWorklogOnSubTaskDone: boolean;

  isUpdateIssueFromLocal: boolean;

  isShowComponents: boolean;

  isCheckToReAssignTicketOnTaskStart: boolean;

  storyPointFieldId: string | null;

  isTransitionIssuesEnabled: boolean;
  transitionConfig: ClickupTransitionConfig;
  availableTransitions: ClickupOriginalTransition[];
  userToAssignOnDone: string | null;
}

/*
Outline:

Issue Saving:
-------------
* Save all issues once they are linked to a task (and delete them when the task is deleted)
* Update an issue via polling (combine polling interval with todays tasks issues)
tasksToPoll$ = store.select("Issues that belong to todays tasks v") or do this via an effect

Use state for communication and hooks
-------------------------------------
searching ==> "search_start" and "search_success" action handled by an observable
of the searching component which merges the different available streams into one

isAutoPoll ==> own state
?polling ==> handle in own state

worklog ==> on task done
updateTicket ==> on task update
isShowComponents ==> via generic task tags
isCheckToReAssignTicket ==> via change current task
transitioning ==> via time tracking state

 */
