import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { ThemeProvider, useTheme } from '@/ui/ThemeProvider';

describe('theme contrast', () => {
  it('uses distinct text and canvas colors in light mode', async () => {
    let colorsRef: any;
    let setThemeRef: any;

    const Capture = () => {
      const { colors, setTheme } = useTheme();
      colorsRef = colors;
      setThemeRef = setTheme;
      return null;
    };

    renderer.create(React.createElement(ThemeProvider, null, React.createElement(Capture)));

    await act(async () => {
      await setThemeRef('light');
    });

    expect(colorsRef.text.primary).not.toBe(colorsRef.canvas);
  });
});
