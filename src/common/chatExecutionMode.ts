export type ChatExecutionMode = 'cheap' | 'normal' | 'expensive';

export const DEFAULT_CHAT_EXECUTION_MODE: ChatExecutionMode = 'normal';

export const CHAT_EXECUTION_MODE_VALUES = ['cheap', 'normal', 'expensive'] as const;

export const CHAT_EXECUTION_MODE_OPTIONS: Array<{
  value: ChatExecutionMode;
  label: string;
}> = [
  { value: 'cheap', label: 'low' },
  { value: 'normal', label: 'medium' },
  { value: 'expensive', label: 'high' },
];

export const LEGACY_CHAT_EXECUTION_MODE_ALIASES: Record<string, ChatExecutionMode> = {
  fast: 'cheap',
  premium: 'expensive',
  smart: 'expensive',
};
