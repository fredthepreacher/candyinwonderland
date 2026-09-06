import React, { useState } from 'react';
import type { Clue, ClueCategory } from '../game/types';

const CATEGORY_COLORS: Record<ClueCategory, { bg: string; border: string; text: string }> = {
  'VERIFIED RECORD':  { bg: 'rgba(46,204,113,0.15)', border: '#2ECC71', text: '#2ECC71' },
  'PUBLIC STATEMENT': { bg: 'rgba(52,152,219,0.15)', border: '#3498DB', text: '#3498DB' },
  'MEDIA REPORT':     { bg: 'rgba(243,156,18,0.15)',  border: '#F39C12', text: '#F39C12' },
  'ALLEGATION':       { bg: 'rgba(231,76,60,0.15)',   border: '#E74C3C', text: '#E74C3C' },
  'RUMOR':            { bg: 'rgba(230,126,34,0.15)',  border: '#E67E22', text: '#E67E22' },
  'CONTRADICTION':    { bg: 'rgba(155,89,182,0.15)',  border: '#9B59B6', text: '#9B59B6' },
  'UNPROVEN THEORY':  { bg: 'rgba(149,165,166,0.15)', border: '#95A5A6', text: '#95A5A6' },
  'SYMBOLIC CLUE':    { bg: 'rgba(142,68,173,0.15)',  border: '#8E44AD', text: '#8E44AD' },
  'WONDERLAND CLUE':  { bg: 'rgba(213,179,255,0.15)', border: '#D5B3FF', text: '#D5B3FF' },
};

interface TruthJournalProps {
  clues: Clue[];
  onClose: () => void;
}

export function TruthJournal({ clues, onClose }: TruthJournalProps) {
  const [activeTab, setActiveTab] = useState<ClueCategory | 'all'>('all');

  const categories: ClueCategory[] = [
    'VERIFIED RECORD', 'PUBLIC STATEMENT', 'MEDIA REPORT',
    'ALLEGATION', 'RUMOR', 'CONTRADICTION',
    'UNPROVEN THEORY', 'SYMBOLIC CLUE', 'WONDERLAND CLUE',
  ];

  const filtered = activeTab === 'all' ? clues : clues.filter(c => c.category === activeTab);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.88)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '"Courier New", Courier, monospace',
    }}>
      <div style={{
        width: '90%', maxWidth: 600, maxHeight: '88vh',
        background: 'rgba(8,4,20,0.97)',
        border: '2px solid rgba(155,89,182,0.7)',
        borderRadius: 10,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid rgba(155,89,182,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(155,89,182,0.08)',
        }}>
          <div>
            <div style={{ color: '#D5B3FF', fontSize: 11, letterSpacing: 2 }}>📔 TRUTH JOURNAL</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, marginTop: 2, lineHeight: 1.4 }}>
              Not every clue is proof. Separate truth from confusion.
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: '1px solid rgba(255,255,255,0.3)',
              color: 'white', borderRadius: 6,
              padding: '4px 12px', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 11,
            }}
          >
            CLOSE [E]
          </button>
        </div>

        {/* Tab bar */}
        <div style={{
          display: 'flex', gap: 4, padding: '8px 12px',
          overflowX: 'auto',
          borderBottom: '1px solid rgba(155,89,182,0.2)',
          flexShrink: 0,
        }}>
          <Tab label="ALL" count={clues.length} active={activeTab === 'all'} onClick={() => setActiveTab('all')} color="#AAA" />
          {categories.map(cat => {
            const cnt = clues.filter(c => c.category === cat).length;
            if (cnt === 0) return null;
            const c = CATEGORY_COLORS[cat];
            return (
              <Tab key={cat} label={cat.split(' ')[0]} count={cnt} active={activeTab === cat} onClick={() => setActiveTab(cat)} color={c.border} />
            );
          })}
        </div>

        {/* Clue list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', marginTop: 40, fontSize: 12 }}>
              No clues in this category yet.
              <br /><br />
              <span style={{ fontSize: 10 }}>Talk to witnesses and explore the courtyard.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filtered.map(clue => {
                const c = CATEGORY_COLORS[clue.category];
                return (
                  <div key={clue.id} style={{
                    background: c.bg,
                    border: `1px solid ${c.border}44`,
                    borderLeft: `3px solid ${c.border}`,
                    borderRadius: 6, padding: '10px 14px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                      <div style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>{clue.title}</div>
                      <span style={{
                        color: c.text, fontSize: 8, letterSpacing: 1,
                        background: `${c.border}22`,
                        border: `1px solid ${c.border}44`,
                        borderRadius: 3, padding: '2px 6px', flexShrink: 0, marginLeft: 8,
                      }}>
                        {clue.category}
                      </span>
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, lineHeight: 1.5 }}>
                      {clue.description}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer disclaimer */}
        <div style={{
          padding: '8px 16px',
          borderTop: '1px solid rgba(155,89,182,0.2)',
          color: 'rgba(255,255,255,0.35)', fontSize: 9, lineHeight: 1.5, textAlign: 'center',
        }}>
          Some clues are rumors • Some are contradictions • Some are symbolic
          <br />Candy must separate truth from confusion
        </div>
      </div>
    </div>
  );
}

function Tab({ label, count, active, onClick, color }: {
  label: string; count: number; active: boolean; onClick: () => void; color: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? `${color}22` : 'transparent',
        border: `1px solid ${active ? color : 'rgba(255,255,255,0.15)'}`,
        color: active ? color : 'rgba(255,255,255,0.5)',
        borderRadius: 4, padding: '3px 8px',
        cursor: 'pointer', fontFamily: 'inherit',
        fontSize: 9, letterSpacing: 1, whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {label} ({count})
    </button>
  );
}
