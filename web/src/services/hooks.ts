// Custom React Hooks for API Services
// This demonstrates how to create reusable hooks for your API services

import { useState, useEffect, useCallback } from 'react';
import type { ApiError } from '../types/Sample';

// ================================
// GENERIC API HOOK
// ================================

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
}

interface UseApiOptions {
  immediate?: boolean; // Whether to call the API immediately
  onSuccess?: (data: any) => void;
  onError?: (error: ApiError) => void;
}

/**
 * Generic hook for API calls with loading, error, and data state management
 * @param apiCall - Function that returns a Promise
 * @param options - Configuration options
 * @returns State and control functions
 */
export function useApi<T>(
  apiCall: () => Promise<any>,
  options: UseApiOptions = {}
) {
  const { immediate = false, onSuccess, onError } = options;
  
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await apiCall();
      const data = response.data || response;
      
      setState({ data, loading: false, error: null });
      onSuccess?.(data);
      
      return data;
    } catch (error) {
      const apiError = error as ApiError;
      setState(prev => ({ ...prev, loading: false, error: apiError }));
      onError?.(apiError);
      throw apiError;
    }
  }, [apiCall, onSuccess, onError]);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return {
    ...state,
    execute,
    reset,
  };
}

// ================================
// SPECIFIC API HOOKS
// ================================

/**
 * Hook for fetching a list of items with pagination and filters
 * @param fetchFunction - Function to fetch the list
 * @param initialFilters - Initial filter values
 * @returns State and control functions
 */
export function useList<T, F>(
  fetchFunction: (filters: F) => Promise<any>,
  initialFilters: F
) {
  const [filters, setFilters] = useState<F>(initialFilters);
  const [items, setItems] = useState<T[]>([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  });

  const { loading, error, execute } = useApi(
    () => fetchFunction(filters),
    {
      onSuccess: (response) => {
        setItems(response.data || []);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      },
    }
  );

  const updateFilters = useCallback((newFilters: Partial<F>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const refresh = useCallback(() => {
    execute();
  }, [execute]);

  useEffect(() => {
    execute();
  }, [filters]);

  return {
    items,
    pagination,
    filters,
    loading,
    error,
    updateFilters,
    refresh,
  };
}

/**
 * Hook for CRUD operations on a single item
 * @param fetchFunction - Function to fetch the item
 * @param updateFunction - Function to update the item
 * @param deleteFunction - Function to delete the item
 * @returns State and control functions
 */
export function useCrud<T>(
  fetchFunction: (id: string) => Promise<any>,
  updateFunction: (id: string, data: Partial<T>) => Promise<any>,
  deleteFunction: (id: string) => Promise<void>
) {
  const [item, setItem] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const fetch = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetchFunction(id);
      const data = response.data || response;
      setItem(data);
      return data;
    } catch (error) {
      const apiError = error as ApiError;
      setError(apiError);
      throw apiError;
    } finally {
      setLoading(false);
    }
  }, [fetchFunction]);

  const update = useCallback(async (id: string, data: Partial<T>) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await updateFunction(id, data);
      const updatedData = response.data || response;
      setItem(updatedData);
      return updatedData;
    } catch (error) {
      const apiError = error as ApiError;
      setError(apiError);
      throw apiError;
    } finally {
      setLoading(false);
    }
  }, [updateFunction]);

  const remove = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await deleteFunction(id);
      setItem(null);
    } catch (error) {
      const apiError = error as ApiError;
      setError(apiError);
      throw apiError;
    } finally {
      setLoading(false);
    }
  }, [deleteFunction]);

  return {
    item,
    loading,
    error,
    fetch,
    update,
    remove,
  };
}

// ================================
// AUTHENTICATION HOOKS
// ================================

/**
 * Hook for authentication state management
 * @returns Authentication state and functions
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        // You would call your AuthService.initializeAuth() here
        // const user = await AuthService.initializeAuth();
        // setUser(user);
      } catch (error) {
        setError(error as ApiError);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = useCallback(async (credentials: any) => {
    setLoading(true);
    setError(null);
    
    try {
      // You would call your AuthService.login() here
      // const response = await AuthService.login(credentials);
      // setUser(response.data.user);
      // return response;
    } catch (error) {
      const apiError = error as ApiError;
      setError(apiError);
      throw apiError;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    
    try {
      // You would call your AuthService.logout() here
      // await AuthService.logout();
      setUser(null);
    } catch (error) {
      // Even if logout fails, clear user state
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    user,
    loading,
    error,
    login,
    logout,
    isAuthenticated: !!user,
  };
}

// ================================
// FILE UPLOAD HOOK
// ================================

interface UseFileUploadOptions {
  onSuccess?: (response: any) => void;
  onError?: (error: ApiError) => void;
  onProgress?: (progress: number) => void;
}

/**
 * Hook for file upload with progress tracking
 * @param uploadFunction - Function to upload the file
 * @param options - Upload options
 * @returns Upload state and functions
 */
export function useFileUpload(
  uploadFunction: (file: File, onProgress?: (progress: number) => void) => Promise<any>,
  options: UseFileUploadOptions = {}
) {
  const { onSuccess, onError, onProgress } = options;
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<ApiError | null>(null);

  const upload = useCallback(async (file: File) => {
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const response = await uploadFunction(file, (progress) => {
        setProgress(progress);
        onProgress?.(progress);
      });

      onSuccess?.(response);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      setError(apiError);
      onError?.(apiError);
      throw apiError;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [uploadFunction, onSuccess, onError, onProgress]);

  const reset = useCallback(() => {
    setUploading(false);
    setProgress(0);
    setError(null);
  }, []);

  return {
    upload,
    uploading,
    progress,
    error,
    reset,
  };
}

// ================================
// DEBOUNCED SEARCH HOOK
// ================================

/**
 * Hook for debounced search functionality
 * @param searchFunction - Function to perform the search
 * @param delay - Debounce delay in milliseconds
 * @returns Search state and functions
 */
export function useDebouncedSearch<T>(
  searchFunction: (query: string) => Promise<any>,
  delay: number = 300
) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const debouncedSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await searchFunction(searchQuery);
        setResults(response.data || []);
      } catch (error) {
        const apiError = error as ApiError;
        setError(apiError);
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [searchFunction]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      debouncedSearch(query);
    }, delay);

    return () => clearTimeout(timer);
  }, [query, delay, debouncedSearch]);

  const updateQuery = useCallback((newQuery: string) => {
    setQuery(newQuery);
  }, []);

  const clear = useCallback(() => {
    setQuery('');
    setResults([]);
    setError(null);
  }, []);

  return {
    query,
    results,
    loading,
    error,
    updateQuery,
    clear,
  };
}

// ================================
// EXPORTS
// ================================

export default {
  useApi,
  useList,
  useCrud,
  useAuth,
  useFileUpload,
  useDebouncedSearch,
};