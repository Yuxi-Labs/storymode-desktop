import React from "react";
import { useStore, selectFile, type RootState } from "../store/store.js";

export const TabBar: React.FC = () => {
  const file = useStore(selectFile);
  const closeFile = useStore((s: RootState) => s.closeFile);
  const name = file.path ? file.path.split(/[/\\]/).pop() : "Untitled";
  const dir = file.path ? file.path.replace(/[/\\][^/\\]+$/, "") : "";

  return (
    <div className="tab-bar" role="tablist">
      <div className="tab active" role="tab" aria-selected>
        <div className="tab-meta">
          <span className="tab-title">{name}</span>
          {file.isDirty && <span className="dirty-dot" aria-label="Unsaved changes" />}
        </div>
        {dir && <span className="tab-caption">{dir}</span>}
        <button
          type="button"
          className="tab-close"
          title="Close file"
          onClick={() => closeFile()}
        >
          &times;
        </button>
      </div>
    </div>
  );
};
