import { Stack } from 'expo-router';
import React from 'react';
import { COLORS } from '../../src/theme/tokens';

export default function ParentLayout() {
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
