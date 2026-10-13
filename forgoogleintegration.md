It takes about 15 minutes, all at console.cloud.google.com. Use the Google account that should own the store's settings (ideally a business account rather than a personal one).

1. Create a project
   Open https://console.cloud.google.com and sign in.
   Click the project picker in the top bar, then New project.
   Name it Nevan, click Create, and make sure it's selected in the top bar.
2. Set up the consent screen
   Open the ☰ menu → APIs & Services → OAuth consent screen. You can also search "Google Auth Platform". Click Get started.
   App information: App name Nevan, plus a support email. Click Next.
   Audience: choose External. Click Next.
   Contact information: your email. Click Next.
   Tick the policy agreement, then Continue → Create.
   Open Branding in the left menu and fill in:
   App home page: https://nevanhandicraft.com.np
   Privacy policy: https://nevanhandicraft.com.np/privacy
   Terms of service: https://nevanhandicraft.com.np/terms
   Authorized domains: nevanhandicraft.com.np
   Skip the logo, which would trigger the brand review. Click Save.
   Data access: nothing to do. openid, email and profile are included by default.
   Audience → Test users → Add users: add your own Gmail for testing.
3. Create the clients (Clients → Create client)
   Web (needed for the website and the mobile app):
   Application type: Web application. Name: Nevan website.
   Authorized JavaScript origins: add all four:
   https://nevanhandicraft.com.np
   https://www.nevanhandicraft.com.np
   http://localhost:5173
   http://localhost
   Leave Authorized redirect URIs empty; this sign-in method doesn't use them.
   Click Create and copy the Client ID. You don't need the client secret.
   Android:
   Application type: Android. Package name: com.nevanhandicraft.app.
   SHA-1 fingerprint: run cd mobile && eas credentials, choose Android and your build profile, and copy the SHA1 Fingerprint of the keystore.
   Click Create. You don't need to copy anything from this one; it just has to exist.
   If you later publish on the Play Store with Play App Signing, create a second Android client with the SHA-1 shown in Play Console → App integrity.
   iOS (only if you ship to iPhone): Application type iOS, Bundle ID com.nevanhandicraft.app. Click Create and copy its Client ID.
   Changes to origins can take from a few minutes to a few hours to take effect.

4. Put the IDs in the project
   Where Variable Value
   backend/.env GOOGLE_CLIENT_IDS web ID, Android ID, iOS ID (comma-separated)
   frontend/.env.development.local and frontend/.env.production VITE_GOOGLE_CLIENT_ID web ID
   mobile/.env.local EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID web ID
   mobile/.env.local EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID iOS ID (if any)
   For app builds: add the two mobile variables on expo.dev → your project → Environment variables.
   Live backend: cPanel → Setup Node.js App → Environment variables → add GOOGLE_CLIENT_IDS, then restart the app.
   Client IDs aren't secret, so committing them in .env.production is fine. Restart the dev servers afterwards, because Vite only reads env files at startup.

5. Test, then go live
   Start both dev servers and open http://localhost:5173/login. The Google button should appear; sign in with your test-user account.
   When it works, go to Audience → Publish app → Confirm. Until you do, only the test users can sign in; everyone else sees "access blocked".
   Google's own explanation of the consent screen pages is on this Cloud help page. I can also save this guide as .agent/workflows/setup-google-signin.md next to your deploy guides.

Sources:

Google Cloud Help: Manage OAuth app branding / Google Auth Platform
Auth0: Google social connection setup
WorkOS: Google OAuth integration
