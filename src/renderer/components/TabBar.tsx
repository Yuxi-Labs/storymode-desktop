import React, { useMemo } from "react";
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
    if (!active) return 'Untitled Story';
    if (active.type === 'story') return storyModel.story?.title || 'Untitled Story';
    if (active.type === 'narrative') return storyModel.narratives[active.internalId]?.title || 'Untitled Narrative';
    if (active.type === 'scene') {
      const sc = storyModel.scenes[active.internalId];
      return sc?.title || 'Untitled Scene';
    }
    return 'Untitled Story';
  }, [storyModel]);

  const handleClose = () => closeFile();

  return (
    <div className="tab-bar" role="tablist" aria-label="Open story">
      <div className="tab active" role="tab" aria-selected tabIndex={0}>
        <div className="tab-meta">
          <span className="tab-title">{title}</span>
          {file.isDirty && <span className="dirty-dot" aria-label="Unsaved changes" />}
        </div>
  {/* Caption intentionally removed per requirement: no story/narrative chain in scene tab */}
        <div
          className="tab-close"
          role="button"
          tabIndex={0}
          title="Close story"
          onClick={handleClose}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              handleClose();
            }
          }}
          aria-label="Close story"
        >
          ×
        </div>
      </div>
    </div>
  );
};
