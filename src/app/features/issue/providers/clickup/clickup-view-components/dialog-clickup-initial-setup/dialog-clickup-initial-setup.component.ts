import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ClickupCfg } from '../../clickup.model';
import { T } from '../../../../../../t.const';

@Component({
  selector: 'dialog-clickup-initial-setup',
  templateUrl: './dialog-clickup-initial-setup.component.html',
  styleUrls: ['./dialog-clickup-initial-setup.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogClickupInitialSetupComponent {
  T: typeof T = T;
  clickupCfg: ClickupCfg;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private _matDialogRef: MatDialogRef<DialogClickupInitialSetupComponent>,
  ) {
    this.clickupCfg = this.data.clickupCfg;
  }

  saveClickupCfg(cfg: ClickupCfg): void {
    this._matDialogRef.close({
      ...cfg,
      isEnabled: !!(cfg && cfg.host && cfg.userName && cfg.password),
    });
  }
}
