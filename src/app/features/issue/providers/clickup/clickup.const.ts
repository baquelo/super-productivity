// TODO use as a checklist
import { ClickupCfg } from './clickup.model';
import { GITHUB_INITIAL_POLL_DELAY } from '../github/github.const';
import { T } from '../../../../t.const';
import {
  ConfigFormSection,
  LimitedFormlyFieldConfig,
} from '../../../config/global-config.model';

export const CLICKUP_DATETIME_FORMAT = 'YYYY-MM-DDTHH:mm:ss.SSZZ';

export const DEFAULT_CLICKUP_CFG: ClickupCfg = {
  isEnabled: false,
  _isBlockAccess: false,
  apiToken: '',
  host: null,
  userName: null,
  password: null,
  isWonkyCookieMode: false,

  isAutoPollTickets: true,
  searchJqlQuery: '',

  isAutoAddToBacklog: true,
  autoAddBacklogJqlQuery:
    'assignee = currentUser() AND sprint in openSprints() AND resolution = Unresolved',

  isWorklogEnabled: true,
  isAutoWorklog: false,
  isAddWorklogOnSubTaskDone: true,
  isAllowSelfSignedCertificate: false,
  isUpdateIssueFromLocal: false,

  isShowComponents: true,

  isCheckToReAssignTicketOnTaskStart: false,

  storyPointFieldId: null,

  isTransitionIssuesEnabled: true,

  availableTransitions: [],
  transitionConfig: {
    OPEN: 'DO_NOT',
    IN_PROGRESS: 'ALWAYS_ASK',
    DONE: 'ALWAYS_ASK',
  },
  userToAssignOnDone: null,
};

// export const CLICKUP_POLL_INTERVAL = 10 * 1000;
// export const CLICKUP_INITIAL_POLL_DELAY = 5000;

export const CLICKUP_POLL_INTERVAL = 5 * 60 * 1000;
export const CLICKUP_INITIAL_POLL_DELAY = GITHUB_INITIAL_POLL_DELAY + 4000;
export const CLICKUP_INITIAL_POLL_BACKLOG_DELAY = CLICKUP_INITIAL_POLL_DELAY + 10000;

// it's weird!!
export const CLICKUP_DATE_FORMAT = 'YYYY-MM-DDTHH:mm:ss.SSZZ';
export const CLICKUP_ISSUE_TYPE = 'CLICKUP';
export const CLICKUP_REQUEST_TIMEOUT_DURATION = 200000;
export const CLICKUP_MAX_RESULTS = 100;
export const CLICKUP_ADDITIONAL_ISSUE_FIELDS = [
  'assignee',
  'summary',
  'description',
  'timeestimate',
  'timespent',
  'status',
  'attachment',
  'comment',
  'updated',
  'components',
  'subtasks',
];

// there has to be one field otherwise we get all...
export const CLICKUP_REDUCED_ISSUE_FIELDS = [
  'summary',
  'updated',
  'timeestimate',
  'timespent',
];

export const CLICKUP_CREDENTIALS_FORM_CFG: LimitedFormlyFieldConfig<ClickupCfg>[] = [
  {
    key: 'apiToken',
    type: 'input',
    templateOptions: {
      type: 'input',
      required: true,
      label: T.F.CLICKUP.FORM_CRED.API_TOKEN,
    },
  },
];

export const CLICKUP_ADVANCED_FORM_CFG: LimitedFormlyFieldConfig<ClickupCfg>[] = [
  {
    key: 'isAutoPollTickets',
    type: 'checkbox',
    templateOptions: {
      label: T.F.CLICKUP.FORM_ADV.IS_AUTO_POLL_TICKETS,
    },
  },
  {
    key: 'isCheckToReAssignTicketOnTaskStart',
    type: 'checkbox',
    templateOptions: {
      label: T.F.CLICKUP.FORM_ADV.IS_CHECK_TO_RE_ASSIGN_TICKET_ON_TASK_START,
    },
  },
  {
    key: 'isAutoAddToBacklog',
    type: 'checkbox',
    templateOptions: {
      label: T.F.CLICKUP.FORM_ADV.IS_AUTO_ADD_TO_BACKLOG,
    },
  },
  {
    key: 'autoAddBacklogJqlQuery',
    type: 'input',
    templateOptions: {
      label: T.F.CLICKUP.FORM_ADV.AUTO_ADD_BACKLOG_JQL_QUERY,
    },
  },
  {
    key: 'searchJqlQuery',
    type: 'input',
    templateOptions: {
      label: T.F.CLICKUP.FORM_ADV.SEARCH_JQL_QUERY,
    },
  },
  {
    key: 'isWorklogEnabled',
    type: 'checkbox',
    templateOptions: {
      label: T.F.CLICKUP.FORM_ADV.IS_WORKLOG_ENABLED,
    },
  },
  {
    key: 'isAddWorklogOnSubTaskDone',
    type: 'checkbox',
    templateOptions: {
      label: T.F.CLICKUP.FORM_ADV.IS_ADD_WORKLOG_ON_SUB_TASK_DONE,
    },
  },
];

export const CLICKUP_CONFIG_FORM_SECTION: ConfigFormSection<ClickupCfg> = {
  title: 'Clickup',
  key: 'CLICKUP',
  customSection: 'CLICKUP_CFG',
  helpArr: [
    {
      h: T.F.CLICKUP.FORM_SECTION.HELP_ARR.H1,
      p: T.F.CLICKUP.FORM_SECTION.HELP_ARR.P1_1,
      p2: T.F.CLICKUP.FORM_SECTION.HELP_ARR.P1_2,
      p3: T.F.CLICKUP.FORM_SECTION.HELP_ARR.P1_3,
      p4: T.F.CLICKUP.FORM_SECTION.HELP_ARR.P1_4,
    },
    {
      h: T.F.CLICKUP.FORM_SECTION.HELP_ARR.H2,
      p: T.F.CLICKUP.FORM_SECTION.HELP_ARR.P2_1,
      p2: T.F.CLICKUP.FORM_SECTION.HELP_ARR.P2_2,
      p3: T.F.CLICKUP.FORM_SECTION.HELP_ARR.P2_3,
    },
    {
      h: T.F.CLICKUP.FORM_SECTION.HELP_ARR.H3,
      p: T.F.CLICKUP.FORM_SECTION.HELP_ARR.P3_1,
    },
  ],
  items: [
    {
      type: 'tpl',
      className: 'tpl',
      templateOptions: {
        tag: 'h3',
        class: 'sub-section-heading',
        text: T.F.CLICKUP.FORM_SECTION.CREDENTIALS,
      },
    },
    ...CLICKUP_CREDENTIALS_FORM_CFG,
    {
      type: 'tpl',
      className: 'tpl',
      templateOptions: {
        tag: 'h3',
        class: 'sub-section-heading',
        text: T.F.CLICKUP.FORM_SECTION.ADV_CFG,
      },
    },
    ...CLICKUP_ADVANCED_FORM_CFG,
  ],
};
