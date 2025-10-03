import React, { type ReactNode, createContext, useContext, useState, useEffect, useMemo } from 'react';

type Locale = 'en' | 'zh-CN';

type Dict = Record<string, string>;

const en: Dict = {
  'app.name': 'StoryMode',
  'app.tagline.line1': 'Environment for writing stories',
  'app.tagline.line2': 'for video games',
  'action.close': 'Close',
  'about.close.aria': 'Close About',
  'about.version.application': 'Application',
  'about.version.core': 'Core',
  'about.version.compiler': 'Compiler',
  'about.version.info': 'Version information',
  'explorer.initializing': 'Initializing story…',
  'explorer.region.aria': 'Story Explorer',
  'explorer.expand': 'Expand',
  'explorer.collapse': 'Collapse',
  'tab.untitled.story': 'Untitled Story',
  'tab.untitled.narrative': 'Untitled Narrative',
  'tab.untitled.scene': 'Untitled Scene',
  'tab.close.tooltip': 'Close story',
  'meta.empty.title': 'Start writing',
  'meta.empty.body': 'Open a story to view metadata.',
  'meta.section.doc': 'Document metadata',
  'meta.section.world': 'World outline',
  'meta.noneFound': 'No @ directives found near the top of this document.',
  'count.stories': 'Stories',
  'count.narratives': 'Narratives',
  'count.scenes': 'Scenes',
  'status.unsaved': 'Unsaved changes',
  'activity.newStory': 'New Story',
  'activity.openStory': 'Open Story',
  'activity.settings': 'Settings',
  'activity.documentation': 'Documentation',
  'welcome.subtitle': 'Select an action to begin.',
  'modal.rename.title': 'Rename',
  'modal.rename.label': 'New name',
  'modal.rename.cancel': 'Cancel',
  'modal.rename.apply': 'Rename',
  'modal.delete.title.scene': 'Delete scene',
  'modal.delete.prompt.scene': 'Are you sure you want to delete {title}? This cannot be undone.',
  'modal.delete.cancel': 'Cancel',
  'modal.delete.confirm': 'Delete',
  'status.fileType': 'File type',
  'status.encoding': 'Encoding',
  'status.lineColumn': 'Ln {line}, Col {col}',
  'status.diagnostics.tooltip': '{errors} error(s), {warnings} warning(s)',
  'status.diagnostics.aria': 'Diagnostics: {errors} error(s), {warnings} warning(s)',
  'status.notifications': 'Notifications',
  'status.notifications.count': '{count} notification(s)',
  'sidebar.title': 'STORY',
  'entity.story': 'Story',
  'entity.narrative': 'Narrative',
  'entity.scene': 'Scene',
  'ui.language': 'Language',
  'about.mascot.alt': 'StoryMode Mascot',
  'tab.bar.aria': 'Open story tabs',
  'explorer.storyFallback': 'Story',
  'settings.categories.general': 'General',
  'settings.categories.appearance': 'Appearance',
  'settings.categories.language': 'Language',
  'settings.categories.privacy': 'Privacy & Telemetry',
  'settings.telemetry.enable': 'Enable local telemetry logging',
  'settings.telemetry.desc': 'Telemetry helps improve StoryMode by recording anonymous usage events (stored only on your computer). No story content or personal data is collected.',
  'settings.telemetry.share': 'Share anonymous telemetry (future opt-in)',
  'settings.telemetry.share.desc': 'When enabled (and implemented) anonymous event aggregates may be sent to improve StoryMode. Disabled by default.',
  'settings.theme.mode': 'Theme Mode',
  'settings.theme.auto': 'Auto',
  'settings.theme.light': 'Light',
  'settings.theme.dark': 'Dark',
  'settings.language.select': 'Interface Language',
  'settings.close': 'Close',
  'menu.file': 'File',
  'menu.edit': 'Edit',
  'menu.view': 'View',
  'menu.tools': 'Tools',
  'menu.help': 'Help',
  'menu.file.newStory': 'New Story',
  'menu.file.openStory': 'Open Story…',
  'menu.file.openRecent': 'Open Recent',
  'menu.file.noRecent': 'No recent stories',
  'menu.file.saveStory': 'Save Story',
  'menu.file.saveStoryAs': 'Save Story As…',
  'menu.file.previewStory': 'Preview Story',
  'menu.file.printScript': 'Print Script…',
  'menu.file.settings': 'Settings…',
  'menu.file.closeStory': 'Close Story',
  'menu.edit.selectLine': 'Select Line',
  'menu.view.togglePreview': 'Preview Story',
  'menu.view.toggleInspector': 'Toggle Inspector',
  'menu.view.toggleStatusBar': 'Toggle Status Bar',
  'menu.view.toggleSidebar': 'Toggle Sidebar',
  'menu.tools.checkUpdates': 'Check for Updates',
  'menu.help.about': 'About',
};

const zhCN: Dict = {
  'app.name': 'StoryMode',
  'app.tagline.line1': '故事写作环境',
  'app.tagline.line2': '面向电子游戏',
  'action.close': '关闭',
  'about.close.aria': '关闭关于窗口',
  'about.version.application': '应用',
  'about.version.core': '核心',
  'about.version.compiler': '编译器',
  'about.version.info': '版本信息',
  'explorer.initializing': '正在初始化故事…',
  'explorer.region.aria': '故事资源管理器',
  'explorer.expand': '展开',
  'explorer.collapse': '折叠',
  'tab.untitled.story': '未命名故事',
  'tab.untitled.narrative': '未命名叙事',
  'tab.untitled.scene': '未命名场景',
  'tab.close.tooltip': '关闭故事',
  'meta.empty.title': '开始写作',
  'meta.empty.body': '打开一个故事以查看元数据。',
  'meta.section.doc': '文档元数据',
  'meta.section.world': '世界概览',
  'meta.noneFound': '在文档顶部附近没有找到 @ 指令。',
  'count.stories': '故事',
  'count.narratives': '叙事',
  'count.scenes': '场景',
  'status.unsaved': '未保存的更改',
  'activity.newStory': '新建故事',
  'activity.openStory': '打开故事',
  'activity.settings': '设置',
  'activity.documentation': '文档',
  'welcome.subtitle': '选择一个操作开始。',
  'modal.rename.title': '重命名',
  'modal.rename.label': '新名称',
  'modal.rename.cancel': '取消',
  'modal.rename.apply': '重命名',
  'modal.delete.title.scene': '删除场景',
  'modal.delete.prompt.scene': '确定要删除 {title} 吗？该操作无法撤销。',
  'modal.delete.cancel': '取消',
  'modal.delete.confirm': '删除',
  'status.fileType': '文件类型',
  'status.encoding': '编码',
  'status.lineColumn': '第 {line} 行, 第 {col} 列',
  'status.diagnostics.tooltip': '{errors} 个错误, {warnings} 个警告',
  'status.diagnostics.aria': '诊断: {errors} 个错误, {warnings} 个警告',
  'status.notifications': '通知',
  'status.notifications.count': '{count} 条通知',
  'sidebar.title': '故事',
  'entity.story': '故事',
  'entity.narrative': '叙事',
  'entity.scene': '场景',
  'ui.language': '语言',
  'about.mascot.alt': 'StoryMode 吉祥物',
  'tab.bar.aria': '打开的故事标签',
  'explorer.storyFallback': '故事',
  'settings.categories.general': '通用',
  'settings.categories.appearance': '外观',
  'settings.categories.language': '语言',
  'settings.categories.privacy': '隐私与遥测',
  'settings.telemetry.enable': '启用本地遥测日志',
  'settings.telemetry.desc': '遥测通过记录匿名使用事件帮助改进 StoryMode（仅保存在你的电脑上）。不会收集故事内容或个人数据。',
  'settings.telemetry.share': '共享匿名遥测（未来可选）',
  'settings.telemetry.share.desc': '启用后（功能实现时）匿名事件统计可被发送用于改进 StoryMode。默认关闭。',
  'settings.theme.mode': '主题模式',
  'settings.theme.auto': '自动',
  'settings.theme.light': '浅色',
  'settings.theme.dark': '深色',
  'settings.language.select': '界面语言',
  'settings.close': '关闭',
  'menu.file': '文件',
  'menu.edit': '编辑',
  'menu.view': '视图',
  'menu.tools': '工具',
  'menu.help': '帮助',
  'menu.file.newStory': '新建故事',
  'menu.file.openStory': '打开故事…',
  'menu.file.openRecent': '打开最近',
  'menu.file.noRecent': '最近没有故事',
  'menu.file.saveStory': '保存故事',
  'menu.file.saveStoryAs': '另存故事为…',
  'menu.file.previewStory': '预览故事',
  'menu.file.printScript': '打印脚本…',
  'menu.file.settings': '设置…',
  'menu.file.closeStory': '关闭故事',
  'menu.edit.selectLine': '选择行',
  'menu.view.togglePreview': '预览故事',
  'menu.view.toggleInspector': '切换检查器',
  'menu.view.toggleStatusBar': '切换状态栏',
  'menu.view.toggleSidebar': '切换侧边栏',
  'menu.tools.checkUpdates': '检查更新',
  'menu.help.about': '关于',
};

const dictionaries: Record<Locale, Dict> = { en, 'zh-CN': zhCN };

interface I18nContextValue {
  locale: Locale;
  setLocale: (loc: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);
let _lastCtx: I18nContextValue | null = null; // cache for non-hook t()

export const I18nProvider: React.FC<{ children: ReactNode; initialLocale?: Locale }> = ({ children, initialLocale }) => {
  // Load persisted locale if available; otherwise auto-detect (zh -> zh-CN) or use provided initialLocale.
  let stored: Locale | null = null;
  try { const v = localStorage.getItem('storymode.locale'); if (v === 'en' || v === 'zh-CN') stored = v; } catch { /* ignore */ }
  const detected: Locale = (navigator.language && navigator.language.toLowerCase().startsWith('zh')) ? 'zh-CN' : 'en';
  const [locale, setLocaleRaw] = useState<Locale>(initialLocale || stored || detected);
  const setLocale = (loc: Locale) => {
    setLocaleRaw(loc);
    try { localStorage.setItem('storymode.locale', loc); } catch { /* ignore */ }
  };
  const value = useMemo<I18nContextValue>(() => ({
    locale,
    setLocale,
    t: (key: string) => {
      const dict = dictionaries[locale] || en;
      return dict[key] || en[key] || key;
    }
  }), [locale]);
  // Notify main process of locale change so menus can be rebuilt
  useEffect(() => {
    try { (window as any).storymode?.setLocale?.(locale); } catch { /* ignore */ }
  }, [locale]);
  _lastCtx = value;
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

export function t(key: string) {
  // Non-hook safe access: prefer context cache; fallback to default en
  const ctx = _lastCtx;
  if (!ctx) {
    const dict = dictionaries.en || {} as any; // fallback
    return (dict as any)[key] || key;
  }
  return ctx.t(key);
}
