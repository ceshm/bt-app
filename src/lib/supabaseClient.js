import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Global Notes
export const getGlobalNotes = () => {
    return supabase
        .from('global_notes')
        .select('*')
        .order('created_at', { ascending: false });
};

export const addGlobalNote = () => {
    return supabase
        .from('global_notes')
        .insert([{ title: '', body: '' }])
        .select();
};

export const updateGlobalNote = (noteId, updates) => {
    return supabase
        .from('global_notes')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', noteId);
};

export const deleteGlobalNote = (noteId) => {
    return supabase
        .from('global_notes')
        .delete()
        .eq('id', noteId);
};
