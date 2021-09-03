import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
} from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ClickupCfg } from '../../clickup.model';
import {
  DEFAULT_CLICKUP_CFG,
  CLICKUP_ADVANCED_FORM_CFG,
  CLICKUP_CREDENTIALS_FORM_CFG,
} from '../../clickup.const';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { ClickupApiService } from '../../clickup-api.service';
import { ClickupOriginalUser } from '../../clickup-api-responses';
import { expandAnimation } from '../../../../../../ui/animations/expand.ani';
import { catchError } from 'rxjs/operators';
import { Subscription, throwError } from 'rxjs';
import { T } from '../../../../../../t.const';
import { HANDLED_ERROR_PROP_STR, HelperClasses } from '../../../../../../app.constants';

@Component({
  selector: 'clickup-cfg-stepper',
  templateUrl: './clickup-cfg-stepper.component.html',
  styleUrls: ['./clickup-cfg-stepper.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation],
})
export class ClickupCfgStepperComponent implements OnDestroy {
  T: typeof T = T;
  HelperClasses: typeof HelperClasses = HelperClasses;
  credentialsFormGroup: FormGroup = new FormGroup({});
  credentialsFormConfig: FormlyFieldConfig[] = [];

  advancedSettingsFormGroup: FormGroup = new FormGroup({});
  advancedSettingsFormConfig: FormlyFieldConfig[] = [];

  isTestCredentialsSuccess: boolean = false;
  user?: ClickupOriginalUser;
  clickupCfg: ClickupCfg = Object.assign({}, DEFAULT_CLICKUP_CFG, { isEnabled: true });
  @Output() saveCfg: EventEmitter<ClickupCfg> = new EventEmitter();

  private _subs: Subscription = new Subscription();

  constructor(
    private _clickupApiService: ClickupApiService,
    private _changeDetectorRef: ChangeDetectorRef,
  ) {
    this.credentialsFormConfig = CLICKUP_CREDENTIALS_FORM_CFG;
    this.advancedSettingsFormConfig = CLICKUP_ADVANCED_FORM_CFG;
  }

  @Input() set cfg(cfg: ClickupCfg) {
    if (cfg) {
      this.clickupCfg = { ...cfg };
    }
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  saveConfig(): void {
    this.saveCfg.emit(this.clickupCfg);
  }

  saveStepForm(cfg: ClickupCfg): void {
    this.clickupCfg = cfg;
  }

  testCredentials(): void {
    this.isTestCredentialsSuccess = false;
    this._subs.add(
      this._clickupApiService
        .getCurrentUser$(this.clickupCfg, true)
        .pipe(
          catchError((err) => {
            this.isTestCredentialsSuccess = false;
            this.user = undefined;
            this._changeDetectorRef.detectChanges();
            return throwError({ [HANDLED_ERROR_PROP_STR]: err });
          }),
        )
        .subscribe((user: ClickupOriginalUser) => {
          this.user = user;
          console.log('MRM user', user);
          this.isTestCredentialsSuccess = true;

          this._changeDetectorRef.detectChanges();
        }),
    );
  }
}
