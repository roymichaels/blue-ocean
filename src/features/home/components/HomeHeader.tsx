import React from 'react';
import GlobalHeader from '@/components/GlobalHeader';

interface HomeHeaderProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export default function HomeHeader({ searchQuery, onSearchChange }: HomeHeaderProps) {
  return (
    <GlobalHeader
      searchQuery={searchQuery}
      onSearchChange={onSearchChange}
      showSearch
    />
  );
}

