import React, { useEffect, useState } from 'react';
// Import mascot image so bundler emits proper hashed asset and path works in production.
import mascotPng from '../../../assets/images/logos/storymode-logo-char.png';

interface VersionInfo {
  appVersion: string;
  coreVersion: string;
  compilerVersion: string;
}

interface AboutDialogProps {
  open: boolean;
  onClose: () => void;
}

export const AboutDialog: React.FC<AboutDialogProps> = ({ open, onClose }) => {
  const [versions, setVersions] = useState<VersionInfo | null>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    (async () => {
      try {
        const v = await window.storymode.versionInfo();
        if (alive && v) {
          setVersions({
            appVersion: v.appVersion || 'unknown',
            coreVersion: v.coreVersion || 'unknown',
            compilerVersion: v.compilerVersion || 'unknown',
          });
        }
      } catch {
        // ignore
      }
    })();
    return () => { alive = false; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="about-overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="about-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
      >
        <button
          className="about-close"
          aria-label="Close About"
          onClick={onClose}
        >
          ✕
        </button>
        <div className="about-header">
          <img
            className="about-mascot"
            src={mascotPng}
            alt="StoryMode Mascot"
            width={96}
            height={96}
            onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
          />
          <div className="about-heading-text">
            <h1 id="about-title" className="about-title">
              StoryMode
            </h1>
            <p className="about-tagline">
              Environment for writing stories
              <br />
              for video games
            </p>
          </div>
        </div>
        <div className="about-versions" aria-label="Version information">
          <div className="about-version-row"><span className="about-ver-label">Application</span><span className="about-ver-value">{versions?.appVersion ?? '…'}</span></div>
          <div className="about-version-row"><span className="about-ver-label">Core</span><span className="about-ver-value">{versions?.coreVersion ?? '…'}</span></div>
          <div className="about-version-row"><span className="about-ver-label">Compiler</span><span className="about-ver-value">{versions?.compilerVersion ?? '…'}</span></div>
        </div>
        <footer className="about-footer">
          <div className="about-copyright">
            © {new Date().getFullYear()} William Sawyerr —{' '}
            <a
              href="https://storymode.help"
              target="_blank"
              rel="noreferrer"
            >
              All rights reserved
            </a>
          </div>
          <div className="about-actions">
            <button onClick={onClose} className="about-btn-neutral">Close</button>
          </div>
        </footer>
      </div>
    </div>
  );
};
