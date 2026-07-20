import { DEFAULT_APP_LOCALE, isAppLocale, type AppLocale } from '../../i18n/types';

type ChatInputContent = {
  headings: string[];
  placeholder: string;
  suggestions: string[];
};

const CHAT_INPUT_CONTENT: Record<AppLocale, ChatInputContent> = {
  en: {
    headings: [
      'What can I help you with?',
      'What should we work on today?',
      'What would you like to make clearer?',
      'Where should we start?',
      'What can we solve together?',
      'What do you want to improve?',
      'What idea should we shape next?',
      'What needs your attention right now?',
      'What can I help you finish?',
      'What question is on your mind?',
    ],
    placeholder: 'Ask me anything...',
    suggestions: [
      'Rewrite this message to sound clearer',
      'Turn these notes into a short plan',
      'Translate this text and keep the tone natural',
      'Summarize the key decisions in this document',
      'Draft a polite reply to a customer',
      'Explain this concept with a simple example',
      'Compare two options and recommend one',
      'Brainstorm names for a new feature',
      'Find risks in this proposal',
      'Create a checklist for this task',
      'Make this paragraph shorter',
      'Help me prepare meeting talking points',
    ],
  },
  vi: {
    headings: [
      'Tôi có thể giúp gì cho bạn?',
      'Hôm nay mình nên bắt đầu từ đâu?',
      'Bạn muốn làm rõ điều gì?',
      'Mình cùng giải quyết việc gì trước?',
      'Bạn muốn cải thiện điều gì?',
      'Ý tưởng nào cần được phát triển tiếp?',
      'Việc nào đang cần bạn chú ý?',
      'Tôi có thể giúp bạn hoàn thành gì?',
      'Bạn đang có câu hỏi nào?',
      'Mình cùng biến ý tưởng nào thành kết quả?',
    ],
    placeholder: 'Hỏi tôi bất cứ điều gì...',
    suggestions: [
      'Viết lại tin nhắn này cho rõ ràng hơn',
      'Biến các ghi chú này thành kế hoạch ngắn',
      'Dịch đoạn này và giữ giọng văn tự nhiên',
      'Tóm tắt các quyết định chính trong tài liệu',
      'Soạn phản hồi lịch sự cho khách hàng',
      'Giải thích khái niệm này bằng ví dụ đơn giản',
      'So sánh hai lựa chọn và đề xuất một hướng',
      'Gợi ý tên cho một tính năng mới',
      'Tìm rủi ro trong đề xuất này',
      'Tạo checklist cho công việc này',
      'Rút gọn đoạn văn này',
      'Giúp tôi chuẩn bị ý chính cho cuộc họp',
    ],
  },
};

const resolveLocale = (locale?: string): AppLocale => {
  const normalizedLocale = locale?.split('-')[0];
  return isAppLocale(normalizedLocale) ? normalizedLocale : DEFAULT_APP_LOCALE;
};

const getRandomItem = (items: string[]): string => {
  return items[Math.floor(Math.random() * items.length)];
};

const shuffleItems = (items: string[]): string[] => {
  const shuffledItems = [...items];

  for (let i = shuffledItems.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledItems[i], shuffledItems[j]] = [shuffledItems[j], shuffledItems[i]];
  }

  return shuffledItems;
};

export const getChatInputContent = (locale?: string): ChatInputContent => {
  return CHAT_INPUT_CONTENT[resolveLocale(locale)];
};

export const getRandomChatHeading = (locale?: string, currentHeading?: string): string => {
  const { headings } = getChatInputContent(locale);
  const nextHeadings = headings.filter((heading) => heading !== currentHeading);
  return getRandomItem(nextHeadings.length > 0 ? nextHeadings : headings);
};

export const getRandomChatSuggestions = (
  locale?: string,
  count = 4,
  currentSuggestions: string[] = []
): string[] => {
  const { suggestions } = getChatInputContent(locale);
  const freshSuggestions = suggestions.filter(
    (suggestion) => !currentSuggestions.includes(suggestion)
  );
  const sourceSuggestions = freshSuggestions.length >= count ? freshSuggestions : suggestions;
  return shuffleItems(sourceSuggestions).slice(0, count);
};
