# Live client account verification — 18 October 2026

The user explicitly authorized one temporary production QA identity and its subsequent deletion. The test ran against `https://www.mindbanger.com`, using only the verified Mindbanger Supabase project. No existing client identity, subscription, booking or recording was modified.

## Passed

- The login form submitted a code to the real Supabase OTP verifier and obtained a genuine browser session.
- A new account reached the consent/profile completion screen and returned to the originally requested products URL.
- Overview, services, reservations, products, profile and personal materials pages loaded successfully as the signed-in client, without Daily.
- Profile changes persisted after a full page reload.
- An attempt to submit an administrator role through the profile API returned 400; the administrator API rejected the ordinary client. The stored role and membership were unchanged.
- The actual signed-in dashboard rendered at 1366, 1920 and 390 pixels without horizontal overflow.
- Opening the coming-soon product, reloading it and returning to products preserved the signed-in session.
- Logout removed browser access: the account redirected to login and the profile API returned 401.
- The temporary Auth identity, profile and consent were deleted and their absence verified.

## Boundaries and cleanup

Only email delivery was substituted in the isolated test browser: the test address used the reserved `.invalid` domain, and the OTP was generated through the Auth admin API. The code verification, browser cookies, server authorization, profile writes and database rules were real production operations. No OTP, access token or real-client data was included in screenshots or the report. Delivery to a real mailbox was not tested. Payments, lessons and booking creation are intentionally disabled and were not activated for QA. The materials page was verified in its empty state; no recording was uploaded.

The legacy `profiles.id` foreign key has no cascading delete. Cleanup therefore removed the exact synthetic profile before deleting its Auth identity. This required no schema change and did not exercise the legacy account-deletion API. Browser logout occurred before the final successful cleanup.

Post-cleanup aggregate checks: 9 profiles, 3 subscription records, 0 appointments, 0 temporary QA identities. No test account or consent remains.
