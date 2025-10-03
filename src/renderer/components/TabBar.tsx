import React, { useMemo } from "react";
import { t } from '../i18n.js';
import { useStore, selectFile, selectParse, type RootState } from "../store/store.js";

export const TabBar: React.FC = () => {
  const file = useStore(selectFile);
  const parse = useStore(selectParse);
  const closeFile = useStore((s: RootState) => s.closeFile);

  const hasStory = Boolean(file.path || file.content.length);
  if (!hasStory) return null;

  const storyModel = useStore(s => s.storyModel);
  const title = useMemo(() => {
    const active = storyModel.activeEntity;
    if (!active) return t('tab.untitled.story');
    if (active.type === 'story') return storyModel.story?.title || t('tab.untitled.story');
    if (active.type === 'narrative') return storyModel.narratives[active.internalId]?.title || t('tab.untitled.narrative');
    if (active.type === 'scene') {
      const sc = storyModel.scenes[active.internalId];
      return sc?.title || t('tab.untitled.scene');
    }
    return t('tab.untitled.story');
  }, [storyModel]);

  const handleClose = () => closeFile();

  return (
    <div className="tab-bar" role="tablist" aria-label={t('tab.bar.aria')}>
      <div className="tab active" role="tab" aria-selected tabIndex={0}>
        <div className="tab-meta">
          <span className="tab-title">{title}</span>
          {file.isDirty && <span className="dirty-dot" aria-label={t('status.unsaved')} />}
        </div>
  {/* Caption intentionally removed per requirement: no story/narrative chain in scene tab */}
        <div
          className="tab-close"
          role="button"
          tabIndex={0}
          title={t('tab.close.tooltip')}
          onClick={handleClose}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              handleClose();
            }
          }}
          aria-label={t('tab.close.tooltip')}
        >
          ×
        </div>
      </div>
    </div>
  );
};
