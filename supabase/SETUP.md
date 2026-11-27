# Setting up accounts + sync (Supabase)

About 15 minutes, one time. Until this is done, the app works exactly as before
(everything stays on each device) and the account button is hidden.

## 1. Make the project
1. Go to **supabase.com** and sign up (signing in with GitHub is easiest).
2. **New project**
   - Name: `jujutsu-flow`
   - Database password: let it generate one and save it in your password manager. You won't need to give it to anyone.
   - Region: the one closest to you.
3. Wait a minute or two while it builds.

## 2. Create the table and the locks
1. Left sidebar → **SQL Editor** → **New query**.
2. Paste everything from `supabase/schema.sql` → **Run**. You should see "Success. No rows returned".
3. New query again → paste `supabase/security-test.sql` → **Run**.
   **Every row must say PASS.** If any says FAIL, stop and ask Claude before going further.

## 3. Make the email send a code (not a link)
On iPhone, a sign-in *link* opens Safari instead of your home-screen app, so the app uses a 6-digit *code* instead.
1. Left sidebar → **Authentication** → **Emails** (or "Email Templates").
2. Open **Magic Link**. Replace the message with:
   ```html
   <h2>Your Jujutsu Flow sign-in code</h2>
   <p style="font-size:28px;letter-spacing:4px"><b>{{ .Token }}</b></p>
   <p>Type this code into the app. If you didn't ask for it, ignore this email.</p>
   ```
   Subject: `Your Jujutsu Flow code`. Save.
3. Do the same for **Confirm signup** (first-time sign-ins use that one).
4. **Authentication → URL Configuration → Site URL**: set it to the app's address,
   e.g. `https://solonanderson8-create.github.io/jujutsu-app/`.

## 4. Give Claude the two public values
**Project Settings → API Keys** (older layout: Settings → API):
- **Project URL**, like `https://abcdefghijklmnop.supabase.co`
- The **publishable** key (`sb_publishable_…`), or under "Legacy API keys", the **anon public** key.

These two are meant to be public. They go in `js/config.js`.

**Never share the `secret` / `service_role` key**, not with Claude, not in the code, not anywhere.
It's a master key that skips every lock.

## Good to know
- **Email limits:** Supabase's built-in email sender only sends a few emails per hour. That's fine for you and a few
  friends testing. Before inviting a whole gym, set up a custom email sender
  (Authentication → Emails → SMTP), e.g. with Resend.
- **Free projects pause** after about a week with no activity. Opening the dashboard and pressing "Restore" wakes it up.
  Notes stay safe on each device in the meantime and sync once it's back.
- **You can see everyone's data** in the dashboard (Table Editor), because you're the admin. The privacy page says so
  honestly. Don't browse people's journals.
