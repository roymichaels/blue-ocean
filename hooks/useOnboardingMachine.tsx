import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type OnboardingStep =
  | 'intro'
  | 'askName'
  | 'askGoals'
  | 'confirm'
  | 'complete';

export interface OnboardingMessage {
  id: string;
  sender: 'aurora' | 'user';
  text: string;
}

interface OnboardingState {
  step: OnboardingStep;
  name?: string;
  goals?: string;
  history: OnboardingMessage[];
}

interface OnboardingContextValue extends OnboardingState {
  loading: boolean;
  send: (input: string) => void;
  reset: () => void;
}

const STORAGE_KEY = 'onboarding.state';

function getPrompt(step: OnboardingStep, state: OnboardingState): string {
  switch (step) {
    case 'intro':
      return "Hi, I'm Aurora. Let's get started.";
    case 'askName':
      return 'What\'s your name?';
    case 'askGoals':
      return `Nice to meet you, ${state.name}. What are your goals?`;
    case 'confirm':
      return `Got it. You want to ${state.goals}. Ready to begin?`;
    case 'complete':
      return 'You\'re all set!';
    default:
      return '';
  }
}

function createInitialState(): OnboardingState {
  const base: OnboardingState = { step: 'intro', history: [] };
  base.history.push({
    id: Date.now().toString(),
    sender: 'aurora',
    text: getPrompt('intro', base),
  });
  return base;
}

const OnboardingContext = createContext<OnboardingContextValue | undefined>(
  undefined,
);

function useProvideOnboarding(): OnboardingContextValue {
  const [state, setState] = useState<OnboardingState>(createInitialState());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          setState(JSON.parse(saved));
        }
      } catch (err) {
        console.error('Failed to load onboarding state', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (loading) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, loading]);

  const send = useCallback((input: string) => {
    setState((prev) => {
      const history = [
        ...prev.history,
        { id: Date.now().toString(), sender: 'user', text: input },
      ];
      let step = prev.step;
      let name = prev.name;
      let goals = prev.goals;
      switch (prev.step) {
        case 'intro':
          step = 'askName';
          history.push({
            id: Date.now().toString(),
            sender: 'aurora',
            text: getPrompt('askName', prev),
          });
          break;
        case 'askName':
          name = input;
          step = 'askGoals';
          history.push({
            id: Date.now().toString(),
            sender: 'aurora',
            text: getPrompt('askGoals', { ...prev, name }),
          });
          break;
        case 'askGoals':
          goals = input;
          step = 'confirm';
          history.push({
            id: Date.now().toString(),
            sender: 'aurora',
            text: getPrompt('confirm', { ...prev, name, goals }),
          });
          break;
        case 'confirm':
          step = 'complete';
          history.push({
            id: Date.now().toString(),
            sender: 'aurora',
            text: getPrompt('complete', prev),
          });
          break;
        case 'complete':
          break;
      }
      return { step, name, goals, history };
    });
  }, []);

  const reset = useCallback(() => {
    const init = createInitialState();
    setState(init);
  }, []);

  return { ...state, loading, send, reset };
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const value = useProvideOnboarding();
  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
  return ctx;
}

