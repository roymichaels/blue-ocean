import React from 'react';
import renderer from 'react-test-renderer';
import PriceRange from '@/features/home/components/PriceRange';
import { setTranslations } from '@/i18n';
import en from '@/translations/en.json';
import he from '@/translations/he.json';
import { I18nManager } from 'react-native';
import { TextField } from '@/ui';

describe('PriceRange', () => {
  const noop = () => {};

  it('renders English placeholders in LTR', () => {
    setTranslations(en);
    I18nManager.isRTL = false;
    const tree = renderer.create(
      <PriceRange minPrice="" setMinPrice={noop} maxPrice="" setMaxPrice={noop} />
    );
    const inputs = tree.root.findAllByType(TextField);
    expect(inputs[0].props.placeholder).toBe('Min');
    expect(inputs[1].props.placeholder).toBe('Max');
    expect(inputs[0].props.textAlign).toBe('right');
    expect(inputs[1].props.textAlign).toBe('right');
  });

  it('renders Hebrew placeholders in RTL', () => {
    setTranslations(he);
    I18nManager.isRTL = true;
    const tree = renderer.create(
      <PriceRange minPrice="" setMinPrice={noop} maxPrice="" setMaxPrice={noop} />
    );
    const inputs = tree.root.findAllByType(TextField);
    expect(inputs[0].props.placeholder).toBe('מינימום');
    expect(inputs[1].props.placeholder).toBe('מקסימום');
    expect(inputs[0].props.textAlign).toBe('right');
    expect(inputs[1].props.textAlign).toBe('right');
  });
});
