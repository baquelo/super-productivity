import {
  JiraIssue,
  JiraIssueReduced,
} from './providers/jira/jira-issue/jira-issue.model';
import {
  ClickupIssue,
  ClickupIssueReduced,
} from './providers/clickup/clickup-issue/clickup-issue.model';
import { JiraCfg } from './providers/jira/jira.model';
import { ClickupCfg } from './providers/clickup/clickup.model';
import { GithubCfg } from './providers/github/github.model';
import {
  GithubIssue,
  GithubIssueReduced,
} from './providers/github/github-issue/github-issue.model';
import { GitlabCfg } from './providers/gitlab/gitlab';
import { GitlabIssue } from './providers/gitlab/gitlab-issue/gitlab-issue.model';
import {
  CaldavIssue,
  CaldavIssueReduced,
} from './providers/caldav/caldav-issue/caldav-issue.model';
import { CaldavCfg } from './providers/caldav/caldav.model';

export type IssueProviderKey = 'JIRA' | 'CLICKUP' | 'GITHUB' | 'GITLAB' | 'CALDAV';
export type IssueIntegrationCfg = JiraCfg | ClickupCfg | GithubCfg | GitlabCfg;

export enum IssueLocalState {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
}

export interface IssueIntegrationCfgs {
  // should be the same as key IssueProviderKey
  JIRA?: JiraCfg;
  CLICKUP?: ClickupCfg;
  GITHUB?: GithubCfg;
  GITLAB?: GitlabCfg;
  CALDAV?: CaldavCfg;
}

export type IssueData =
  | JiraIssue
  | ClickupIssue
  | GithubIssue
  | GitlabIssue
  | CaldavIssue;
export type IssueDataReduced =
  | GithubIssueReduced
  | JiraIssueReduced
  | ClickupIssueReduced
  | GitlabIssue
  | CaldavIssueReduced;

export interface SearchResultItem {
  title: string;
  issueType: IssueProviderKey;
  issueData: IssueDataReduced;
  titleHighlighted?: string;
}
