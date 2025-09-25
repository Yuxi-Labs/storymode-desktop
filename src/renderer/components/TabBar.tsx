import React, { useMemo } from "react";
import { useStore, selectFile, selectParse, type RootState } from "../store/store.js";

export const TabBar: React.FC = () => {
  const file = useStore(selectFile);
  const parse = useStore(selectParse);
  const closeFile = useStore((s: RootState) => s.closeFile);

  const hasStory = Boolean(file.path || file.content.length);
  if (!hasStory) return null;

  const caption = useMemo(() => {
    if (!file.path) return "Unsaved";
    const sections = file.path.split(/[/\\]/);
    if (sections.length <= 1) return "";
    return sections.slice(0, -1).join(" /");
  }, [file.path]);

  const title = file.path
    ? file.path.split(/[/\\]/).pop() ?? "Story"
    : parse.fileKind === "narrative"
      ? "Untitled narrative"
      : "Untitled story";

  const handleClose = () => closeFile();

  return (
    <div className="tab-bar" role="tablist" aria-label="Open story">
      <div className="tab active" role="tab" aria-selected tabIndex={0}>
        <div className="tab-meta">
          <span className="tab-title">{title}</span>
          {file.isDirty && <span className="dirty-dot" aria-label="Unsaved changes" />}
        </div>
        {caption && <span className="tab-caption">{caption}</span>}
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
