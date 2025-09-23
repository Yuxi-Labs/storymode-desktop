import React from "react";
import { useStore } from "../store/store.js";
import type { RootState } from "../store/store.js";

const IconExplorer = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3.5 7a2 2 0 0 1 2-2h3.2l2 2.5H20a1.8 1.8 0 0 1 1.8 1.8V18a1.8 1.8 0 0 1-1.8 1.8H4.8A1.8 1.8 0 0 1 3 18V7z" />
    <path d="M3 10h18" />
  </svg>
);

const IconCollapse = ({ collapsed }: { collapsed: boolean }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {collapsed ? <path d="m10 6 6 6-6 6" /> : <path d="m14 6-6 6 6 6" />}
  </svg>
);

const views: Array<{
  id: RootState["ui"]["sidebarView"];
  label: string;
  icon: React.FC;
}> = [{ id: "world", label: "World", icon: IconExplorer }];

export const ActivityBar: React.FC = () => {
  const sidebarView = useStore((s) => s.ui.sidebarView);
  const sidebarCollapsed = useStore((s) => s.ui.sidebarCollapsed);
  const setSidebarView = useStore((s: RootState) => s.setSidebarView);
  const toggleSidebar = useStore((s: RootState) => s.toggleSidebar);

  return (
    <aside className="activity-bar">
      <div className="activity-brand" aria-label="StoryMode">
        <span className="activity-glyph" aria-hidden="true" />
      </div>
      <div className="activity-group">
        {views.map((view) => {
          const Icon = view.icon;
          const active = view.id === sidebarView && !sidebarCollapsed;
          return (
            <button
              key={view.id}
              type="button"
              className={`activity-button${active ? " active" : ""}`}
              title={view.label}
              onClick={() => {
                setSidebarView(view.id);
                if (sidebarCollapsed) toggleSidebar();
              }}
            >
              <Icon />
            </button>
          );
        })}
      </div>
      <div className="activity-footer">
        <button
          type="button"
          className="activity-button"
          title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          onClick={() => toggleSidebar()}
        >
          <IconCollapse collapsed={sidebarCollapsed} />
        </button>
      </div>
    </aside>
  );
};

