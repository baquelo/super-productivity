import { updateGlobalConfigSection } from './global-config.actions';
import { createFeatureSelector, createReducer, createSelector, on } from '@ngrx/store';
import {
  EvaluationConfig,
  GlobalConfigState,
  IdleConfig,
  MiscConfig,
  SoundConfig,
  SyncConfig,
  TakeABreakConfig,
  TimelineConfig,
} from '../global-config.model';
import { DEFAULT_GLOBAL_CONFIG } from '../default-global-config.const';
import { loadAllData } from '../../../root-store/meta/load-all-data.action';
import { migrateGlobalConfigState } from '../migrate-global-config.util';

export const CONFIG_FEATURE_NAME = 'globalConfig';
export const selectConfigFeatureState =
  createFeatureSelector<GlobalConfigState>(CONFIG_FEATURE_NAME);
export const selectMiscConfig = createSelector(
  selectConfigFeatureState,
  (cfg): MiscConfig => cfg.misc,
);
export const selectSoundConfig = createSelector(
  selectConfigFeatureState,
  (cfg): SoundConfig => cfg.sound,
);
export const selectEvaluationConfig = createSelector(
  selectConfigFeatureState,
  (cfg): EvaluationConfig => cfg.evaluation,
);
export const selectIdleConfig = createSelector(
  selectConfigFeatureState,
  (cfg): IdleConfig => cfg.idle,
);
export const selectSyncConfig = createSelector(
  selectConfigFeatureState,
  (cfg): SyncConfig => cfg.sync,
);
export const selectTakeABreakConfig = createSelector(
  selectConfigFeatureState,
  (cfg): TakeABreakConfig => cfg.takeABreak,
);
export const selectTimelineConfig = createSelector(
  selectConfigFeatureState,
  (cfg): TimelineConfig => cfg.timeline,
);

const initialState: GlobalConfigState = DEFAULT_GLOBAL_CONFIG;

export const globalConfigReducer = createReducer<GlobalConfigState>(
  initialState,

  on(loadAllData, (oldState, { appDataComplete }) =>
    appDataComplete.globalConfig
      ? migrateGlobalConfigState({ ...appDataComplete.globalConfig })
      : oldState,
  ),

  on(updateGlobalConfigSection, (state, { sectionKey, sectionCfg }) => ({
    ...state,
    [sectionKey]: {
      // @ts-ignore
      ...state[sectionKey],
      ...sectionCfg,
    },
  })),
);
