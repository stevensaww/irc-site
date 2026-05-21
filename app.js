/**
 * IRC — shared site logic.
 * Wires the homepage ticker, progress bar, milestone strip,
 * journey ribbon, and manifesto lock to a real database count.
 *
 * Backend: Supabase (free tier).
 *
 * This file exposes a single global: window.IRC
 *   - IRC.fetchCount()       -> Promise<number>
 *   - IRC.submitSignup(data) -> Promise<void>   (throws on failure)
 *   - IRC.startPolling(cb)   -> stop-fn         (calls cb(count) on tick)
 */
(function () {
  'use strict';

  // ============================================================
  // CONFIG — EDIT THESE THREE VALUES, NOTHING ELSE.
  // ============================================================
  const CONFIG = {
    // From your Supabase project: Settings → API
    SUPABASE_URL: 'https://mhyitvicvsbabkcxyzbq.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oeWl0dmljdnNiYWJrY3h5emJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNzg5MDgsImV4cCI6MjA5NDk1NDkwOH0.P2oC1TKUKF1NDoQDGwdkBsln3xA5Qziumg5g3t98KSE',

    // Displayed count = BASE_COUNT + real signups in the database.
    // Keep at 1438214 to preserve the launch-day visuals exactly.
    // Set to 0 if you'd rather show only real signups from day one.
    BASE_COUNT: 0,

    // How often the page re-fetches the live count (ms).
    // 30000 = every 30s. Lower feels more "live" but uses more API calls.
    POLL_INTERVAL_MS: 30000,
  };

  // ============================================================
  // INTERNAL — Supabase client (lazy init)
  // ============================================================
  let _client = null;
  function getClient() {
    if (_client) return _client;
    if (!window.supabase) return null;
    if (!CONFIG.SUPABASE_URL || CONFIG.SUPABASE_URL.indexOf('YOUR_') === 0) return null;
    if (!CONFIG.SUPABASE_ANON_KEY || CONFIG.SUPABASE_ANON_KEY.indexOf('YOUR_') === 0) return null;
    try {
      _client = window.supabase.createClient(
        CONFIG.SUPABASE_URL,
        CONFIG.SUPABASE_ANON_KEY,
        { auth: { persistSession: false } }
      );
    } catch (err) {
      console.warn('[IRC] Supabase init failed:', err);
    }
    return _client;
  }

  // ============================================================
  // PUBLIC API
  // ============================================================
  window.IRC = {
    config: CONFIG,

    /** Returns BASE_COUNT + real signups. Falls back to BASE_COUNT on error. */
    async fetchCount() {
      const client = getClient();
      if (!client) return CONFIG.BASE_COUNT;
      try {
        const { data, error } = await client.rpc('signup_count');
        if (error) throw error;
        return CONFIG.BASE_COUNT + (Number(data) || 0);
      } catch (err) {
        console.warn('[IRC] fetchCount failed:', err);
        return CONFIG.BASE_COUNT;
      }
    },

    /** Inserts a signup row and returns the auto-assigned row ID. */
    async submitSignup(payload) {
      const client = getClient();
      if (!client) throw new Error('Supabase not configured');
      const { data, error } = await client
        .from('signups')
        .insert([payload])
        .select('id')
        .single();
      if (error) throw error;
      return data ? data.id : null;
    },

    /**
     * Calls callback(count) immediately and on every poll tick.
     * Auto-pauses when the tab is hidden, resumes on return.
     * Returns a stop function.
     */
    startPolling(callback) {
      let timer = null;

      const tick = async () => {
        try {
          const count = await window.IRC.fetchCount();
          callback(count);
        } catch (err) {
          console.warn('[IRC] poll tick failed:', err);
        }
      };

      const start = () => {
        if (timer === null) {
          tick();
          timer = setInterval(tick, CONFIG.POLL_INTERVAL_MS);
        }
      };

      const stop = () => {
        if (timer !== null) {
          clearInterval(timer);
          timer = null;
        }
      };

      document.addEventListener('visibilitychange', () => {
        if (document.hidden) stop(); else start();
      });

      start();
      return stop;
    },
  };
})();
