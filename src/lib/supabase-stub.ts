/**
 * Supabase Stub
 * Provides a dummy supabase object to prevent errors in legacy code
 * All operations will return errors directing users to migrate to API client
 */

const createStubSupabase = () => {
  const stubError = () => ({
    data: null,
    error: { message: "Supabase is disabled. Please use apiClient for API calls." }
  });

  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: stubError,
          single: stubError,
        }),
        single: stubError,
      }),
      insert: stubError,
      update: stubError,
      delete: stubError,
    }),
    storage: {
      from: () => ({
        upload: stubError,
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
        remove: stubError,
      }),
    },
  };
};

// Create global supabase stub
if (typeof window !== 'undefined') {
  (window as any).supabase = createStubSupabase();
}

export const supabase = createStubSupabase();
