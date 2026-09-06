import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { MainMenu } from './components/MainMenu';
import { HUD } from './components/HUD';
import { DialogueBox } from './components/DialogueBox';
import { MobileControls } from './components/MobileControls';
import { TruthJournal } from './components/TruthJournal';
import { PauseMenu } from './components/PauseMenu';
import { LevelCompleteScreen } from './components/LevelCompleteScreen';
import { AudioManager } from './game/AudioManager';
import { GameEngine } from './game/GameEngine';
import type { GameCallbacks } from './game/GameEngine';
import type { GameState, Clue, DialogueLine, SaveProfile, GameSettings } from './game/types';
import { ALL_LEVELS, TOTAL_LEVELS } from './data/levels';
import { loadSettings, saveSettings, saveProfile } from './game/SaveSystem';

// ── Singleton audio manager, initialised with persisted settings ─────────────
const _s0 = loadSettings();
const audio = new AudioManager(_s0.musicVolume, _s0.sfxVolume, _s0.musicMuted, _s0.sfxMuted);

function App() {
  const [screen, setScreen] = useState<'menu' | 'game' | 'levelComplete'>('menu');
  const [gameState, setGameState] = useState<GameState>('menu');
  const [currentProfile, setCurrentProfile] = useState<SaveProfile | null>(null);
  const [settings, setSettings] = useState<GameSettings>(loadSettings());
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [gameKey, setGameKey] = useState(0);

  const currentLevel = ALL_LEVELS[currentLevelIndex] ?? ALL_LEVELS[0];

  // HUD state
  const [playerHp, setPlayerHp] = useState(5);
  const [clueCount, setClueCount] = useState(0);
  const [bossActive, setBossActive] = useState(false);
  const [bossHp, setBossHp] = useState(0);
  const [bossMaxHp, setBossMaxHp] = useState(10);
  const [gateOpen, setGateOpen] = useState(false);
  const [showGateMsg, setShowGateMsg] = useState(false);
  const [showBossMsg, setShowBossMsg] = useState(false);
  const [currentObjective, setCurrentObjective] = useState(ALL_LEVELS[0].objective);
  const gateMsgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bossMsgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dialogue state
  const [dialogueLines, setDialogueLines] = useState<DialogueLine[] | null>(null);
  const [dialogueIndex, setDialogueIndex] = useState(0);

  // Journal state
  const [showJournal, setShowJournal] = useState(false);
  const [collectedClues, setCollectedClues] = useState<Clue[]>([]);
  const [newClue, setNewClue] = useState<Clue | null>(null);
  const newClueTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Level complete
  const [completionFragment, setCompletionFragment] = useState('');

  const engineRef = useRef<GameEngine | null>(null);

  // ── Refs to keep latest values accessible from stable callbacks ──────────
  const currentProfileRef = useRef(currentProfile);
  const settingsRef = useRef(settings);
  const collectedCluesRef = useRef(collectedClues);
  const currentLevelIndexRef = useRef(currentLevelIndex);
  const bossActiveRef = useRef(false);
  const victoryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  currentProfileRef.current = currentProfile;
  settingsRef.current = settings;
  collectedCluesRef.current = collectedClues;
  currentLevelIndexRef.current = currentLevelIndex;

  // ── Live callback implementations (updated every render) ─────────────────
  const liveCallbacks = useRef<GameCallbacks>({
    onStateChange: () => {},
    onClueCollected: () => {},
    onDialogue: () => {},
    onHealthChange: () => {},
    onBossChange: () => {},
    onGateOpen: () => {},
    onLevelComplete: () => {},
    onClueCount: () => {},
  });

  // Keep objective in sync when level changes externally
  useEffect(() => {
    setCurrentObjective(currentLevel.objective);
  }, [currentLevel]);

  liveCallbacks.current = {
    onStateChange: (state) => {
      setGameState(state);
      if (state === 'paused') setShowJournal(false);
    },

    onClueCollected: (clue) => {
      setCollectedClues(prev => {
        if (prev.find(c => c.id === clue.id)) return prev;
        return [...prev, clue];
      });
      setNewClue(clue);
      if (newClueTimer.current) clearTimeout(newClueTimer.current);
      newClueTimer.current = setTimeout(() => setNewClue(null), 3000);
      // Play appropriate SFX for the clue category
      const cat = clue.category;
      if (cat === 'VERIFIED RECORD') audio.playVerifiedCollected();
      else if (cat === 'RUMOR' || cat === 'UNPROVEN THEORY') audio.playRumorCollected();
      else audio.playClueCollected();
    },

    onDialogue: (lines, index) => {
      setDialogueLines(lines);
      setDialogueIndex(index);
      audio.playDialogue();
    },

    onHealthChange: (hp) => {
      setPlayerHp(hp);
    },

    onBossChange: (hp, maxHp, active) => {
      const wasActive = bossActiveRef.current;
      bossActiveRef.current = active;
      setBossHp(hp);
      setBossMaxHp(maxHp);
      setBossActive(active);

      if (active && !wasActive) {
        // Boss encounter begins — switch to boss music
        const lvlIdx = currentLevelIndexRef.current;
        const isFinalBoss = lvlIdx === TOTAL_LEVELS - 1;
        audio.startMusic(isFinalBoss ? 'finalboss' : 'boss');
      } else if (!active && wasActive) {
        // Boss defeated — victory!
        audio.playVictory();
        audio.stopMusic(true);
        // After victory jingle, fade back to level music
        if (victoryTimerRef.current) clearTimeout(victoryTimerRef.current);
        victoryTimerRef.current = setTimeout(() => {
          const lvlIdx = currentLevelIndexRef.current;
          audio.startMusic(`level${lvlIdx + 1}`);
        }, 2800);
      }
    },

    onGateOpen: () => {
      setGateOpen(true);
      setShowGateMsg(true);
      audio.playGateOpen();
      if (gateMsgTimer.current) clearTimeout(gateMsgTimer.current);
      gateMsgTimer.current = setTimeout(() => setShowGateMsg(false), 3500);
    },

    onBossUnlock: () => {
      setShowBossMsg(true);
      if (bossMsgTimer.current) clearTimeout(bossMsgTimer.current);
      bossMsgTimer.current = setTimeout(() => setShowBossMsg(false), 4000);
    },

    onObjective: (text) => setCurrentObjective(text),

    onLevelComplete: (fragment) => {
      setCompletionFragment(fragment);
      setScreen('levelComplete');
      // Clear any pending victory timer — level complete screen uses victory music
      if (victoryTimerRef.current) clearTimeout(victoryTimerRef.current);
      audio.startMusic('victory');
      audio.playFragmentCollected();

      const profile = currentProfileRef.current;
      const s = settingsRef.current;
      const clues = collectedCluesRef.current;
      const lvlIdx = currentLevelIndexRef.current;
      if (profile && s.autoSave) {
        const updated: SaveProfile = {
          ...profile,
          level: lvlIdx + 2, // save next level (1-indexed)
          clues,
          truthFragments: [...(profile.truthFragments || []), fragment],
          completedBosses: [...(profile.completedBosses || []), ALL_LEVELS[lvlIdx].bossName],
          timestamp: Date.now(),
        };
        saveProfile(updated);
        setCurrentProfile(updated);
      }
    },

    onClueCount: (count) => setClueCount(count),
  };

  // ── Stable delegation wrapper — passed once to GameEngine on mount ────────
  const stableCallbacks = useMemo<GameCallbacks>(() => ({
    onStateChange: (s) => liveCallbacks.current.onStateChange(s),
    onClueCollected: (c) => liveCallbacks.current.onClueCollected(c),
    onDialogue: (lines, idx) => liveCallbacks.current.onDialogue(lines, idx),
    onHealthChange: (hp) => liveCallbacks.current.onHealthChange(hp),
    onBossChange: (hp, max, active) => liveCallbacks.current.onBossChange(hp, max, active),
    onGateOpen: () => liveCallbacks.current.onGateOpen(),
    onBossUnlock: () => liveCallbacks.current.onBossUnlock(),
    onObjective: (t) => liveCallbacks.current.onObjective(t),
    onLevelComplete: (f) => liveCallbacks.current.onLevelComplete(f),
    onClueCount: (n) => liveCallbacks.current.onClueCount(n),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const resetGameUI = useCallback(() => {
    setPlayerHp(5);
    setClueCount(0);
    setBossActive(false);
    setBossHp(0);
    setGateOpen(false);
    setShowGateMsg(false);
    setShowBossMsg(false);
    setCurrentObjective(ALL_LEVELS[currentLevelIndexRef.current]?.objective ?? '');
    setCollectedClues([]);
    setNewClue(null);
    setDialogueLines(null);
    setCompletionFragment('');
    bossActiveRef.current = false;
    if (victoryTimerRef.current) clearTimeout(victoryTimerRef.current);
  }, []);

  const handleSettingsChange = useCallback((s: GameSettings) => {
    setSettings(s);
    saveSettings(s);
    audio.setMusicVolume(s.musicVolume);
    audio.setSfxVolume(s.sfxVolume);
    audio.setMusicMuted(s.musicMuted);
    audio.setSfxMuted(s.sfxMuted);
  }, []);

  const handleStartGame = useCallback((profile: SaveProfile) => {
    setCurrentProfile(profile);
    // Resume from saved level (profile.level is 1-indexed, clamp to valid range)
    const savedIdx = Math.min(Math.max((profile.level || 1) - 1, 0), TOTAL_LEVELS - 1);
    setCurrentLevelIndex(savedIdx);
    currentLevelIndexRef.current = savedIdx;
    resetGameUI();
    setGameKey(k => k + 1);
    setScreen('game');
    setGameState('exploring');
    audio.resume();
    audio.startMusic(`level${savedIdx + 1}`);
  }, [resetGameUI]);

  const handleResume = useCallback(() => {
    engineRef.current?.resume();
  }, []);

  const handlePause = useCallback(() => {
    engineRef.current?.pause();
  }, []);

  const handleOpenJournal = useCallback(() => {
    audio.playJournalOpen();
    setShowJournal(true);
  }, []);

  const handleCloseJournal = useCallback(() => {
    audio.playJournalClose();
    setShowJournal(false);
  }, []);

  const handleMainMenu = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.stop();
      engineRef.current.unbindKeys();
    }
    if (victoryTimerRef.current) clearTimeout(victoryTimerRef.current);
    setScreen('menu');
    setGameState('menu');
    setShowJournal(false);
    bossActiveRef.current = false;
    audio.startMusic('menu');
  }, []);

  const handleMobileInput = useCallback((input: Partial<Record<string, boolean>>) => {
    engineRef.current?.setMobileInput(input as any);
  }, []);

  const handleAdvanceDialogue = useCallback(() => {
    engineRef.current?.advanceDialogue();
  }, []);

  // Called from LevelCompleteScreen — advance to next level or return to menu
  const handleNextLevel = useCallback(() => {
    const nextIdx = currentLevelIndexRef.current + 1;
    if (nextIdx >= TOTAL_LEVELS) {
      setScreen('menu');
      setGameState('menu');
      audio.startMusic('menu');
      return;
    }
    setCurrentLevelIndex(nextIdx);
    currentLevelIndexRef.current = nextIdx;
    resetGameUI();
    setGameKey(k => k + 1);
    setScreen('game');
    setGameState('exploring');
    audio.startMusic(`level${nextIdx + 1}`);
  }, [resetGameUI]);

  // ── Start menu music on first render ─────────────────────────────────────
  useEffect(() => {
    audio.startMusic('menu');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && gameState === 'paused') handleResume();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [gameState, handleResume]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === 'j' || e.key === 'J') && (gameState === 'exploring' || gameState === 'boss')) {
        setShowJournal(v => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [gameState]);

  // ── Render ────────────────────────────────────────────────────────────────

  const isPlaying = screen === 'game';
  const isPaused = gameState === 'paused';
  const isDialogue = gameState === 'dialogue';
  const isMobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  const isLastLevel = currentLevelIndex === TOTAL_LEVELS - 1;

  return (
    <div style={{
      width: '100vw', height: '100vh', overflow: 'hidden',
      background: '#000',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Game frame — 11:16 aspect ratio, slightly wider than portrait */}
      <div style={{
        position: 'relative',
        width: 'min(100vw, calc(100vh * 11 / 16))',
        height: '100vh',
        overflow: 'hidden',
        background: '#030108',
      }}>

      {/* Main Menu */}
      {screen === 'menu' && (
        <MainMenu
          onStartGame={handleStartGame}
          settings={settings}
          onSettingsChange={handleSettingsChange}
        />
      )}

      {/* Game Canvas */}
      {isPlaying && (
        <>
          <GameCanvas
            key={gameKey}
            level={currentLevel}
            audio={audio}
            callbacks={stableCallbacks}
            engineRef={engineRef}
          />

          {/* HUD */}
          {(gameState === 'exploring' || gameState === 'boss' || gameState === 'dialogue') && (
            <HUD
              hp={playerHp}
              maxHp={5}
              clueCount={clueCount}
              totalClues={currentLevel.clues.length}
              levelName={currentLevel.name}
              levelSubtitle={currentLevel.subtitle}
              levelNumber={currentLevelIndex + 1}
              objective={currentObjective}
              bossActive={bossActive}
              bossHp={bossHp}
              bossMaxHp={bossMaxHp}
              bossName={currentLevel.bossName}
              gateOpen={gateOpen}
              showGateMsg={showGateMsg}
              showBossMsg={showBossMsg}
              onJournalOpen={handleOpenJournal}
              onPause={handlePause}
              newClue={newClue}
            />
          )}

          {/* Dialogue box */}
          {isDialogue && dialogueLines && dialogueLines.length > 0 && (
            <DialogueBox
              lines={dialogueLines}
              index={dialogueIndex}
              textSpeed={settings.textSpeed}
              onAdvance={handleAdvanceDialogue}
            />
          )}

          {/* Mobile controls */}
          <MobileControls
            onInput={handleMobileInput}
            visible={isMobile || settings.mobileControls}
          />

          {/* Pause menu */}
          {isPaused && (
            <PauseMenu
              onResume={handleResume}
              onJournal={handleOpenJournal}
              onMainMenu={handleMainMenu}
              settings={settings}
              onSettingsChange={handleSettingsChange}
            />
          )}

          {/* Journal overlay */}
          {showJournal && (
            <TruthJournal
              clues={collectedClues}
              onClose={handleCloseJournal}
            />
          )}
        </>
      )}

      {/* Level Complete */}
      {screen === 'levelComplete' && (
        <LevelCompleteScreen
          fragment={completionFragment}
          levelNumber={currentLevelIndex + 1}
          levelName={currentLevel.name}
          levelSubtitle={currentLevel.subtitle}
          cluesFound={collectedClues.length}
          isLastLevel={isLastLevel}
          onContinue={handleNextLevel}
        />
      )}

      </div>{/* end portrait frame */}
    </div>
  );
}

export default App;
