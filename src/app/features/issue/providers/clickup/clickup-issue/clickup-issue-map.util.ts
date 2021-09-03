import {
  ClickupAttachment,
  ClickupAuthor,
  ClickupChangelogEntry,
  ClickupComment,
  ClickupIssue,
} from './clickup-issue.model';
import {
  ClickupIssueOriginal,
  ClickupOriginalAttachment,
  ClickupOriginalAuthor,
  ClickupOriginalChangelog,
  ClickupOriginalComment,
} from '../clickup-api-responses';
import { ClickupCfg } from '../clickup.model';
import {
  DropPasteIcons,
  DropPasteInputType,
} from '../../../../../core/drop-paste-input/drop-paste.model';
import { IssueProviderKey, SearchResultItem } from '../../../issue.model';
import { TaskAttachment } from '../../../../tasks/task-attachment/task-attachment.model';
import { dedupeByKey } from '../../../../../util/de-dupe-by-key';
import { CLICKUP_TYPE } from '../../../issue.const';

export const mapToSearchResults = (res: any): SearchResultItem[] => {
  const issues = dedupeByKey(
    res.response.sections.map((sec: any) => sec.issues).flat(),
    'key',
  ).map((issue: any) => {
    return {
      title: issue.key + ' ' + issue.summaryText,
      titleHighlighted: issue.key + ' ' + issue.summary,
      issueType: CLICKUP_TYPE as IssueProviderKey,
      issueData: {
        ...issue,
        summary: issue.summaryText,
        // NOTE: we always use the key, because it allows us to create the right link
        id: issue.key,
      },
    };
  });
  return issues;
};

export const mapIssuesResponse = (res: any, cfg: ClickupCfg): ClickupIssue[] => {
  return res.response.issues.map((issue: ClickupIssueOriginal) => {
    return mapIssue(issue, cfg);
  });
};

export const mapResponse = (res: any): unknown => res.response;

export const mapIssueResponse = (res: any, cfg: ClickupCfg): ClickupIssue =>
  mapIssue(res.response, cfg);

export const mapIssue = (issue: ClickupIssueOriginal, cfg: ClickupCfg): ClickupIssue => {
  const issueCopy = Object.assign({}, issue);
  const fields = issueCopy.fields;

  return {
    key: issueCopy.key,
    // NOTE: we always use the key, because it allows us to create the right link
    id: issueCopy.key,
    components: fields.components,
    timeestimate: fields.timeestimate,
    timespent: fields.timespent,
    description: fields.description,
    summary: fields.summary,
    updated: fields.updated,
    status: fields.status,
    storyPoints:
      !!cfg.storyPointFieldId && !!(fields as any)[cfg.storyPointFieldId]
        ? ((fields as any)[cfg.storyPointFieldId] as number)
        : undefined,
    attachments: fields.attachment && fields.attachment.map(mapAttachment),
    comments:
      !!fields.comment && !!fields.comment.comments
        ? fields.comment.comments.map(mapComments)
        : [],
    changelog: mapChangelog(issueCopy.changelog as ClickupOriginalChangelog),
    assignee: mapAuthor(fields.assignee, true),
    // url: makeIssueUrl(cfg.host, issueCopy.key)
  };
};

export const mapAuthor = (
  author: ClickupOriginalAuthor,
  isOptional: boolean = false,
): ClickupAuthor | null => {
  if (!author) {
    return null;
  }
  return Object.assign({}, author, {
    self: undefined,
    avatarUrls: undefined,
    avatarUrl: author.avatarUrls['48x48'],
  });
};
export const mapAttachment = (
  attachment: ClickupOriginalAttachment,
): ClickupAttachment => {
  return Object.assign({}, attachment, {
    self: undefined,
    author: undefined,
  });
};
export const mapComments = (comment: ClickupOriginalComment): ClickupComment => {
  return Object.assign({}, comment, {
    self: undefined,
    updateAuthor: undefined,
    author: mapAuthor(comment.author),
  });
};

export const mapClickupAttachmentToAttachment = (
  clickupAttachment: ClickupAttachment,
): TaskAttachment => {
  const type = mapAttachmentType(clickupAttachment.mimeType);
  return {
    id: null,
    title: clickupAttachment.filename,
    path: clickupAttachment.thumbnail || clickupAttachment.content,
    originalImgPath: clickupAttachment.content,
    type,
    icon: DropPasteIcons[type],
  };
};

export const mapChangelog = (
  changelog: ClickupOriginalChangelog,
): ClickupChangelogEntry[] => {
  const newChangelog: ClickupChangelogEntry[] = [];
  if (!changelog) {
    return [];
  }

  changelog.histories.forEach((entry) => {
    entry.items.forEach((item) => {
      newChangelog.push({
        author: mapAuthor(entry.author, true),
        created: entry.created,
        field: item.field,
        from: item.fromString,
        to: item.toString,
      });
    });
  });
  return newChangelog;
};

export const mapTransitionResponse = (res: any): unknown => res.response.transitions;

const mapAttachmentType = (mimeType: string): DropPasteInputType => {
  switch (mimeType) {
    case 'image/gif':
    case 'image/jpeg':
    case 'image/png':
      return 'IMG';

    default:
      return 'LINK';
  }
};
