import React, { useState } from "react";
import { useStore, selectFile } from "../store/store.js";

// Hierarchical model rendering

const interact = (
  event: React.MouseEvent | React.KeyboardEvent,
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

export const FileList: React.FC = () => {
  const file = useStore(selectFile);
  const storyModel = useStore((s) => s.storyModel);
  const addNarrative = useStore((s) => s.addNarrative);
  const addScene = useStore((s) => s.addScene);
  const setActiveScene = useStore((s) => s.setActiveScene);
  const setActiveStory = useStore((s) => s.setActiveStory);
  const setActiveNarrative = useStore((s) => s.setActiveNarrative);

  const hasStory = Boolean(storyModel.story);
  if (!hasStory) return null;

  const story = storyModel.story!;
  const storyFileName = `${story.title || 'Untitled'}.story`;

  const handleAddNarrative = () => {
    const id = addNarrative();
    if (id) {
      // Auto add first scene for new narrative
      const sceneId = addScene(id);
      if (sceneId) setActiveScene(sceneId);
    }
  };

  const handleAddScene = (narrativeId: string) => {
    const sceneId = addScene(narrativeId);
    if (sceneId) setActiveScene(sceneId);
  };

  const activeEntity = storyModel.activeEntity;
  const handleStorySelect = (e: React.MouseEvent | React.KeyboardEvent) => interact(e, () => setActiveStory());
  const handleNarrativeSelect = (nid: string) => (e: React.MouseEvent | React.KeyboardEvent) => interact(e, () => setActiveNarrative(nid));
  // Narrative deletion deliberately disabled until proper UX is provided.

  // Expand / collapse state
  const [storyExpanded, setStoryExpanded] = useState(true);
  const [narrativeExpanded, setNarrativeExpanded] = useState<Record<string, boolean>>({});

  const toggleNarrative = (id: string) => {
    setNarrativeExpanded({ ...narrativeExpanded, [id]: narrativeExpanded[id] === false });
  };

  const storyChevron = storyExpanded ? '▼' : '▶';

  return (
    <div className="world-panel" role="region" aria-label="Story Structure">
      <header className="world-header">
        <div
          className={`world-file${activeEntity?.type === 'story' ? ' active' : ''}`}
          data-tip="Story Root"
          role="button"
          tabIndex={0}
          onClick={handleStorySelect}
          onKeyDown={handleStorySelect}
        >
          <span className="world-key">STORY</span>
          <span className="world-value">{storyFileName}</span>
        </div>
        <div className="world-actions" aria-label="Structure actions">
          <span
            className="world-action"
            data-tip="New Narrative"
            role="button"
            tabIndex={0}
            onClick={(e) => interact(e, handleAddNarrative)}
            onKeyDown={(e) => interact(e, handleAddNarrative)}
          >＋N</span>
        </div>
      </header>
      <div className="world-tree" role="tree" aria-label="Story Files">
        <ul className="world-level story-root" role="group" aria-label="Story File">
          <li className={`world-node story-file${activeEntity?.type === 'story' ? ' active' : ''}`}
              role="treeitem" aria-expanded={storyExpanded} aria-level={1} tabIndex={0}
              onClick={(e) => { interact(e, () => setActiveStory()); setStoryExpanded(!storyExpanded); }}
              onKeyDown={(e) => interact(e, () => { setActiveStory(); setStoryExpanded(!storyExpanded); })}>
            <div className="world-node-row">
              <span className="chevron" aria-hidden>{storyChevron}</span>
              <span className="world-node-label">{storyFileName}</span>
            </div>
          </li>
        </ul>
        {storyExpanded && (
          <ul className="world-level narratives" role="group" aria-label="Narratives">
          {story.narrativeIds.map((nid) => {
          const narrative = storyModel.narratives[nid];
          if (!narrative) return null;
          const isActive = activeEntity?.type === 'narrative' && activeEntity.id === nid;
          const expanded = narrativeExpanded[nid] !== false; // default expanded
          const chevron = expanded ? '▼' : '▶';
          return (
            <li key={nid} className={`world-node narrative${isActive ? ' active' : ''}`} role="treeitem" aria-level={2}
                aria-expanded={expanded} tabIndex={0}
                aria-label={`${narrative.title}.narrative`} data-tip={narrative.title}
                onClick={(e) => interact(e, () => { setActiveNarrative(nid); toggleNarrative(nid); })}
                onKeyDown={(e) => interact(e, () => { setActiveNarrative(nid); toggleNarrative(nid); })}>
              <div className="world-node-row">
                <span className="chevron" aria-hidden>{chevron}</span>
                <span className="world-node-label">{narrative.title}.narrative</span>
                <span className="world-action minor" data-tip="New Scene" role="button" tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); interact(e, () => handleAddScene(nid)); }}
                      onKeyDown={(e) => { e.stopPropagation(); interact(e, () => handleAddScene(nid)); }}>＋S</span>
              </div>
              {expanded && narrative.sceneIds.length > 0 && (
                <ul className="world-children scenes" role="group" aria-label={`Scenes of ${narrative.title}`}> 
                  {narrative.sceneIds.map((sid) => {
                    const scene = storyModel.scenes[sid];
                    if (!scene) return null;
                    const active = activeEntity?.type === 'scene' && activeEntity.id === sid;
                    return (
                      <li key={sid} className={`world-node scene${active ? ' active' : ''}`} role="treeitem" aria-level={3} tabIndex={0}
                          aria-label={scene.title} data-tip={scene.title}
                          onClick={(e) => interact(e, () => setActiveScene(sid))}
                          onKeyDown={(e) => interact(e, () => setActiveScene(sid))}>
                        <div className="world-node-row">
                          <span className="world-node-label">{scene.title}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
          })}
          </ul>
        )}
      </div>
    </div>
  );
};
