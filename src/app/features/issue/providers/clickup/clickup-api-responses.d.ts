// Standard API responses
export type ClickupOriginalComponent = Readonly<{
  self: string;
  id: string;
  summary: string;
  name: string;
  description: string;
}>;

export type ClickupOriginalAvatarUrls = Readonly<{
  '16x16': string;
  '24x24': string;
  '32x32': string;
  '48x48': string;
  '140x140': string;
}>;

export type ClickupOriginalAuthor = Readonly<{
  self: string;
  key: string;
  accountId: string;
  avatarUrls: ClickupOriginalAvatarUrls;
  displayName: string;
  active: boolean;
  timeZone: string;

  id: number;
  username: string;
  email: string;
  color: string;
  profilePicture: string;
  initials: string;
  week_start_day: string;
  global_font_support: boolean;
  timezone: string;
}>;

export interface ClickupOriginalUser extends ClickupOriginalAuthor {
  expand: string;
  locale: string;
  groups: {
    items: any[];
    size: number;
  };
  applicationRoles: {
    items: any[];
    size: number;
  };
}

export type ClickupOriginalAttachment = Readonly<{
  self: string;
  id: string;
  filename: string;
  author: ClickupOriginalAuthor;
  created: string;
  size: number;
  mimeType: string;
  content: string;
  thumbnail?: string;
}>;

export type ClickupOriginalComment = Readonly<{
  self: string;
  id: string;
  author: ClickupOriginalAuthor;
  body: string;
  updateAuthor: ClickupOriginalAuthor;
  created: string;
  update: string;
  jsdPublic: boolean;
}>;

export type ClickupOriginalCategory = Readonly<{
  self: string;
  id: string;
  key: string;
  colorName: string;
  name: string;
}>;

export type ClickupOriginalStatus = Readonly<{
  self: string;
  id: string;
  description: string;
  iconUrl: string;
  name: string;
  statusCategory: ClickupOriginalCategory;
}>;

export type ClickupOriginalFields = Readonly<{
  summary: string;
  components: ClickupOriginalComponent[];
  attachment: ClickupOriginalAttachment[];
  timeestimate: number;
  timespent: number;
  description: string | null;
  comment?: {
    comments: ClickupOriginalComment[];
    maxResults: number;
    total: number;
    startAt: number;
  };
  assignee: ClickupOriginalAuthor;
  updated: string;
  status: ClickupOriginalStatus;
}>;

// export type ClickupIssueOriginalReduced = Readonly<{
//   key: string;
//   id: string;
//   expand: string;
//   self: string;
//   fields: ClickupOriginalFields;
//   changelog?: ClickupOriginalChangelog;
// }>;

export type ClickupOriginalChangelog = Readonly<{
  histories: {
    author: ClickupOriginalAuthor;
    created: string;
    id: string;
    items: {
      field: string;
      fieldId: string;
      fieldtype: string;
      from: any;
      fromString: string;
      to: any;
      toString: string;
    }[];
  }[];
  maxResults: number;
  startAt: number;
  total: number;
}>;

export type ClickupOriginalTransition = Readonly<{
  id: string;
  name: string;
  to: {
    self: string;
    description: string;
    iconUrl: string;
    name: string;
    id: string;
    statusCategory: {
      self: string;
      id: 2;
      key: string;
      colorName: string;
      name: string;
    };
  };
  hasScreen: false;
  isGlobal: true;
  isInitial: false;
  isConditional: false;
  fields: Record<string, unknown>;
}>;

export type ClickupIssueOriginal = Readonly<{
  key: string;
  id: string;
  expand: string;
  self: string;
  fields: ClickupOriginalFields;
  changelog?: ClickupOriginalChangelog;
}>;
