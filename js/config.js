/*
 * SETTINGS FOR ACCOUNTS + SYNC
 *
 * Both values come from Supabase: Project Settings → API.
 * The "anon public" key is MEANT to be public (it's in every visitor's
 * browser anyway). What keeps data private is row-level security in the
 * database (supabase/schema.sql), not hiding this key.
 *
 * NEVER put the "service_role" key here or anywhere in this project: that one
 * is a master key that skips all the locks.
 *
 * While these are empty, the app works exactly as before (everything stays
 * on the device) and the account button is hidden.
 */
window.JJ = window.JJ || {};
JJ.config = {
  supabaseUrl: '',        // e.g. 'https://abcdefghijklmnop.supabase.co'
  supabaseAnonKey: '',    // the long "anon public" key
};
