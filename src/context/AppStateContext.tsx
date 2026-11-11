import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  AcademyRepository,
  defaultRepository,
  RecordPracticeInput,
} from '../database/repository';
import { audioService } from '../services/audio/audioService';
import {
  AchievementRecord,
  AchievementType,
  AvatarId,
  ChildProfile,
  LanguageCode,
  LearningProgressRecord,
  ParentSettingsRecord,
  PracticeAttemptRecord,
  PracticeSessionRecord,
} from '../types';
import { DEFAULT_PARENT_PIN_HASH } from '../utils/pinSecurity';

export interface ChildAnalyticsSummary {
  child: ChildProfile;
  progress: Record<string, LearningProgressRecord>;
  achievements: AchievementRecord[];
  sessions: PracticeSessionRecord[];
  attempts: PracticeAttemptRecord[];
}

export interface AppStateContextValue {
  isReady: boolean;
  childrenProfiles: ChildProfile[];
  activeChild: ChildProfile;
  progressMap: Record<string, LearningProgressRecord>;
  achievements: AchievementRecord[];
  sessions: PracticeSessionRecord[];
  parentSettings: ParentSettingsRecord;
  isParentAuthenticated: boolean;
  selectChild: (childId: string) => Promise<void>;
  updateChild: (
    childId: string,
    name: string,
    avatar: AvatarId,
    preferredLanguage?: LanguageCode
  ) => Promise<void>;
  addChild: (
    name: string,
    avatar: AvatarId,
    preferredLanguage?: LanguageCode
  ) => Promise<ChildProfile>;
  recordPractice: (
    input: Omit<RecordPracticeInput, 'childId'>
  ) => Promise<{
    updatedProgress: LearningProgressRecord;
    newAchievements: AchievementType[];
  }>;
  unlockBadge: (type: AchievementType) => Promise<boolean>;
  authenticateParent: (pin: string) => Promise<boolean>;
  authenticateParentByRecovery: () => Promise<void>;
  lockParentArea: () => void;
  updateSettings: (
    partial: Partial<Omit<ParentSettingsRecord, 'id' | 'pinHash'>>
  ) => Promise<void>;
  changeParentPin: (newPin: string) => Promise<void>;
  resetChildData: (childId: string) => Promise<void>;
  resetAllData: () => Promise<void>;
  getChildSummaryForParent: (childId: string) => Promise<ChildAnalyticsSummary | null>;
}

const FALLBACK_CHILD: ChildProfile = {
  id: 'child_soufy',
  name: 'Soufy',
  avatar: 'explorer_fox',
  preferredLanguage: 'en',
  starsCount: 0,
  createdAt: '2026-11-11T08:00:00.000Z',
};

const FALLBACK_SETTINGS: ParentSettingsRecord = {
  id: 1,
  pinHash: DEFAULT_PARENT_PIN_HASH,
  pinHintShown: false,
  dailyGoalMinutes: 10,
  dailyGoalLetters: 3,
  audioEnabled: true,
  narrationEnabled: true,
  soundEffectsVolume: 0.85,
};

const AppStateContext = createContext<AppStateContextValue | null>(null);

export const AppStateProvider: React.FC<{
  children: React.ReactNode;
  repository?: AcademyRepository;
}> = ({ children, repository = defaultRepository }) => {
  const [isReady, setIsReady] = useState(false);
  const [childrenProfiles, setChildrenProfiles] = useState<ChildProfile[]>([FALLBACK_CHILD]);
  const [activeChildId, setActiveChildId] = useState<string>('child_soufy');
  const [progressMap, setProgressMap] = useState<Record<string, LearningProgressRecord>>({});
  const [achievements, setAchievements] = useState<AchievementRecord[]>([]);
  const [sessions, setSessions] = useState<PracticeSessionRecord[]>([]);
  const [parentSettings, setParentSettings] = useState<ParentSettingsRecord>(FALLBACK_SETTINGS);
  const [isParentAuthenticated, setIsParentAuthenticated] = useState(false);

  const loadChildIsolatedData = useCallback(
    async (childId: string) => {
      const [prog, ach, sess] = await Promise.all([
        repository.getProgressForChild(childId),
        repository.getAchievementsForChild(childId),
        repository.getSessionsForChild(childId),
      ]);
      setProgressMap(prog);
      setAchievements(ach);
      setSessions(sess);
    },
    [repository]
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      await repository.initialize();
      const [profiles, settings] = await Promise.all([
        repository.getChildren(),
        repository.getParentSettings(),
      ]);
      if (!mounted) return;
      const firstChild = profiles[0] ?? FALLBACK_CHILD;
      setChildrenProfiles(profiles);
      setActiveChildId(firstChild.id);
      setParentSettings(settings);
      audioService.updateConfig({
        audioEnabled: settings.audioEnabled,
        narrationEnabled: settings.narrationEnabled,
        soundEffectsVolume: settings.soundEffectsVolume,
      });
      await loadChildIsolatedData(firstChild.id);
      if (mounted) setIsReady(true);
    })();
    return () => {
      mounted = false;
    };
  }, [repository, loadChildIsolatedData]);

  const activeChild =
    childrenProfiles.find((c) => c.id === activeChildId) ??
    childrenProfiles[0] ??
    FALLBACK_CHILD;

  const selectChild = useCallback(
    async (childId: string) => {
      setActiveChildId(childId);
      await loadChildIsolatedData(childId);
    },
    [loadChildIsolatedData]
  );

  const updateChild = useCallback(
    async (
      childId: string,
      name: string,
      avatar: AvatarId,
      preferredLanguage?: LanguageCode
    ) => {
      await repository.updateChildProfile(childId, name, avatar, preferredLanguage);
      const profiles = await repository.getChildren();
      setChildrenProfiles(profiles);
    },
    [repository]
  );

  const addChild = useCallback(
    async (name: string, avatar: AvatarId, preferredLanguage: LanguageCode = 'en') => {
      const created = await repository.addChildProfile(name, avatar, preferredLanguage);
      const profiles = await repository.getChildren();
      setChildrenProfiles(profiles);
      return created;
    },
    [repository]
  );

  const recordPractice = useCallback(
    async (input: Omit<RecordPracticeInput, 'childId'>) => {
      const outcome = await repository.recordPracticeOutcome({
        ...input,
        childId: activeChild.id,
      });
      const profiles = await repository.getChildren();
      setChildrenProfiles(profiles);
      await loadChildIsolatedData(activeChild.id);
      return {
        updatedProgress: outcome.updatedProgress,
        newAchievements: outcome.newAchievements,
      };
    },
    [repository, activeChild.id, loadChildIsolatedData]
  );

  const unlockBadge = useCallback(
    async (type: AchievementType) => {
      const unlocked = await repository.unlockAchievement(activeChild.id, type);
      if (unlocked) {
        const ach = await repository.getAchievementsForChild(activeChild.id);
        setAchievements(ach);
      }
      return unlocked;
    },
    [repository, activeChild.id]
  );

  const authenticateParent = useCallback(
    async (pin: string) => {
      const valid = await repository.verifyPin(pin);
      if (valid) {
        setIsParentAuthenticated(true);
        if (!parentSettings.pinHintShown) {
          const updated = await repository.updateParentSettings({ pinHintShown: true });
          setParentSettings(updated);
        }
      }
      return valid;
    },
    [repository, parentSettings.pinHintShown]
  );

  const authenticateParentByRecovery = useCallback(async () => {
    setIsParentAuthenticated(true);
  }, []);

  const lockParentArea = useCallback(() => {
    setIsParentAuthenticated(false);
  }, []);

  const updateSettings = useCallback(
    async (partial: Partial<Omit<ParentSettingsRecord, 'id' | 'pinHash'>>) => {
      const next = await repository.updateParentSettings(partial);
      setParentSettings(next);
      audioService.updateConfig({
        audioEnabled: next.audioEnabled,
        narrationEnabled: next.narrationEnabled,
        soundEffectsVolume: next.soundEffectsVolume,
      });
    },
    [repository]
  );

  const changeParentPin = useCallback(
    async (newPin: string) => {
      await repository.updateParentPin(newPin);
      const next = await repository.getParentSettings();
      setParentSettings(next);
    },
    [repository]
  );

  const resetChildData = useCallback(
    async (childId: string) => {
      await repository.resetChildProgress(childId);
      const profiles = await repository.getChildren();
      setChildrenProfiles(profiles);
      if (childId === activeChild.id) {
        await loadChildIsolatedData(activeChild.id);
      }
    },
    [repository, activeChild.id, loadChildIsolatedData]
  );

  const resetAllData = useCallback(async () => {
    await repository.resetAllProgress();
    const profiles = await repository.getChildren();
    setChildrenProfiles(profiles);
    await loadChildIsolatedData(activeChild.id);
  }, [repository, activeChild.id, loadChildIsolatedData]);

  const getChildSummaryForParent = useCallback(
    async (childId: string): Promise<ChildAnalyticsSummary | null> => {
      const child = await repository.getChildById(childId);
      if (!child) return null;
      const [progress, ach, sess, att] = await Promise.all([
        repository.getProgressForChild(childId),
        repository.getAchievementsForChild(childId),
        repository.getSessionsForChild(childId),
        repository.getAttemptsForChild(childId),
      ]);
      return {
        child,
        progress,
        achievements: ach,
        sessions: sess,
        attempts: att,
      };
    },
    [repository]
  );

  return (
    <AppStateContext.Provider
      value={{
        isReady,
        childrenProfiles,
        activeChild,
        progressMap,
        achievements,
        sessions,
        parentSettings,
        isParentAuthenticated,
        selectChild,
        updateChild,
        addChild,
        recordPractice,
        unlockBadge,
        authenticateParent,
        authenticateParentByRecovery,
        lockParentArea,
        updateSettings,
        changeParentPin,
        resetChildData,
        resetAllData,
        getChildSummaryForParent,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
};

export function useAppState(): AppStateContextValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error('useAppState must be used inside AppStateProvider');
  }
  return ctx;
}
