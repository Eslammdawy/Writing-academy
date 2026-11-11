import { useWindowDimensions } from 'react-native';

export type TabletSizeClass = 'compact-8in' | 'standard-10in' | 'wide-12in';

export interface TabletLayoutMetrics {
  width: number;
  height: number;
  isLandscape: boolean;
  isPortrait: boolean;
  sizeClass: TabletSizeClass;
  maxContentWidth: number;
  horizontalPadding: number;
  gridColumns: number;
  canvasSize: number;
  buttonHeight: number;
}

/**
 * Responsive tablet layout hook supporting 8-inch, 10-11-inch, and 12-13-inch Android tablets
 * in both landscape and portrait orientations without hard-coded coordinates.
 */
export function useTabletLayout(): TabletLayoutMetrics {
  const { width, height } = useWindowDimensions();
  const isLandscape = width >= height;
  const isPortrait = !isLandscape;
  const longestEdge = Math.max(width, height);
  const shortestEdge = Math.min(width, height);

  let sizeClass: TabletSizeClass = 'standard-10in';
  if (longestEdge < 960 || shortestEdge < 600) {
    sizeClass = 'compact-8in';
  } else if (longestEdge >= 1280) {
    sizeClass = 'wide-12in';
  }

  const maxContentWidth = isLandscape ? Math.min(width - 48, 1360) : Math.min(width - 32, 920);
  const horizontalPadding = sizeClass === 'compact-8in' ? 16 : sizeClass === 'wide-12in' ? 32 : 24;

  const gridColumns = isLandscape
    ? sizeClass === 'wide-12in'
      ? 7
      : sizeClass === 'standard-10in'
        ? 6
        : 5
    : sizeClass === 'compact-8in'
      ? 4
      : 5;

  // Compute central handwriting canvas dimension that stays large in both landscape & portrait
  const availableCanvasWidth = isLandscape ? width * 0.62 : width - horizontalPadding * 2 - 24;
  const availableCanvasHeight = isLandscape ? height - 180 : height * 0.52;
  const rawCanvasSize = Math.min(availableCanvasWidth, availableCanvasHeight);
  const canvasSize = Math.max(280, Math.min(rawCanvasSize, 620));

  const buttonHeight = sizeClass === 'compact-8in' ? 60 : 68;

  return {
    width,
    height,
    isLandscape,
    isPortrait,
    sizeClass,
    maxContentWidth,
    horizontalPadding,
    gridColumns,
    canvasSize,
    buttonHeight,
  };
}
