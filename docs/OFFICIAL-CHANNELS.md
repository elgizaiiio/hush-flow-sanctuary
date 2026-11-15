# Official messaging channels — 2026-11-15

## Implemented
- Dedicated `CEYO_TELEGRAM_CHANNEL_TOKEN` and X Chat credentials saved in the connected **external Supabase Vault**, not Lovable Cloud. Values are neither in migrations nor source. Existing operator Telegram token was not replaced.
- Telegram `getMe` verified `@Cayoagent`; X `GET /2/users/me` verified `@Ceyobot` and the supplied bot ID. No private messages sent in these probes.
- `my_telegram_link` in app chat creates a 10-minute, one-use link for the current user and bot. Pressing Start consumes the hashed pairing in one transaction. Different-owner identity replacement is rejected.
- `/api/public/channels/telegram` checks its dedicated derived header secret, validates input and ignores groups and bot senders. Verified private senders resolve to one user/bot; messages persist in an owner-scoped Telegram conversation.
- Conversations use the existing CoArena routing/Cerebras fallback and owner-bound usage charging. User memories are loaded only for the verified identity. Built-in browser/computer execution is available; caller-session-dependent workspace integrations and approval cards remain in the app. This is **not** full integration parity.
- Persisted receipts prevent repeat model execution on delivery retries. A processing collision returns 503. Interrupted runs/ambiguous sends become `needs_review`, not automatic side-effect retries. A hard runtime crash still requires operator receipt review; this is not a durable background queue.

## Deployment / Telegram registration
The handler must first be deployed to an HTTPS public host. Register `/api/public/channels/telegram` with `setWebhook`, passing the matching `webhookSecret(token)` as `secret_token` and `allowed_updates: ["message"]`. Do not log credentials or request URLs. Verify `getWebhookInfo`, then open a real signed-in app pairing link and test receipt → saved user message → agent reply → Telegram delivery → app history readback. Registration and this full round trip were **not performed in this pass**.

## X Chat: concrete blocker
X Chat is encrypted, unlike legacy DM endpoints. The bot token is valid, but `CEYO_XCHAT_CONSUMER_SECRET` is missing. Official webhook CRC and POST HMAC verification require the X app consumer secret. The PIN/key version/fingerprint were saved as requested, but are not interchangeable with the consumer secret or a private-key export. Never turn verification off or reset/register new keys over an existing identity.

Use the published Chat XDK lifecycle / XChat adapter rather than inventing encrypted REST payloads. Server SDK packages include WASM/native or filesystem initialization; verify edge bundling before selecting one, or operate the official persistent bot example on a compatible service. No unsupported Node-only adapter was added to the app. X transport is **not implemented or activated** yet.

References:
- https://github.com/xdevplatform/chat-xdk
- https://github.com/xdevplatform/xchat-agent-skeleton
- https://chat-sdk.dev/adapters/official/xchat

## Instagram / Facebook / WhatsApp
Not connected yet. Instagram requires the owned professional account and the matching Meta messaging authorization; Messenger requires the owned Facebook Page. WhatsApp requires the owned number's business setup and verification; it is not automatically free in every messaging scenario. None of these credentials/accounts were supplied in this pass. No automatic account creation, browser-login workaround or access to unrelated accounts is implemented.

## Security / verification
New tables have explicit grants and RLS; pairings/deliveries have service-role-only policies. Credential read/store and pairing consumption RPCs are service-role-only. New migration warnings resolved; pre-existing backend warnings remain outside this change. Keys supplied in chat should be rotated by their issuers, then securely replaced in Vault.