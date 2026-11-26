---
name: game-server
description: Fastify + ws authoritative gateway in apps/game-server. Load when changing connection lifecycle, auth, rate limits, session takeover, or the HTTP surface.
triggers:
  - "gateway"
  - "websocket handshake"
  - "heartbeat"
  - "reconnect token"
  - "rate limit"
  - "dev auth"
  - "healthz"
edges:
  - target: context/packages.md
    condition: when changing which protocol schema or close code the gateway uses
  - target: context/architecture.md
    condition: when a change affects the client/server flow
  - target: context/setup.md
    condition: when a change requires new environment variables
  - target: patterns/debug-connection.md
    condition: when diagnosing a rejected handshake or dropped socket
grounds_to: []
last_updated: 2026-11-25
mex:
  id: mx_01M88SYZDE4PCAB6J2BT60K8N2
  type: component
  status: promoted
  revision: 5
  title: game-server
  relations:
    - type: related_to
      target: mx_01M88SV6KFDDEH3R3W2YEVSD0V
      note: when changing which protocol schema or close code the gateway uses
    - type: related_to
      target: mx_01M88NM5EH1VCT3WG3WSSD1EFQ
      note: when a change affects the client/server flow
    - type: related_to
      target: mx_01M88NM5F9RS36QYX0CCNTAZEY
      note: when a change requires new environment variables
    - type: related_to
      target: mx_01M88T5MCXQE8S9Y57N1EBKHX4
      note: when diagnosing a rejected handshake or dropped socket
---

# Game Server

`apps/game-server` is the authoritative process. `apps/game-server/src/main.ts` loads the
repository-root `.env` and calls `buildServer`, which validates configuration
with Zod, creates the Fastify app and verifier, attaches `GameGateway` to the
same HTTP server, and registers `/healthz`, `/readyz`, `/metrics`, and the
development-only `/auth/dev`. The gateway owns all WebSocket lifecycle: the
`/ws` upgrade and origin check, a hello deadline, token verification, rate
limits, monotonic sequence checks, session registration and takeover, reconnect
tokens, and heartbeat eviction. `GameSession` wraps one socket with its outbound
sequence and limiter; `SessionRegistry` and `ReconnectTokenStore` keep state in
memory. Nothing here persists across a restart.

<!-- mex:entity
id: mx_01M88SYZCKMJBQCAWAEP96HBZ6
type: fact
status: promoted
revision: 1
metadata:
  aliases:
    - server refuses to boot
    - heartbeat misconfigured
    - dev auth in production
    - missing verifier
relations:
  - type: refines
    target: mx_01M88SYZDE4PCAB6J2BT60K8N2
    note: Part of game-server in context/game-server.md
provenance:
  createdBy:
    kind: agent
    id: opencode
  createdAt: 2026-11-25T12:10:00Z
grounds_to:
  - file: apps/game-server/src/env.ts
    node: function:b8cbf95d914c336967b616963b431f35
    fingerprint: mh2:64:UABxdJcKdeezAh4RSQggJE0GNSOlCzp99wApasED_LYIATr0BQoXczoOrfZRDU8noAJnjHwCgW2qAYIj6gGLhwkIJTWHBgPUaQebT0wFER5SBdaGmwGYjukAaQhlBA3j-AK_KbMBlgG9AN-E5QOxtzkVIu0bAJ2HJAQtqqYAt-4FAQv2CQBqkcQCgIw8A1WftwBG88UFNsm9AMzm6gTPfwwGR6d-AxF0TAh9c8MBQaTsDMdfBQQiX3EF6PD8AnuhVAAVPRMFMSkZAJfQnQLDxH4AC9QzARZuGA2Cb5ADPPlfArUCVQIs9SkNmDlQBBvS6hHI3lIIQgl2BxdHCwnTs2cBCGNvbnN0YW50AQBSBVypiibzrFRimsDrhCJT
    bodyHash: 9f53ebf18cbee6b3f51dfd20d9716d9fbb40f2a3510fb08f8067b6ad3155bb88
-->
## Environment validation enforces lifecycle and auth invariants

loadEnv requires DEAD_TIMEOUT_MS to exceed HEARTBEAT_INTERVAL_MS, forbids DEV_AUTH_ENABLED in production, requires at least one verifier (Supabase secret/JWKS or dev secret), and requires SERVER_ID in production; loadEnv throws a combined error listing every issue.

<!-- mex:entity
id: mx_01M88SYZE66WQTV69TFAG1EV1Y
type: fact
status: promoted
revision: 1
metadata:
  aliases:
    - hello timeout
    - stuck authenticating
    - idle socket cleanup
relations:
  - type: refines
    target: mx_01M88SYZDE4PCAB6J2BT60K8N2
    note: Part of game-server in context/game-server.md
provenance:
  createdBy:
    kind: agent
    id: opencode
  createdAt: 2026-11-25T12:10:01Z
grounds_to:
  - file: apps/game-server/src/gateway.ts
    node: method:ceb8da159ffe8d1abb6725dd4b0c77c3
    fingerprint: mh2:64:sAIBXf0qALyHnAh-Ru4CH-gZBItrdwDnEEoBLFXHAj-X7gE69AUA0sMpBKFazwSlQKsCZ4x8AMhR-AGCI-oEDNu5ATPfhwAgc74BWlj7AOTjxQCXZocBXvgnAMqHOAGgGDEBy0pbAZYBvQDfhOUA7ihqA8jfCARpQbkBYtnJBfTG4gABzpABHjuUANkxxwApzOsARvPFAPEE2wHIfpkAuLsYAiZbEgHeY0AAUK6BAKIoqAEqw58BrHGYAI-0KgBKYUoD1oIKAtmE_ADj_1gAiAOxAAvUMwG5UNQC95iZADSfGwAAzfACLPUpAO39IACg9LIAND8yAQQ1LgVRqIkBqrDIAghmdW5jdGlvbghwcm9wZXJ0eQIA2Hp5HkSqQ00-uim6mun29wHrlGxLtQz1Jm-zBYePpCiL
    bodyHash: eb13eedc4a8736d2431a9f0ba15c16db656ba3ff5c6e115fb6f3e90e2e7ef19d
-->
## Unauthenticated sockets are closed by a hello deadline

GameGateway.handleConnection starts an unref'd timer of helloTimeoutMs for each socket; if the state is still awaiting_hello or authenticating it emits HELLO_TIMEOUT and closes with 4000, while ready or closing sockets are left alone.

<!-- mex:entity
id: mx_01M88SYZEK7BESXCV3C0F87PG3
type: fact
status: promoted
revision: 1
metadata:
  aliases:
    - websocket 403
    - wrong upgrade path
    - origin rejected
relations:
  - type: refines
    target: mx_01M88SYZDE4PCAB6J2BT60K8N2
    note: Part of game-server in context/game-server.md
provenance:
  createdBy:
    kind: agent
    id: opencode
  createdAt: 2026-11-25T12:10:02Z
grounds_to:
  - file: apps/game-server/src/gateway.ts
    node: method:3eb0d170ccf5a43e344f4b71af933fa9
    fingerprint: mh2:64:vwEAE1uhALyHnAX2oMUCH-gZAWcg1AIgFYUAJDp1AoVtYwWKlKgDtiAhAML3XAHE7MUCZ4x8AoFtqgGCI-oDjp1WAp5NAgAgc74EHrDpAhN6xAMSjfcEZcv0AGkIZQImgkIDHeqvAZYBvQDfhOUAafR2AtZWjAfNCvcAKLF1BG2VfQEL9gkGKjayAUkVewDQuPUCJZTSAizNNwPGtW0BfwoKAutZFgDuBMQBoTWWAUGk7AF77zoC0tWsBejw_ABRaE0GqeqOAgfy9wCX0J0Cw8R-AAvUMwKoClwC95iZAL4rrgAAzfAAz2VpBXWfhgCg9LIFvmcQANlHQAJJi6kA_VCtAAA
    bodyHash: e981f3d9860dae89a38c672254f22ffbd78a994489004c77ae5b0d3f402e302b
-->
## Upgrades are limited to /ws and an optional origin allowlist

GameGateway.handleUpgrade answers any path other than /ws with a raw 404 before delegating to ws; when allowedOrigins is non-empty, a missing or unlisted Origin header gets a raw 403 and the socket is destroyed.

<!-- mex:entity
id: mx_01M88SYZEX7PW6HMV2SP8BERJT
type: fact
status: promoted
revision: 1
metadata:
  aliases:
    - message dropped
    - oversized payload
    - duplicate sequence
    - rate limited client
relations:
  - type: refines
    target: mx_01M88SYZDE4PCAB6J2BT60K8N2
    note: Part of game-server in context/game-server.md
provenance:
  createdBy:
    kind: agent
    id: opencode
  createdAt: 2026-11-25T12:10:03Z
grounds_to:
  - file: apps/game-server/src/gateway.ts
    node: method:ee3a61c7671ede736b9f7a5f5be14c81
    fingerprint: mh2:64:-QQAE1uhALyHnABgcCoA_JL0AWQOxgIgFYUAyje8AGfruwE69AUDtiAhAML3XADC4o0CZ4x8AA8gZwGCI-oBH6SqAaSi3AAgc74AqnpzAEGM3ACXZocBghLpAARougE9mikBMHhqAZYBvQEfgsMA7ihqAtZWjAfNCvcAKLF1A1dy1wABzpABxPKBANkxxwDQuPUARvPFARU5FQPDpjYAzO4SAiZbEgMRdEwBoTWWAS-iGwFIYXsAkQlIAI-0KgIh2i8An4gCAJF_QQCX0J0AY83bAdRk1wCvrvkC95iZAHmUpAAAzfAAknuOAO39IACg9LIAVpWwANlHQABCR08A_VCtAghmdW5jdGlvbgZtZXRob2QIAFx56kb7sJbjaKXDbLBfaakBHHL7p9L1t90BKCNUKGr9QAEgeF4xnIyV5Ddo05ZuXX3rAaDlQLZy6gDeSjxmcM9HEUEBrgGVpUnFAcUfikfGIxDfewG40RPwP_1Y7vYE5PMuL2SSAfMx89qQTwLQ3J0StFcMn8cB_x8Igt_mFl9-GMi_poadDw
    bodyHash: e1479ce6e05ce45d0f2c73dd5546b7111d7681c11b717b963b8861231cf948fd
  - file: apps/game-server/src/session.ts
    node: method:1c72fba7d2f5b7dd01282354286afd40
    fingerprint: mh2:64:IAFd_SoKiTFBAbHqtxY4lJsOeWkrCzp99wKiLRIS49rkATr0BRjNATYN04nJDkPyVAJnjHwBp7HYAYIj6hPo8JcFfVWfBwMG8QS1AhgIcYZdB_i9RQ1ymTMBwxywAFzCQQc4OLMB9u9VBndgTQtMs_0W85-1E2IajwafLBYEpHuPEwUwERoywhACgIw8AOl85ABG88UKZvtLArYREAKFixgGR6d-AxF0TA4FricC8WrkAXvvOgGscZgC2kH8Fu2l0QOO5zsEGXHPBesBnwO3faIDK7dGBQEaIxPh43YDPPlfBAy1LwIs9SkA7f0gB-2bMgBWlbABt_lWC8X1BwjNM8EBBm1ldGhvZAEA7jphx2ce3nNrn3pfW-FMgQ
    bodyHash: a4d6395a660ec5774f3cca56259e0b5192f365e27b267394e62613804f8efb52
  - file: apps/game-server/src/rate-limit.ts
    node: method:79cfd418504305d3285331315e371bea
    fingerprint: mh2:64:VAg--GMDPAiiAbHqtwLugyUGNSOlCyvrSwKiLRICP5fuATr0BQDS66QEXM2VA9qzHQNHXZQALg7xAFO_Vwa8JRcCd0EvAOacIQIrgusAN0uuA5uK7QGYjukBwxywAmzfagMgukkFp3EeBndgTQAj8F0DyN8IB4ntYwVdNIcCFjaTAAHOkAKk4sUCgIw8ANC49QBG88UDkPKpA8a1bQKFixgFO9NvApks5whbnvsK5b3hAXvvOgG8zOUBEaJbAPm9CgRCQwMJ1KFcAJfQnQO3faINz_UCBQEaIwV0oAUDPPlfBAy1LwI1ixQCB9O9BOaYpQJNJysMS4nACWQ2xQUWoHcBBm1ldGhvZAEA_x8Igt_mFl9-GMi_poadDw
    bodyHash: 5dfd39ab5617dd3a8a3cba3592e1fc11830a9bb47b995b709e60b7641f8b5e16
-->
## Inbound messages pass size, version, schema, sequence and rate gates

GameGateway.onMessage rejects payloads over maxPayloadBytes with 1009, binary frames with 1003, malformed JSON with 1002, a v other than PROTOCOL_VERSION with 4004 and schema failures with 4009; a ready session then requires an increasing cs and a token-bucket slot before the message is accepted.

<!-- mex:entity
id: mx_01M88SYZFAJVVPZ2XQCEWPCK0R
type: fact
status: promoted
revision: 1
metadata:
  aliases:
    - duplicate session takeover
    - wrong server id
    - reconnect rejected
    - welcome handshake
relations:
  - type: refines
    target: mx_01M88SYZDE4PCAB6J2BT60K8N2
    note: Part of game-server in context/game-server.md
provenance:
  createdBy:
    kind: agent
    id: opencode
  createdAt: 2026-11-25T12:10:04Z
grounds_to:
  - file: apps/game-server/src/gateway.ts
    node: method:20785e319c8c95e43768d3966e5d7deb
    fingerprint: mh2:64:lQQAcXSXALyHnACTmQYAipmZAWcg1AEwJWIAJDp1AGjiDQE69AUA0sMpAML3XAAYbBECZ4x8AA8gZwGCI-oEiwEWATOW-AAgc74B5C6GAgKuogJdvHQBXvgnAARougGgGDEBy0pbAZYBvQI6FEkAI_BdA8jfCAkJ5dIELaqmAW7e6QABzpABTpv9ANkxxwNVn7cARvPFAJa92wG9QL0ChYsYAiZbEgMRdEwBoTWWAUGk7AF77zoBrHGYAFqoZABKYUoA97WwApsdXgCX0J0AY83bAfygMAEWbhgC__YHAHmUpAAAzfACLPUpAO39IAA_gVQAVpWwANlHQAHwk0cCsFYoAQZtZXRob2QKACihnklGhfNQ3UG3glVDFEMAXaEmrKzcQkPeHcrRuclOQQBfG0zo7DlEfmNx9VqGhU3AAH_J9G0ybuSR9JJ2H3p2AwEAkHPRfXPmfi4s6RP1gVnb5QCg5UC2cuoA3ko8ZnDPRxFBAKPm3JmycZP6W7MNhaOdLN4ArgGVpUnFAcUfikfGIxDfewDuOmHHZx7ec2ufel9b4UyBAPMx89qQTwLQ3J0StFcMn8c
    bodyHash: 3bf5c106967ee3004592648aaa60ec22c3391d02d46daf3cbeaf58fe62d63da5
  - file: apps/game-server/src/session.ts
    node: method:a3e6dc99b27193fa5bb30d85a39d2cde
    fingerprint: mh2:64:QwBxdJcFwUNZAH58sAIf6BkHg650AROMHQSxfNoJU-koCAtQtwDSwykIt36oBTtDjgyAiDoJeGOkAYIj6gQxmzoIgn_dAeHZKwOiAkcAN0uuCGYjJQcpiZwAaQhlAeIdvAYZ3ioFUi0RCUyc4wSO-7AEcQD5BRiP2AQtqqYKHSgiAAHOkAEeO5QCgIw8ACnM6wHJdDgB3lgPA8a1bQC4uxgGz2x_ALYQUwBQroEAoiioASrDnwEcBmoAj149AEphSgGf9bQHeV2AAJfQnQLDxH4B_KAwD7JxHQL3mJkGRt-nAADN8AKLJHoCB9O9A-XZQwHLbWoBBDUuBVGoiQHyweUCCGZ1bmN0aW9uBm1ldGhvZAMAW6ETzRpCSFg6WyIO9imWaQEgeF4xnIyV5Ddo05ZuXX3rAaTImYUaHK_--nQVd8LOwdA
    bodyHash: 376a0ba33b6b2444afc761e522e5a69637bf08f09c35ad79c8dd2fcd54ca584c
-->
## Hello binds the socket to a verified identity and one character

GameGateway.handleHello rejects a mismatched serverId with 4002, verifies the token, optionally consumes a valid reconnect token, closes any existing socket for the same character with 4003, creates a GameSession, then sends welcome with a freshly issued reconnect token.

<!-- mex:entity
id: mx_01M88SYZFPFW4H2Q364H69MTFT
type: fact
status: promoted
revision: 1
metadata:
  aliases:
    - token replay
    - reconnect expired
    - stolen token
    - single-use grant
relations:
  - type: refines
    target: mx_01M88SYZDE4PCAB6J2BT60K8N2
    note: Part of game-server in context/game-server.md
provenance:
  createdBy:
    kind: agent
    id: opencode
  createdAt: 2026-11-25T12:10:05Z
grounds_to:
  - file: apps/game-server/src/session.ts
    node: method:a3e6dc99b27193fa5bb30d85a39d2cde
    fingerprint: mh2:64:QwBxdJcFwUNZAH58sAIf6BkHg650AROMHQSxfNoJU-koCAtQtwDSwykIt36oBTtDjgyAiDoJeGOkAYIj6gQxmzoIgn_dAeHZKwOiAkcAN0uuCGYjJQcpiZwAaQhlAeIdvAYZ3ioFUi0RCUyc4wSO-7AEcQD5BRiP2AQtqqYKHSgiAAHOkAEeO5QCgIw8ACnM6wHJdDgB3lgPA8a1bQC4uxgGz2x_ALYQUwBQroEAoiioASrDnwEcBmoAj149AEphSgGf9bQHeV2AAJfQnQLDxH4B_KAwD7JxHQL3mJkGRt-nAADN8AKLJHoCB9O9A-XZQwHLbWoBBDUuBVGoiQHyweUCCGZ1bmN0aW9uBm1ldGhvZAMAW6ETzRpCSFg6WyIO9imWaQEgeF4xnIyV5Ddo05ZuXX3rAaTImYUaHK_--nQVd8LOwdA
    bodyHash: 376a0ba33b6b2444afc761e522e5a69637bf08f09c35ad79c8dd2fcd54ca584c
  - file: apps/game-server/src/session.ts
    node: method:9073d17d73e67e2e2ce913f58159dbe5
    fingerprint: mh2:64:WABxdJcJjMdgAbHqtwaz5ZQD5oVeAgzCfwKiLRIEo807A2qLuQWb8k4Jq09kCOOZvAJnjHwADyBnAYIj6gRY-OsH9PzFBJkDwgOiAkcIcYZdBWw-4QGYjukBwxywAFzCQQJgbXMB9u9VEP96twD8i-ABlZmnDcWqPwQtqqYDV3LXA7zJYgHC5KwCgIw8A1WftwQtx94B3lgPA8a1bQKFixgGR6d-AO4ExAkBKxQBQaTsAXvvOgGscZgF6PD8AnuhVAOO5zsFMSkZAJfQnQLDxH4DK7dGBJODvQL3mJkAviuuAADN8AIs9SkA7f0gAeV_pgBWlbABt_lWBVGoiQVXppwCCGZ1bmN0aW9uBm1ldGhvZAMAW6ETzRpCSFg6WyIO9imWaQEgeF4xnIyV5Ddo05ZuXX3rAaTImYUaHK_--nQVd8LOwdA
    bodyHash: 573170186e368d116d3864db7a1024e467b447aacaed018818302b62edb6a0c7
-->
## Reconnect grants are hashed, single-use and identity-bound

ReconnectTokenStore.issue creates 32 random bytes as base64url and stores only a SHA-256 key with an expiry of now plus ttlMs; consume deletes the grant only when it is unexpired and both playerId and characterId match, so replay or identity mismatch fails.

<!-- mex:entity
id: mx_01M88SYZG6GZSF992978A9VGT9
type: fact
status: promoted
revision: 1
metadata:
  aliases:
    - heartbeat timeout
    - dead session eviction
    - stale connection dropped
relations:
  - type: refines
    target: mx_01M88SYZDE4PCAB6J2BT60K8N2
    note: Part of game-server in context/game-server.md
provenance:
  createdBy:
    kind: agent
    id: opencode
  createdAt: 2026-11-25T12:10:06Z
grounds_to:
  - file: apps/game-server/src/gateway.ts
    node: method:544ada2f9d74b8244cb1a5f782ce6715
    fingerprint: mh2:64:Ywg--GMAvIecC5pW6wD8kvQAFlZ3CMq0TwL4i_8CP5fuA2qLuQ_163YJh9rmBtVtCAJnjHwByaDJAaXnuwSLARYBAXIdA2-SDwQubvoGh-UOApfehgiAwGsA4iHyAeIdvAMgukkAp-0vBM5R3Q44sZMC1laMBldjgwAosXUEDVrIAAHOkALzoOQA2THHANC49QQtx94FARtfCatd1QKFixgCJlsSBrH_LweXFWsCEyAxAXvvOgPSuFwBH29QAnuhVAPWggoC2YT8AJfQnQa4n1sB_KAwAnWIMgL3mJkCEhu_CD60rwIs9SkCB9O9AKD0sgE7TWUBmdS1AkmLqQlTBAgDCGZ1bmN0aW9uBm1ldGhvZAhwcm9wZXJ0eQQA5PWiKMQJUEaJzh__R_q--gGg5UC2cuoA3ko8ZnDPRxFBAa4BlaVJxQHFH4pHxiMQ33sC65RsS7UM9SZvswWHj6Qoiw
    bodyHash: 73ef3b4ec206ce25ec763dd20423f4df236578b3eae280e5567f56a3080c57fc
  - file: apps/game-server/src/session.ts
    node: method:b8d113f03ffd58eef604e4f32e2f6492
    fingerprint: mh2:64:ESD1BsksT-JvC5pW6x-U_NUu_8QxCl1dOgb_VfVHFJa1ATr0BRvIiZcMRc8_COOZvA_Ns4IHYlhrAaXnuxfYPpIlAfzWNDi0pDEMcrgfkzBNE8QdJgkufq03TaKzDuWpCBm9LDsLz75cBU_WUC0hoiYLSF_BDcWqPwVdNIc4qkoYBlNE1AccopIv_DYYCAf-NQBG88UR7DcVDLwlfAKFixglRBHnBhcipAkBKxQCEyAxAXvvOhQ3mSwLT8dbB7he4Rv7OsUC2YT8B23VOAa4n1sJiwcBAnWIMgL3mJkDPPlfDM-6ngJs16MCB9O9AV2fgwsppq4MXfoMBVGoiTMoaLEBBm1ldGhvZAEA7jphx2ce3nNrn3pfW-FMgQ
    bodyHash: aa80570d7cfc5e29a7638cadae2f340d179142caf77da8508a70e505169db53b
-->
## Heartbeat eviction runs from a server-side sweep

GameGateway.sweep runs on an unref'd interval and closes ready sessions whose lastSeenAt is older than deadTimeoutMs, emitting SESSION_TIMEOUT and close code 4007; only accepted messages call GameSession.touch to refresh that timestamp.

<!-- mex:entity
id: mx_01M88SYZGMQA6BDC7EVR4MNJVF
type: fact
status: promoted
revision: 1
metadata:
  aliases:
    - server sequence gap
    - dropped welcome
    - ordered server frames
relations:
  - type: refines
    target: mx_01M88SYZDE4PCAB6J2BT60K8N2
    note: Part of game-server in context/game-server.md
provenance:
  createdBy:
    kind: agent
    id: opencode
  createdAt: 2026-11-25T12:10:07Z
grounds_to:
  - file: apps/game-server/src/session.ts
    node: method:f331f3da904f02d0dc9d12b4570c9fc7
    fingerprint: mh2:64:SABxdJcEFuOCAbHqtxFVH6wE-Sd3Czp99wIy04cCP5fuA2qLuQDSwykEoVrPBTtDjgJnjHwADyBnAjgNJgSLARYH9PzFCGSKehElcWAE88sBB7XOMQcpiZwAyoc4AxJgZwUzNSwBlgG9B6kyZAsRU1sDyN8ICF9ncQQtqqYDV3LXAAHOkALzoOQCgIw8DCG1pQPOSU4A8QTbB1ul1gKFixgCJlsSAd5jQALljJIBQaTsAXvvOgQiX3EBH29QAnuhVAOO5zsIhVoMBlKI8ALDxH4B1GTXAqgKXAV0oAUEVAiCAADN8AIs9SkNw9CmBJvQbAE7TWUIQgl2BtI5DAD9UK0BBm1ldGhvZAMAIHheMZyMleQ3aNOWbl196wDuOmHHZx7ec2ufel9b4UyBAPQobl8YfTYU9UHOWVcu1FA
    bodyHash: eabcc622447e63e3582df63c19b100fcb056a4aa18873d03e44ed3e909039ab1
-->
## Outbound frames carry a per-session sequence

GameSession.send returns false without sending when the socket is not OPEN, otherwise it writes { v, ss, msg } with an incrementing outboundSequence starting at zero and JSON-stringifies the envelope.

<!-- mex:entity
id: mx_01M88SYZH2BXG84RMERG68ZG2V
type: fact
status: promoted
revision: 1
metadata:
  aliases:
    - jwt rejected
    - wrong signing algorithm
    - issuer mismatch
    - token claim parsing
relations:
  - type: refines
    target: mx_01M88SYZDE4PCAB6J2BT60K8N2
    note: Part of game-server in context/game-server.md
provenance:
  createdBy:
    kind: agent
    id: opencode
  createdAt: 2026-11-25T12:10:08Z
grounds_to:
  - file: apps/game-server/src/auth.ts
    node: function:633f1694bca475da6692f3466e1257bc
    fingerprint: mh2:64:xgMAcXSXAMzLeAA-6a4CH-gZAWcg1ADHfrsAJDp1AXrGCAeS5PoB8vQhAML3XASlQKsCK8Y_Adi4zwGCI-oBAqbAAQFyHQALH-IBpgXTAgKuogCl3JsBY087AGkIZQD6Z_YByAKAASGXWAA7r-oAI_BdAQNv4gLFta0DekfYAalqHQEL9gkAapHEAF40LgGSWXgBkfrPARU5FQBRjkcCUVjZAquOkADuBMQAhEELAUGk7ADYWSoC0tWsAR9vUABKYUoArViqBTEpGQCX0J0A6n3sAdRk1wEWbhgAFJ4hAEk3nwAAzfAAuhpjAL2HYAEG4_ABO01lAQQ1LgGT7YEAPD3DAQhmdW5jdGlvbgIABG_Nmi3kFsEjnOiN9-ThHABYypgVWyfWoGsoI775ClCv
    bodyHash: 3bddc24c7366eaae224e8ce0c17ed5b1e744ec07002d01f20571862dab5461e4
  - file: apps/game-server/src/auth.ts
    node: function:09aa5d8678525ad19cac9b9921b4a699
    fingerprint: mh2:64:ZAATW6EAvIecBfagxQIf6BkBZyDUCMq0TwAkOnUChW1jBYqUqAm-VIsAwvdcAucvMQQFfrMAyFH4AYIj6gPBIeEGGS0ABJkDwgLx95kE88sBBqkp2ARly_QAaQhlBS2xNQMd6q8BLkhsAFE5EACyiK4JEIi1AzeNigAosXUFj02iAQv2CQY6nUcCgIw8A1WftwJ08BYB3lgPAH_gAAwD2XQRUoDwAd5jQAh9c8MBQaTsAqNdjwQiX3EF6PD8AnuhVA8plL0FMSkZAJfQnQLDxH4B_KAwARZuGAaK9qcAviuuAADN8ADPZWkBTsxUAKD0sgVpfN4BmdS1BaB1RQA8PcMBCGZ1bmN0aW9uAwAl_Tmx-1ODIHiaPdHMs3FFAH-w6cZI5UCkjcq6mh-Mkt8A_VcTtVcplpnNCr4T3PvLJA
    bodyHash: 6e06e11e17bbc0308051511de656ee03ff9053927fa40ee3a8441b0551e6bdfc
-->
## Verifier tries Supabase first, then development tokens

createIdentityVerifier throws at construction if no source is configured, builds an ordered attempt list with Supabase before dev, accepts HS256 for a shared Supabase secret, ES256/RS256 for JWKS, enforces issuer and audience with 5 seconds of clock tolerance, and rethrows the last error after all attempts fail.

<!-- mex:entity
id: mx_01M88SYZHKTJ68DH2H3PTJYBFQ
type: fact
status: promoted
revision: 1
metadata:
  aliases:
    - dev login missing
    - token expires
    - local sign-in
    - server id in response
relations:
  - type: refines
    target: mx_01M88SYZDE4PCAB6J2BT60K8N2
    note: Part of game-server in context/game-server.md
provenance:
  createdBy:
    kind: agent
    id: opencode
  createdAt: 2026-11-25T12:10:09Z
grounds_to:
  - file: apps/game-server/src/http.ts
    node: function:046fcd9a2de416c1239ce88df7e4e11c
    fingerprint: mh2:64:4gUAcXSXALyHnAIeEUkCH-gZAI3vxAEwJWIAJDp1AVzOQwBHdwwA8s1DAML3XAE1qbUBuSBBAGNUkwGCI-oBPwyDAsvccQKhgmgBPmytADdLrgHR98kBXvgnAGkIZQBdaKUBy0pbAZYBvQDfhOUAI_BdBR-6MQCdhyQABwJ9AhY2kwEL9gkAITBXAoCMPADQuPUB3mlcAd5YDwCzM-QCohuJAC6f7gMRdEwBgcBVAUGk7ADYWSoBvMzlAFqoZAD5vQoBT_7HApsdXgCX0J0BzzrnAAvUMwEWbhgC95iZAEk3nwAAzfACLPUpAKADOQCg9LIDXC6dANtSKgBCR08Dy3VvAwRmaWxlCGZ1bmN0aW9uBm1ldGhvZAMAgbCc7xLRWZ8h9lhslGJAVAFjPxaUvKR12maS80ZuEle8AtopTVDPdqqPuaDC1XrL5co
    bodyHash: 186225343770ed5910c4c3d6596aa6debe5d390de7897a11dea57f62eb063550
  - file: apps/game-server/src/auth.ts
    node: function:c212fd815056f11c072d914f18fd591d
    fingerprint: mh2:64:YQBxdJcRbMLaAqNi6gIo2KcEXMjEBxL2ewIy04cJ3XPACAtQtwU-u3sAwvdcAuG_sQQFfrMAY1STAjgNJgVN59kPjIqJAwgHjARc_1UGSljkCBBEtgg2GokAaQhlAF1opQUzNSwBlgG9AjoUSQSO-7AE0qG9AxvkfwQtqqYDB0CyAQv2CQY6nUcCgIw8A8G4egPOSU4E7O8eBaIglg64IpcDmNGCAxF0TAPVqSkBQaTsAXufIQQiX3EBH29QAnuhVAap6o4CVGM0AJfQnQLDxH4B_KAwARZuGAV0oAUE0DhYAADN8AStTRoJX7K6AV2fgwW-ZxAPVhu9BVGoiQZxtWkBCGZ1bmN0aW9uAgAyDuTwU2tEalcLqWWyRD9VAMT2t8w-RHAH4nsmwAQXTCw
    bodyHash: f9e1270d4212acbdf16142d6f8fc888042a87527a2a0122f206ab238db69cc75
-->
## The development sign-in route exists only with a dev secret

buildServer registers /auth/dev only when DEV_AUTH_ENABLED and DEV_JWT_SECRET are both set; it validates optional uuid and display-name fields, generates missing ids, signs a 12-hour HS256 token and returns the serverId so the client can bind its hello.
