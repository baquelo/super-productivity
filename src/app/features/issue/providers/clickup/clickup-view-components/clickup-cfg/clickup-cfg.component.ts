import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import {
  ConfigFormSection,
  GlobalConfigSectionKey,
} from '../../../../../config/global-config.model';
import { ProjectCfgFormKey } from '../../../../../project/project.model';
import { FormlyFieldConfig, FormlyFormOptions } from '@ngx-formly/core';
import { FormControl, FormGroup } from '@angular/forms';
import {
  ClickupCfg,
  ClickupTransitionConfig,
  ClickupTransitionOption,
} from '../../clickup.model';
import { expandAnimation } from '../../../../../../ui/animations/expand.ani';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { SearchResultItem } from '../../../../issue.model';
import {
  catchError,
  concatMap,
  debounceTime,
  first,
  map,
  switchMap,
  tap,
} from 'rxjs/operators';
import { ClickupApiService } from '../../clickup-api.service';
import { DEFAULT_CLICKUP_CFG } from '../../clickup.const';
import { ClickupIssue } from '../../clickup-issue/clickup-issue.model';
import { SnackService } from '../../../../../../core/snack/snack.service';
import { T } from '../../../../../../t.const';
import { HelperClasses } from '../../../../../../app.constants';
import { ProjectService } from '../../../../../project/project.service';
import { WorkContextService } from '../../../../../work-context/work-context.service';
import { WorkContextType } from '../../../../../work-context/work-context.model';
import { CLICKUP_TYPE } from '../../../../issue.const';

@Component({
  selector: 'clickup-cfg',
  templateUrl: './clickup-cfg.component.html',
  styleUrls: ['./clickup-cfg.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation],
})
export class ClickupCfgComponent implements OnInit, OnDestroy {
  @Input() section?: ConfigFormSection<ClickupCfg>;
  @Output() save: EventEmitter<{
    sectionKey: GlobalConfigSectionKey | ProjectCfgFormKey;
    config: any;
  }> = new EventEmitter();
  T: typeof T = T;
  HelperClasses: typeof HelperClasses = HelperClasses;
  issueSuggestionsCtrl: FormControl = new FormControl();
  customFieldSuggestionsCtrl: FormControl = new FormControl();
  customFields: any[] = [];
  customFieldsPromise?: Promise<any>;
  isLoading$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  fields?: FormlyFieldConfig[];
  form: FormGroup = new FormGroup({});
  options: FormlyFormOptions = {};
  filteredIssueSuggestions$: Observable<SearchResultItem[]> =
    this.issueSuggestionsCtrl.valueChanges.pipe(
      debounceTime(300),
      tap(() => this.isLoading$.next(true)),
      switchMap((searchTerm: string) => {
        return searchTerm && searchTerm.length > 1
          ? this._projectService
              .getClickupCfgForProject$(
                this._workContextService.activeWorkContextId as string,
              )
              .pipe(
                first(),
                switchMap((cfg) => this._clickupApiService.issuePicker$(searchTerm, cfg)),
                catchError(() => {
                  return [];
                }),
              )
          : // Note: the outer array signifies the observable stream the other is the value
            [[]];
        // TODO fix type
      }),
      tap((suggestions) => {
        this.isLoading$.next(false);
      }),
    );
  filteredCustomFieldSuggestions$: Observable<any[]> =
    this.customFieldSuggestionsCtrl.valueChanges.pipe(
      map((value) => this._filterCustomFieldSuggestions(value)),
    );
  transitionConfigOpts: {
    key: keyof ClickupTransitionConfig;
    val: ClickupTransitionOption;
  }[] = [];

  private _subs: Subscription = new Subscription();

  constructor(
    private _clickupApiService: ClickupApiService,
    private _snackService: SnackService,
    private _projectService: ProjectService,
    private _workContextService: WorkContextService,
  ) {}

  private _cfg?: ClickupCfg;

  get cfg(): ClickupCfg {
    return this._cfg as ClickupCfg;
  }

  // NOTE: this is legit because it might be that there is no issue provider cfg yet
  @Input() set cfg(cfg: ClickupCfg) {
    const newCfg: ClickupCfg = cfg ? { ...cfg } : DEFAULT_CLICKUP_CFG;

    if (!newCfg.transitionConfig) {
      newCfg.transitionConfig = DEFAULT_CLICKUP_CFG.transitionConfig;
    } else {
      // CLEANUP keys that we're not using
      Object.keys(newCfg.transitionConfig).forEach((key: string) => {
        if (!(key in DEFAULT_CLICKUP_CFG.transitionConfig)) {
          delete (newCfg.transitionConfig as any)[key];
        }
      });
    }

    if (!Array.isArray(newCfg.availableTransitions)) {
      newCfg.availableTransitions = DEFAULT_CLICKUP_CFG.availableTransitions;
    }

    this._cfg = newCfg;

    this.transitionConfigOpts = Object.keys(newCfg.transitionConfig).map((k: string) => {
      const key = k as keyof ClickupTransitionConfig;
      return {
        key,
        val: newCfg.transitionConfig[key],
      };
    });
  }

  ngOnInit(): void {
    this.fields = (this.section as ConfigFormSection<ClickupCfg>).items;
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  getTransition(key: keyof ClickupTransitionConfig): ClickupTransitionOption {
    return this.cfg.transitionConfig[key];
  }

  setTransition(
    key: keyof ClickupTransitionConfig,
    value: ClickupTransitionOption,
  ): ClickupTransitionOption {
    return (this.cfg.transitionConfig[key] = value);
  }

  toggleEnabled(isEnabled: boolean): void {
    if (this._workContextService.activeWorkContextType !== WorkContextType.PROJECT) {
      throw new Error('Should only be called when in project context');
    }
    const projectId = this._workContextService.activeWorkContextId as string;
    this._projectService.updateIssueProviderConfig(projectId, CLICKUP_TYPE, {
      isEnabled,
    });
  }

  submit(): void {
    if (!this.cfg) {
      throw new Error(
        'No config for ' + (this.section as ConfigFormSection<ClickupCfg>).key,
      );
    } else {
      this.save.emit({
        sectionKey: (this.section as ConfigFormSection<ClickupCfg>).key,
        config: this.cfg,
      });
    }
  }

  trackByCustomFieldId(i: number, field: any): string {
    return field.id;
  }

  displayIssueWith(issue?: ClickupIssue): string | undefined {
    // NOTE: apparently issue can be undefined for displayWith
    return issue?.summary;
  }

  trackByIssueId(i: number, issue: ClickupIssue): string {
    return issue.id;
  }

  loadCustomFields(): void {
    this.customFieldsPromise = this._projectService
      .getClickupCfgForProject$(this._workContextService.activeWorkContextId as string)
      .pipe(
        first(),
        concatMap((clickupCfg) => this._clickupApiService.listFields$(clickupCfg)),
      )
      .toPromise();
    this.customFieldsPromise.then((v: any) => {
      if (v && Array.isArray(v.response)) {
        this.customFields = v.response;
      }
    });
  }

  updateTransitionOptions(): void {
    const searchResultItem = this.issueSuggestionsCtrl.value as SearchResultItem;
    if (!searchResultItem || typeof (searchResultItem as any) === 'string') {
      this.issueSuggestionsCtrl.setValue('');
      return;
    } else {
      const issueId = searchResultItem.issueData.id as string;
      this._subs.add(
        this._clickupApiService
          .getTransitionsForIssue$(issueId, this.cfg)
          .subscribe((val) => {
            this.cfg.availableTransitions = val;
            this._snackService.open({
              type: 'SUCCESS',
              msg: T.F.CLICKUP.S.TRANSITIONS_LOADED,
            });
          }),
      );
    }
  }

  private _filterCustomFieldSuggestions(value: string): string[] {
    const filterValue = value && value.toLowerCase();
    return this.customFields.filter(
      (field) =>
        field &&
        (field.name.toLowerCase().includes(filterValue) ||
          field.id.includes(filterValue)),
    );
  }
}
