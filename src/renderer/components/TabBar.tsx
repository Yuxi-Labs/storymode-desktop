import React from 'react';
import { useStore, selectFile } from '../store/store.js';

export const TabBar: React.FC = () => {
  const file = useStore(selectFile);
  const name = file.path ? file.path.split(/[/\\]/).pop() : 'Untitled';
  return (
    <div className="tab-bar">
      <div className="tab active">
        <span className="tab-title">{name}</span>
        {file.isDirty && <span className="dirty-dot" />}
      </div>
    </div>
  );
};
