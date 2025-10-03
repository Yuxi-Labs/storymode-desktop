import React, { useState, useEffect, useRef } from "react";
import { useStore } from "../store/store.js";
import { t } from '../i18n.js';

interface FlatItem { id: string; type: 'story' | 'narrative' | 'scene'; parent?: string; expandable: boolean; expanded?: boolean; narrativeId?: string; sceneId?: string; }

export const FileList: React.FC = () => {
  // Single useStore to keep hook order stable and avoid React hook mismatch warnings.
  const {
    storyModel,
    setActiveStory,
    setActiveNarrative,
    setActiveScene,
    renameStory,
    renameNarrative,
    renameScene,
    deleteScene,
    addNarrative,
    addScene,
    deleteNarrative,
  } = useStore(s => ({
    storyModel: s.storyModel,
    setActiveStory: s.setActiveStory,
    setActiveNarrative: s.setActiveNarrative,
    setActiveScene: s.setActiveScene,
    renameStory: s.renameStory,
    renameNarrative: s.renameNarrative,
    renameScene: s.renameScene,
    deleteScene: s.deleteScene,
    addNarrative: s.addNarrative,
    addScene: s.addScene,
    deleteNarrative: s.deleteNarrative,
  }));

  const [storyExpanded, setStoryExpanded] = useState(true);
  const [narrativeExpanded, setNarrativeExpanded] = useState<Record<string, boolean>>({});
  const [focusId, setFocusId] = useState('story');
  // Removed custom menu; using Electron native context menu via preload IPC
  const listRef = useRef<HTMLUListElement>(null);
  // telemetry helper
  function fTrack(event: string, props?: Record<string, any>) { try { if (!useStore.getState().ui.telemetryEnabled) return; window.storymode?.telemetryEvent?.(event, props); } catch {} }

  const story = storyModel.story; // may be undefined initially while creating a new story

  // Build flat list safely even if story undefined
  const flat: FlatItem[] = [];
  if (story) {
    flat.push({ id: 'story', type: 'story', expandable: true, expanded: storyExpanded });
    if (storyExpanded) {
      for (const nid of story.narrativeIds) {
        const n = storyModel.narratives[nid]; if (!n) continue;
        const nExpanded = narrativeExpanded[nid] !== false;
        flat.push({ id: `narrative:${nid}`, type: 'narrative', expandable: true, expanded: nExpanded, narrativeId: nid, parent: 'story' });
        if (nExpanded) {
          for (const sid of n.sceneIds) {
            const sc = storyModel.scenes[sid]; if (!sc) continue;
            flat.push({ id: `scene:${sid}`, type: 'scene', expandable: false, sceneId: sid, parent: `narrative:${nid}` });
          }
        }
      }
    }
  }
  const focusIndex = flat.findIndex(f => f.id === focusId);

  const moveFocus = (nextId?: string) => {
    if (!nextId) return; setFocusId(nextId);
    const el = listRef.current?.querySelector<HTMLElement>(`[data-treeid="${nextId}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  };

  const toggleNarrative = (nid: string) => setNarrativeExpanded({ ...narrativeExpanded, [nid]: narrativeExpanded[nid] === false });

  const handleKeyNav = (e: React.KeyboardEvent, item: FlatItem) => {
    const key = e.key;
    if ([ 'ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Home','End','Enter',' ' ].includes(key)) { e.preventDefault(); e.stopPropagation(); }
    switch (key) {
      case 'ArrowDown': moveFocus(flat[focusIndex + 1]?.id); break;
      case 'ArrowUp': moveFocus(flat[focusIndex - 1]?.id); break;
      case 'Home': moveFocus(flat[0]?.id); break;
      case 'End': moveFocus(flat[flat.length -1]?.id); break;
      case 'ArrowRight': {
        if (item.expandable) {
          if (!item.expanded) {
            if (item.type === 'story') setStoryExpanded(true);
            else if (item.type === 'narrative' && item.narrativeId) toggleNarrative(item.narrativeId);
          } else {
            const firstChild = flat.find(f => f.parent === item.id); if (firstChild) moveFocus(firstChild.id);
          }
        }
        break; }
      case 'ArrowLeft': {
        if (item.expandable && item.expanded) {
          if (item.type === 'story') setStoryExpanded(false);
          else if (item.type === 'narrative' && item.narrativeId) toggleNarrative(item.narrativeId);
        } else if (item.parent) moveFocus(item.parent);
        break; }
      case 'Enter':
      case ' ': {
      if (item.type === 'story') setActiveStory();
        else if (item.type === 'narrative' && item.narrativeId) setActiveNarrative(item.narrativeId);
        else if (item.type === 'scene' && item.sceneId) setActiveScene(item.sceneId);
        if (key === ' ' && item.expandable) {
          if (item.type === 'story') setStoryExpanded(!storyExpanded);
          else if (item.type === 'narrative' && item.narrativeId) toggleNarrative(item.narrativeId);
        }
        break; }
    }
  };

  // Context menu
  // Listen for native rename/delete events from main
  useEffect(() => {
    const handleRename = (e: Event) => {
      const detail: any = (e as CustomEvent).detail;
      if (!detail) return;
      if (detail.type === 'story') renameStory(detail.name);
      else if (detail.type === 'narrative') renameNarrative(detail.id.split(':').pop(), detail.name);
      else if (detail.type === 'scene') renameScene(detail.id.split(':').pop(), detail.name);
    };
    const handleDeleteScene = (e: Event) => {
      const detail: any = (e as CustomEvent).detail;
      if (detail?.id) deleteScene(detail.id);
    };
  const handleAddNarrative = () => { const id = addNarrative(); fTrack('narrative.add', { id }); };
  const handleAddScene = (e: Event) => { const d: any = (e as CustomEvent).detail; if (d?.narrativeId) { const id = addScene(d.narrativeId); fTrack('scene.add', { id, narrativeId: d.narrativeId }); } };
    const handleDeleteNarrative = (e: Event) => { const d: any = (e as CustomEvent).detail; if (d?.narrativeId) deleteNarrative(d.narrativeId); };
    window.addEventListener('explorer:renameResult', handleRename as any);
    window.addEventListener('explorer:deleteScene', handleDeleteScene as any);
    window.addEventListener('explorer:addNarrative', handleAddNarrative as any);
    window.addEventListener('explorer:addScene', handleAddScene as any);
    window.addEventListener('explorer:deleteNarrative', handleDeleteNarrative as any);
    return () => {
      window.removeEventListener('explorer:renameResult', handleRename as any);
      window.removeEventListener('explorer:deleteScene', handleDeleteScene as any);
      window.removeEventListener('explorer:addNarrative', handleAddNarrative as any);
      window.removeEventListener('explorer:addScene', handleAddScene as any);
      window.removeEventListener('explorer:deleteNarrative', handleDeleteNarrative as any);
    };
  }, [renameStory, renameNarrative, renameScene, deleteScene, addNarrative, addScene, deleteNarrative]);

  // (Removed old in-React context menu helpers; native Electron menu handles rename/delete.)

  // Stabilize focus id if item removed
  useEffect(() => {
    if (flat.length === 0) return; // nothing to validate yet
    if (!flat.some(f => f.id === focusId)) setFocusId(flat[0].id);
  }, [flat, focusId]);

  const activeEntity = storyModel.activeEntity;

  return (
  <div className="vsc-explorer" role="region" aria-label={t('explorer.region.aria')}>
      <ul className="vsc-tree" role="tree" ref={listRef}>
        {flat.length === 0 && (
          <li className="vsc-item" aria-disabled="true" style={{ padding: '4px 8px', opacity: 0.7 }}>
            {t('explorer.initializing')}
          </li>
        )}
        {flat.map(item => {
          const isFocused = focusId === item.id;
          let isActive = false;
          if (activeEntity) {
            if (item.type === 'story' && activeEntity.type === 'story') isActive = true;
            else if (item.type === 'narrative' && activeEntity.type === 'narrative' && activeEntity.internalId === item.narrativeId) isActive = true;
            else if (item.type === 'scene' && activeEntity.type === 'scene' && activeEntity.internalId === item.sceneId) isActive = true;
          }
          const level = item.type === 'story' ? 1 : item.type === 'narrative' ? 2 : 3;
          const storyFileNameLabel = (storyModel.story?.title || t('explorer.storyFallback'));
          const label = item.type === 'story'
            ? storyFileNameLabel
            : item.type === 'narrative'
              ? `${storyModel.narratives[item.narrativeId!]?.title}`
              : storyModel.scenes[item.sceneId!]?.title;
          const expanded = item.expandable ? item.expanded : undefined;
          const rowClass = [ 'vsc-item', item.type, isActive ? 'selected' : '', isFocused ? 'focused' : '', item.expandable && expanded ? 'expanded' : '' ].filter(Boolean).join(' ');
          return (
            <li
              key={item.id}
              data-treeid={item.id}
              role="treeitem"
              aria-level={level}
              aria-expanded={item.expandable ? expanded : undefined}
              aria-selected={isActive || undefined}
              tabIndex={isFocused ? 0 : -1}
              className={rowClass}
              onKeyDown={(e) => handleKeyNav(e, item)}
              onClick={(e) => {
                setFocusId(item.id);
                if (item.type === 'story') {
                  setActiveStory();
                  // Optionally expand all narratives when selecting story
                  const exp: Record<string, boolean> = {};
                  if (story?.narrativeIds) story.narrativeIds.forEach(id => { exp[id] = true; });
                  setNarrativeExpanded(exp);
                  setStoryExpanded(true);
                } else if (item.type === 'narrative' && item.narrativeId) {
                  // Collapse all other narratives
                  const exp: Record<string, boolean> = {};
                  exp[item.narrativeId] = true;
                  setNarrativeExpanded(exp);
                  setActiveNarrative(item.narrativeId);
                } else if (item.type === 'scene' && item.sceneId) {
                  // Expand only the parent narrative containing this scene
                  if (item.parent?.startsWith('narrative:')) {
                    const nid = item.parent.split(':')[1];
                    const exp: Record<string, boolean> = {}; exp[nid] = true; setNarrativeExpanded(exp);
                  }
                  setActiveScene(item.sceneId);
                }
              }}
              onContextMenu={(e) => { e.preventDefault(); setFocusId(item.id); const title = item.type==='story'? (storyModel.story?.title||'Story'): item.type==='narrative'? storyModel.narratives[item.narrativeId!]?.title : storyModel.scenes[item.sceneId!]?.title; window.storymode?.explorerContextMenu({ id: item.id, type: item.type, narrativeId: item.narrativeId, sceneId: item.sceneId, title }); }}
            >
              <div className="row" style={{ paddingLeft: (level -1) * 8, display:'flex', alignItems:'center', justifyContent:'space-between', gap:4 }}>
                <span className="label" style={{ flex:1, display:'inline-flex', alignItems:'center', gap:6 }} title={label}>
                  <span aria-hidden="true" style={{ display:'inline-flex' }}>
                    {item.type === 'story' && (
                      <svg width="14" height="14" viewBox="0 0 24 24" stroke="hsl(260,70%,60%)" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h9l7 7v9H4V4Z" />
                        <path d="M13 4v7h7" />
                      </svg>
                    )}
                    {item.type === 'narrative' && (
                      /* Swapped icon: previously narrative icon replaced with former scene style */
                      <svg width="14" height="14" viewBox="0 0 24 24" stroke="hsl(200,70%,55%)" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="4" y="5" width="16" height="14" rx="2" />
                        <path d="M4 10h16" />
                      </svg>
                    )}
                    {item.type === 'scene' && (
                      /* Swapped icon: scene now uses the dual-panel motif */
                      <svg width="14" height="14" viewBox="0 0 24 24" stroke="hsl(25,75%,55%)" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="7" height="16" rx="1" />
                        <rect x="14" y="4" width="7" height="10" rx="1" />
                      </svg>
                    )}
                  </span>
                  <span>{label}</span>
                </span>
                {item.expandable ? (
                  <span
                    className="chevron"
                    style={{ marginLeft:4, marginRight:0, cursor:'pointer' }}
                    onClick={(e) => { e.stopPropagation(); if (item.type === 'story') setStoryExpanded(!storyExpanded); else if (item.type === 'narrative' && item.narrativeId) toggleNarrative(item.narrativeId); }}
                    aria-label={expanded ? t('explorer.collapse') : t('explorer.expand')}
                  >
                    {expanded ? (
                      // Up arrow when expanded
                      <svg width="12" height="12" viewBox="0 0 16 16"><path d="M4 10l4-4 4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    ) : (
                      // Down arrow when collapsed
                      <svg width="12" height="12" viewBox="0 0 16 16"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    )}
                  </span>
                ) : null }
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default FileList;
