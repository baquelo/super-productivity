import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TagSettingsPageComponent } from './tag-settings-page.component';
import { UiModule } from '../../ui/ui.module';
import { ConfigModule } from '../../features/config/config.module';
import { JiraViewComponentsModule } from '../../features/issue/providers/jira/jira-view-components/jira-view-components.module';
import { ClickupViewComponentsModule } from '../../features/issue/providers/clickup/clickup-view-components/clickup-view-components.module';

@NgModule({
  declarations: [TagSettingsPageComponent],
  imports: [
    CommonModule,
    ConfigModule,
    UiModule,
    JiraViewComponentsModule,
    ClickupViewComponentsModule,
  ],
})
export class TagSettingsPageModule {}
