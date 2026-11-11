import { Stack } from 'expo-router';
import React from 'react';
import { COLORS } from '../../src/theme/tokens';

export default function ChildLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
        animation: 'fade',
      }}
    />
  );
}
