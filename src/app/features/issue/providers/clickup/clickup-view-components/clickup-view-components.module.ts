import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClickupCfgStepperComponent } from './clickup-cfg-stepper/clickup-cfg-stepper.component';
import { UiModule } from '../../../../../ui/ui.module';
import { DialogClickupInitialSetupComponent } from './dialog-clickup-initial-setup/dialog-clickup-initial-setup.component';
import { ClickupCfgComponent } from './clickup-cfg/clickup-cfg.component';
import { FormsModule } from '@angular/forms';
import { DialogClickupTransitionComponent } from './dialog-clickup-transition/dialog-clickup-transition.component';
import { DialogClickupAddWorklogComponent } from './dialog-clickup-add-worklog/dialog-clickup-add-worklog.component';

@NgModule({
  imports: [CommonModule, UiModule, FormsModule],
  declarations: [
    DialogClickupTransitionComponent,
    DialogClickupInitialSetupComponent,
    DialogClickupAddWorklogComponent,
    ClickupCfgStepperComponent,
    ClickupCfgComponent,
  ],
  exports: [ClickupCfgStepperComponent],
})
export class ClickupViewComponentsModule {}
