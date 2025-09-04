import { useState, useEffect } from 'react';
import { errorLog } from '@/utils/logger';
import DatabaseService from '@/services/database';
import { Category } from '@/types';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const db = DatabaseService.getInstance();
        const categoriesData = await db.getCategories();
        setCategories(categoriesData);
      } catch (error) {
        errorLog('Error loading categories:', error);
      }
    };
    loadCategories();
  }, []);

  return categories;
}

export default useCategories;
