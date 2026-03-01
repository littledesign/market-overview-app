export interface FeedConfig {
  name: string;
  url: string;
}

export const NEWS_FEEDS: FeedConfig[] = [
  { name: 'Nielsen Norman Group', url: 'https://www.nngroup.com/feed/rss/' },
  { name: 'Smashing Magazine',   url: 'https://www.smashingmagazine.com/feed/' },
  { name: 'UX Collective',       url: 'https://uxdesign.cc/feed' },
  { name: 'Sidebar.io',          url: 'https://sidebar.io/feed.xml' },
  { name: 'A List Apart',        url: 'https://alistapart.com/main/feed/' },
];

export const AI_KEYWORDS = [
  'ai', 'artificial intelligence', 'machine learning', 'deep learning',
  'gpt', 'llm', 'large language model', 'chatgpt', 'copilot',
  'generative ai', 'neural network', 'nlp', 'natural language',
  'prompt engineering', 'transformer', 'diffusion model', 'openai',
  'anthropic', 'claude', 'gemini', 'midjourney', 'stable diffusion',
];
