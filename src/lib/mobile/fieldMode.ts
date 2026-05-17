import { useNetworkStatus, type NetworkQuality } from './useNetworkStatus';

export type FieldModeConfig = {
  batchUpdates: boolean;
  reduceApiCalls: boolean;
  prioritizeVoice: boolean;
  disableMap: boolean;
  disableAnimations: boolean;
  syncOnlyOnWifi: boolean;
  maxRetries: number;
};

const FIELD_MODE_CONFIGS: Record<NetworkQuality, FieldModeConfig> = {
  offline: {
    batchUpdates: true,
    reduceApiCalls: true,
    prioritizeVoice: true,
    disableMap: true,
    disableAnimations: true,
    syncOnlyOnWifi: false,
    maxRetries: 0,
  },
  poor: {
    batchUpdates: true,
    reduceApiCalls: true,
    prioritizeVoice: true,
    disableMap: true,
    disableAnimations: true,
    syncOnlyOnWifi: false,
    maxRetries: 3,
  },
  fair: {
    batchUpdates: false,
    reduceApiCalls: true,
    prioritizeVoice: true,
    disableMap: false,
    disableAnimations: false,
    syncOnlyOnWifi: false,
    maxRetries: 2,
  },
  good: {
    batchUpdates: false,
    reduceApiCalls: false,
    prioritizeVoice: false,
    disableMap: false,
    disableAnimations: false,
    syncOnlyOnWifi: false,
    maxRetries: 1,
  },
};

export function getFieldModeConfig(quality: NetworkQuality): FieldModeConfig {
  return FIELD_MODE_CONFIGS[quality];
}

export function shouldBatchApiCalls(quality: NetworkQuality): boolean {
  return FIELD_MODE_CONFIGS[quality].batchUpdates;
}

export function shouldReduceApiCalls(quality: NetworkQuality): boolean {
  return FIELD_MODE_CONFIGS[quality].reduceApiCalls;
}

export function useFieldMode(): FieldModeConfig {
  const network = useNetworkStatus();
  return getFieldModeConfig(network.quality);
}
