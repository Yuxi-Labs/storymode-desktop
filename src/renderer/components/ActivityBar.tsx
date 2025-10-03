import React from "react";
import { useStore } from "../store/store.js";
import type { RootState } from "../store/store.js";
import { useI18n } from '../i18n.js';

const IconFiles = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
    <path d="M14 3v6h6" />
  </svg>
);

// Views will be built inside component to avoid invoking hooks at module scope.
interface ViewDef { id: RootState['ui']['sidebarView']; label: string; icon: React.FC; }

const handleActivate = (
  event: React.KeyboardEvent | React.MouseEvent,
  action: () => void,
) => {
  if ("key" in event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      action();
    }
  } else {
    action();
  }
};

export const ActivityBar: React.FC = () => {
  const { t } = useI18n();
  const views: ViewDef[] = [{ id: 'story' as any, label: t('activity.newStory'), icon: IconFiles }];
  const sidebarView = useStore((s) => s.ui.sidebarView);
  const sidebarCollapsed = useStore((s) => s.ui.sidebarCollapsed);
  const setSidebarView = useStore((s: RootState) => s.setSidebarView);
  const toggleSidebar = useStore((s: RootState) => s.toggleSidebar);

  return (
    <aside className="activity-bar" aria-label="Navigation">
      <div className="activity-group" role="tablist" aria-orientation="vertical">
        {views.map((view) => {
          const Icon = view.icon;
          const active = view.id === sidebarView && !sidebarCollapsed;
          const activate = () => {
            setSidebarView(view.id);
            if (sidebarCollapsed) toggleSidebar();
          };
          return (
            <div
              key={view.id}
              className={`activity-pad${active ? " active" : ""}`}
              role="tab"
              aria-selected={active}
              tabIndex={0}
              data-tip={view.label}
              /* Removed title attribute to avoid native tooltip duplication */
              onClick={(event) => handleActivate(event, activate)}
              onKeyDown={(event) => handleActivate(event, activate)}
            >
              <Icon />
            </div>
          );
        })}
      </div>
    </aside>
  );
};
