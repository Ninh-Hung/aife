export interface ParsedAgentResponse {
  content: string;
  reasoning: string | null;
}

const REASONING_TAGS = ['think', 'thinking', 'reasoning', 'thought', 'analysis'];
const REASONING_KEYS = [
  'reasoning_content',
  'reasoningContent',
  'thinking',
  'reasoning',
  'thought',
  'thoughts',
  'analysis',
];
const CONTENT_KEYS = [
  'answer',
  'finalAnswer',
  'final_answer',
  'response',
  'content',
  'text',
  'message',
];

const normalize = (value: string) => value.replace(/\n{3,}/g, '\n\n').trim();
const TOOL_CODE_BLOCK_PATTERN = /<tool_code>\s*([\s\S]*?)\s*<\/tool_code>/gi;
const TOOL_CODE_LABEL_PATTERN = /^\s*tool_code\s*:?\s*$/gim;
const TOOL_CALL_PATTERN = /^\s*(?:print\()?\s*(?:default_api\.)?[A-Za-z_][A-Za-z0-9_]*\([\s\S]*\)\s*\)?\s*$/;

const stringifyValue = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  return JSON.stringify(value, null, 2);
};

const parseJsonResponse = (rawContent: string): ParsedAgentResponse | null => {
  const trimmed = extractJsonText(rawContent);
  if (!trimmed) return null;

  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    const gatewayChoice = getGatewayChoiceMessage(parsed);

    if (gatewayChoice) {
      return gatewayChoice;
    }

    const reasoningKey = REASONING_KEYS.find((key) => typeof parsed[key] === 'string');
    const contentKey = CONTENT_KEYS.find((key) => parsed[key] !== undefined);

    if (!contentKey) return null;

    return {
      reasoning: reasoningKey ? normalize(stringifyValue(parsed[reasoningKey])) : null,
      content: normalize(stringifyValue(parsed[contentKey])),
    };
  } catch {
    return null;
  }
};

const extractJsonText = (rawContent: string): string | null => {
  const trimmed = rawContent.trim();
  const fencedJson = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedJson?.[1]) {
    return fencedJson[1].trim();
  }

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed;
  }

  return null;
};

const getGatewayChoiceMessage = (parsed: Record<string, unknown>): ParsedAgentResponse | null => {
  const result = isRecord(parsed.result) ? parsed.result : parsed;
  const choices = Array.isArray(result.choices) ? result.choices : null;
  const firstChoice = choices?.[0];

  if (!isRecord(firstChoice) || !isRecord(firstChoice.message)) return null;

  const message = firstChoice.message;
  const reasoningKey = REASONING_KEYS.find((key) => typeof message[key] === 'string');
  const contentKey = CONTENT_KEYS.find((key) => message[key] !== undefined);

  if (!contentKey) return null;

  return {
    reasoning: reasoningKey ? normalize(stringifyValue(message[reasoningKey])) : null,
    content: normalize(stringifyValue(message[contentKey])),
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseTaggedResponse = (rawContent: string): ParsedAgentResponse | null => {
  let content = rawContent;
  const reasoningParts: string[] = [];

  for (const tag of REASONING_TAGS) {
    const tagPattern = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)(?:<\\/${tag}>|$)`, 'gi');

    content = content.replace(tagPattern, (_match, reasoning: string) => {
      const normalizedReasoning = normalize(reasoning);
      if (normalizedReasoning) {
        reasoningParts.push(normalizedReasoning);
      }
      return '';
    });
  }

  if (reasoningParts.length === 0) return null;

  return {
    reasoning: normalize(reasoningParts.join('\n\n')),
    content: normalize(content),
  };
};

const parseToolCodeResponse = (rawContent: string): ParsedAgentResponse | null => {
  const trimmed = rawContent.trim();
  const withoutLabels = trimmed.replace(TOOL_CODE_LABEL_PATTERN, '').trim();
  const hasToolCodeBlock = /<tool_code>/i.test(trimmed);

  if (hasToolCodeBlock) {
    const content = normalize(
      trimmed.replace(TOOL_CODE_BLOCK_PATTERN, '').replace(TOOL_CODE_LABEL_PATTERN, ''),
    );
    return {
      reasoning: null,
      content,
    };
  }

  if (TOOL_CALL_PATTERN.test(withoutLabels)) {
    return {
      reasoning: null,
      content: '',
    };
  }

  if (withoutLabels !== trimmed) {
    return {
      reasoning: null,
      content: normalize(withoutLabels),
    };
  }

  return null;
};

const parseLabeledResponse = (rawContent: string): ParsedAgentResponse | null => {
  const startPattern =
    /^\s*(?:#{1,6}\s*)?(?:\*\*)?(thinking|thought process|reasoning)(?:\*\*)?\s*:\s*/i;
  const answerPattern =
    /\n\s*(?:#{1,6}\s*)?(?:\*\*)?(answer|final answer|response)(?:\*\*)?\s*:\s*/i;
  const startMatch = rawContent.match(startPattern);

  if (!startMatch) return null;

  const startIndex = startMatch[0].length;
  const afterStart = rawContent.slice(startIndex);
  const answerMatch = afterStart.match(answerPattern);

  if (!answerMatch || answerMatch.index === undefined) return null;

  return {
    reasoning: normalize(afterStart.slice(0, answerMatch.index)),
    content: normalize(afterStart.slice(answerMatch.index + answerMatch[0].length)),
  };
};

export const parseAgentResponse = (rawContent: string): ParsedAgentResponse => {
  const parsed =
    parseJsonResponse(rawContent) ||
    parseTaggedResponse(rawContent) ||
    parseLabeledResponse(rawContent) ||
    parseToolCodeResponse(rawContent);

  if (!parsed) {
    return {
      reasoning: null,
      content: rawContent,
    };
  }

  return {
    reasoning: parsed.reasoning,
    content: parsed.content,
  };
};
