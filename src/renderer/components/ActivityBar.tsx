import React from 'react';
import { useStore } from '../store/store.js';

const IconScenes = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 8h10M7 12h6M7 16h4" />
  </svg>
);
const IconExplorer = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
  </svg>
);
const IconSearch = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="6" /><path d="m21 21-4.35-4.35" />
  </svg>
);
const IconOutline = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 4h12M6 9h12M6 14h8M6 19h4" />
  </svg>
);
const IconPreview = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="14" rx="2" /><path d="M8 8h8v6H8z" />
  </svg>
);
const IconCollapse = ({ collapsed }: { collapsed: boolean }) => collapsed ? (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 6 6 6-6 6" />
  </svg>
) : (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m15 6-6 6 6 6" />
  </svg>
);

const views: Array<{ id: any; label: string; icon: React.FC }> = [
  { id: 'scenes', label: 'Scenes', icon: IconScenes },
  { id: 'explorer', label: 'Explorer', icon: IconExplorer },
  { id: 'search', label: 'Search', icon: IconSearch },
  { id: 'outline', label: 'Outline', icon: IconOutline }
];

export const ActivityBar: React.FC = () => {
  const sidebarView = useStore(s => s.ui.sidebarView);
  const sidebarCollapsed = useStore(s => s.ui.sidebarCollapsed);
  const previewVisible = useStore(s => s.ui.previewVisible);
  const setSidebarView = useStore(s => (s as any).setSidebarView);
  const toggleSidebar = useStore(s => (s as any).toggleSidebar);
  const togglePreview = useStore(s => (s as any).togglePreview);

  return (
    <div className="activity-bar">
      <div className="activity-top">
        {views.map(v => {
          const I = v.icon; return (
            <button key={v.id}
              className={"act-btn" + (v.id === sidebarView && !sidebarCollapsed ? ' active' : '')}
              title={v.label}
              onClick={() => { setSidebarView(v.id); if (sidebarCollapsed) toggleSidebar(); }}>
              <I />
            </button>
          );
        })}
      </div>
      <div className="activity-bottom">
        <button className={"act-btn" + (previewVisible ? ' active' : '')} title="Toggle Preview Split" onClick={() => togglePreview()}><IconPreview /></button>
        <button className="act-btn" title="Toggle Sidebar" onClick={() => toggleSidebar()}><IconCollapse collapsed={sidebarCollapsed} /></button>
      </div>
    </div>
  );
};
