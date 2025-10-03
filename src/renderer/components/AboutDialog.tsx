import React, { useEffect, useRef, useState } from 'react';
import { t } from '../i18n.js';
import mascotPng from '../../../assets/images/logos/storymode-logo-char1.png';

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
  const footerCloseRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef<{ dragging: boolean; startX: number; startY: number; origLeft: number; origTop: number }>({
    dragging: false,
    startX: 0,
    startY: 0,
    origLeft: 0,
    origTop: 0,
  });

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
        ref={dialogRef}
  style={{ position: 'relative' }}
        onPointerDown={(e) => {
          // allow dragging when starting on any non-interactive area (not a button or link)
          const targetEl = e.target as HTMLElement;
          if (targetEl.closest('button, a')) return;
          const state = dragState.current!;
          state.dragging = true;
          state.startX = e.clientX;
          state.startY = e.clientY;
          const dlg = dialogRef.current!;
          const dlgRect = dlg.getBoundingClientRect();
          dlg.style.position = 'fixed';
          dlg.style.left = dlgRect.left + 'px';
          dlg.style.top = dlgRect.top + 'px';
          state.origLeft = dlgRect.left;
          state.origTop = dlgRect.top;
          dlg.style.margin = '0';
          e.preventDefault();
        }}
        onPointerMove={(e) => {
          const state = dragState.current!;
          if (!state.dragging) return;
          const dlg = dialogRef.current!;
          const dx = e.clientX - state.startX;
          const dy = e.clientY - state.startY;
          dlg.style.left = state.origLeft + dx + 'px';
          dlg.style.top = state.origTop + dy + 'px';
        }}
        onPointerUp={() => {
          const state = dragState.current!;
          if (state.dragging) {
            state.dragging = false;
          }
        }}
        onPointerLeave={(e) => {
          const state = dragState.current!;
          if (state.dragging && e.buttons === 0) {
            state.dragging = false;
          }
        }}
      >
        <div className="about-header" style={{ gap: '6px', userSelect: 'none' }}>
          <div className="about-mascot-wrapper">
            <img className="about-mascot" src={mascotPng} alt={t('about.mascot.alt')} />
          </div>
          <div className="about-heading-text">
            <h1 id="about-title" className="about-title">{t('app.name')}</h1>
            <p className="about-tagline">
              {t('app.tagline.line1')}<br />{t('app.tagline.line2')}
            </p>
          </div>
        </div>
        <button
          className="about-close"
          aria-label={t('about.close.aria')}
          onClick={onClose}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M6.4 5 12 10.6 17.6 5l1.4 1.4L13.4 12l5.6 5.6-1.4 1.4L12 13.4 6.4 19l-1.4-1.4L10.6 12 5 6.4 6.4 5Z" fill="currentColor" />
          </svg>
        </button>
  <div className="about-versions" aria-label={t('about.version.info')}>
          <div className="about-version-row"><span className="about-ver-label">{t('about.version.application')}</span><span className="about-ver-value">{versions?.appVersion ?? '…'}</span></div>
          <div className="about-version-row"><span className="about-ver-label">{t('about.version.core')}</span><span className="about-ver-value">{versions?.coreVersion ?? '…'}</span></div>
          <div className="about-version-row"><span className="about-ver-label">{t('about.version.compiler')}</span><span className="about-ver-value">{versions?.compilerVersion ?? '…'}</span></div>
        </div>
        <footer className="about-footer">
          <div className="about-copyright">
            © {new Date().getFullYear()} William Sawyerr — All rights reserved
          </div>
          <div className="about-actions">
            <button onClick={onClose} className="about-btn-neutral" ref={footerCloseRef}>{t('action.close')}</button>
          </div>
        </footer>
      </div>
    </div>
  );
};
