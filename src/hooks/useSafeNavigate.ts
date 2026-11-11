import { useRouter } from 'expo-router';
import { useCallback, useRef } from 'react';

const DEFAULT_LOCK_MS = 420;

/**
 * Prevents rapid double-taps by a child from stacking duplicate screens,
 * and standardizes navigation so Back/Home do not grow an unbounded stack.
 */
export function useSafeNavigate(lockMs: number = DEFAULT_LOCK_MS) {
  const router = useRouter();
  const lastNavTimeRef = useRef<number>(0);

  const canNavigate = useCallback(() => {
    const now = Date.now();
    if (now - lastNavTimeRef.current < lockMs) {
      return false;
    }
    lastNavTimeRef.current = now;
    return true;
  }, [lockMs]);

  const push = useCallback(
    (href: string) => {
      if (!canNavigate()) return;
      router.push(href as any);
    },
    [canNavigate, router]
  );

  const replace = useCallback(
    (href: string) => {
      if (!canNavigate()) return;
      router.replace(href as any);
    },
    [canNavigate, router]
  );

  const back = useCallback(
    (fallbackHref: string = '/(child)/home') => {
      if (!canNavigate()) return;
      if (typeof router.canGoBack === 'function' && router.canGoBack()) {
        router.back();
      } else {
        router.replace(fallbackHref as any);
      }
    },
    [canNavigate, router]
  );

  const goHome = useCallback(() => {
    if (!canNavigate()) return;
    router.replace('/(child)/home');
  }, [canNavigate, router]);

  return {
    push,
    replace,
    back,
    goHome,
  };
}
