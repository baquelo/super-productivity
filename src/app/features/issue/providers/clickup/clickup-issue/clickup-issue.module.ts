import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiModule } from '../../../../../ui/ui.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { EffectsModule } from '@ngrx/effects';
import { ClickupIssueEffects } from './clickup-issue.effects';
import { ClickupIssueHeaderComponent } from './clickup-issue-header/clickup-issue-header.component';
import { ClickupIssueContentComponent } from './clickup-issue-content/clickup-issue-content.component';

@NgModule({
  imports: [
    CommonModule,
    UiModule,
    FormsModule,
    ReactiveFormsModule,
    EffectsModule.forFeature([ClickupIssueEffects]),
  ],
  declarations: [ClickupIssueHeaderComponent, ClickupIssueContentComponent],
  exports: [ClickupIssueHeaderComponent, ClickupIssueContentComponent],
})
export class ClickupIssueModule {}
