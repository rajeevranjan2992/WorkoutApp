export type Tab = 'today' | 'workout' | 'history' | 'progress' | 'body' | 'settings';

export const ALL_TABS: Tab[] = ['today', 'workout', 'history', 'progress', 'body', 'settings'];

export const readTab = (): Tab => {
  const h = window.location.hash.replace(/^#\/?/, '');
  return ALL_TABS.includes(h as Tab) ? (h as Tab) : 'today';
};

export const navigate = (tab: Tab) => {
  window.location.hash = `/${tab}`;
};
