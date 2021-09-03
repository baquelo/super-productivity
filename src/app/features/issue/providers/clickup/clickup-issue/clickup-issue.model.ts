// Mapped Data Types
// -----------------
import {
  ClickupOriginalComponent,
  ClickupOriginalStatus,
} from '../clickup-api-responses';

export type ClickupAuthor = Readonly<{
  id: string;
  name: string;
  key: string;
  accountId: string;
  emailAddress: string;
  avatarUrl: string;
  displayName: string;
  active: boolean;
  timeZone: string;
}>;

export type ClickupAttachment = Readonly<{
  id: string;
  filename: string;
  created: string;
  size: number;
  mimeType: string;
  content: string;
  thumbnail?: string;
}>;

export type ClickupComment = Readonly<{
  id: string;
  author: ClickupAuthor;
  body: string;
  updateAuthor: ClickupAuthor;
  created: string;
  update: string;
  jsdPublic: boolean;
}>;

export type ClickupChangelogEntry = Readonly<{
  author: ClickupAuthor | null;
  created: string;
  field: string;
  from: string;
  to: string;
}>;

// NOTE this is NOT equal to ClickupIssueOriginalReduced

export type ClickupIssueReduced = Readonly<{
  // copied data
  key: string;
  id: string;
  summary: string;
  components: ClickupOriginalComponent[];
  timeestimate: number;
  timespent: number;
  description: string | null;

  updated: string;
  status: ClickupOriginalStatus;

  // mapped data
  attachments: ClickupAttachment[];
  assignee: ClickupAuthor | null;

  // new properties (mapped)
  comments: ClickupComment[];
  storyPoints?: number;
}>;

export type ClickupIssue = ClickupIssueReduced &
  Readonly<{
    changelog: ClickupChangelogEntry[];
  }>;
