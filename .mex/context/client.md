---
name: client
description: React + Phaser PWA shell in apps/client. Load when changing connection lifecycle, diagnostics, the isometric scene, or dev sign-in.
triggers:
  - "client shell"
  - "websocket client"
  - "reconnect"
  - "diagnostics overlay"
  - "phaser scene"
  - "dev sign-in"
edges:
  - target: context/packages.md
    condition: when changing the envelope or message types the client sends
  - target: context/game-server.md
    condition: when a client change depends on server lifecycle or close codes
  - target: context/setup.md
    condition: when changing VITE_GAME_SERVER_URL or dev proxy configuration
  - target: patterns/debug-connection.md
    condition: when the client shows a connection error
grounds_to: []
last_updated: 2026-11-27
mex:
  id: mx_01M88T0K1SZXV9JKH71QCR12A3
  type: component
  status: promoted
  revision: 5
  title: client
  relations:
    - type: related_to
      target: mx_01M88SV6KFDDEH3R3W2YEVSD0V
      note: when changing the envelope or message types the client sends
    - type: related_to
      target: mx_01M88SYZDE4PCAB6J2BT60K8N2
      note: when a client change depends on server lifecycle or close codes
    - type: related_to
      target: mx_01M88NM5F9RS36QYX0CCNTAZEY
      note: when changing VITE_GAME_SERVER_URL or dev proxy configuration
    - type: related_to
      target: mx_01M88T5MCXQE8S9Y57N1EBKHX4
      note: when the client shows a connection error
---

# Client

`apps/client` is a Vite-built React 19 PWA. `apps/client/src/main.tsx` mounts `App` and registers
the service worker only in production. `resolveServerEndpoints` prefers
`VITE_GAME_SERVER_URL` and otherwise uses the Vite `/api` and `/ws` proxies.
`GameConnection` owns one native WebSocket, the outgoing client sequence,
hello/ping timers, latency and traffic accounting, exponential-backoff retries,
and background suspend/resume. `requestDevSession` calls the server's
development sign-in and keeps a stable test identity in `localStorage`.
`GameRuntime` lazily initializes Phaser 4.2.1, draws a deterministic 32x32-tile
isometric neighborhood and geometric house using `createPrng` and `deriveSeed`,
and feeds `DiagnosticsCollector` from the scene update loop. The React
joystick sends sequenced movement through the existing WebSocket connection;
the renderer displays all entities in server snapshots, follows the entity ID
from welcome, removes entities absent from the latest full snapshot, and
highlights tapped tiles. Snapshot positions are dequantized from 1/16-tile
coordinates. `DiagnosticsOverlay` surfaces runtime and network metrics. Full
prediction, reconciliation, interpolation, and collision are not implemented.

<!-- mex:entity
id: mx_01M88T0K14F91426XEKTT0M1V7
type: fact
status: promoted
revision: 1
metadata:
  aliases:
    - wrong websocket url
    - production build config
    - dev proxy routing
relations:
  - type: refines
    target: mx_01M88T0K1SZXV9JKH71QCR12A3
    note: Part of client in context/client.md
provenance:
  createdBy:
    kind: agent
    id: opencode
  createdAt: 2026-11-25T12:20:00Z
grounds_to:
  - file: apps/client/src/net/connection.ts
    node: function:5c664410b1bdc3453670fc4549ff8657
    fingerprint: mh2:64:XAATW6EAvIecC5pW6waz5ZQEK-BjCiayVgIy04cBN_EzBxoXYAtI5n0NZHMLAucvMQJnjHwXvm3BAYIj6gX8pxYB1I32AsJrSALYkUsFER5SBdaGmwGYjukDJaUHAQcOwAD0er0CyOgqEP96twCyiK4LFm9VAxvkfwGLg24JEHgVAQv2CQBqkcQAo7SRAsBdEQIj0l0BQpGTA8a1bQQsDNUGR6d-AgZgiQXljYgAKDc0CXNUeQknYcAAg5XTAnuhVAMKsl8BSLypAJfQnQGOKSMBI9OfARZuGAL3mJkBZ-fbARhDhQBRd38Db2QxAKD0sghxdyABmdS1BDfZsgcF9YIBCGZ1bmN0aW9uAQB2dV7_dt_AAtvO2-XSNa8l
    bodyHash: 7446eb36bc88532fc71f821b8ca824b14d10a7ea99dc5b38047472073f76beb9
-->
## Server endpoints come from one build-time variable or the dev proxy

resolveServerEndpoints uses VITE_GAME_SERVER_URL when set, deriving /auth/dev from the http base and /ws from its ws-equivalent; otherwise it returns relative /api/auth/dev and a same-host ws:// or wss:// URL based on window.location.protocol.

<!-- mex:entity
id: mx_01M88T0K2EPCBQ99CPTYT1A6W4
type: fact
status: promoted
revision: 1
metadata:
  aliases:
    - invalid outgoing message
    - sequence mismatch
    - traffic counter wrong
relations:
  - type: refines
    target: mx_01M88T0K1SZXV9JKH71QCR12A3
    note: Part of client in context/client.md
provenance:
  createdBy:
    kind: agent
    id: opencode
  createdAt: 2026-11-25T12:20:01Z
grounds_to:
  - file: apps/client/src/net/connection.ts
    node: method:7b6402e5b96a9bb91addb9ccfda877a4
    fingerprint: mh2:64:cgBxdJcAvIecBfagxQaz5ZQGNSOlAiAVhQIy04cQE1oAA2qLuQDSwykEoVrPBTtDjgJnjHwADyBnAYIj6gSLARYCnk0CAPQLYwQoYmQCczZeBqaBawGYjukAyoc4AJZBMQMd6q8BlgG9BU_WUASO-7AJEIi1CQnl0gQtqqYDV3LXAAHOkAKk4sUCgIw8A1WftwPOSU4CLM03Ap3kMAKFixgCJlsSAxF0TAGhNZYBQaTsAXvvOgGscZgBH29QAFFoTQPWggoC2YT8AJfQnQLDxH4B_KAwAnWIMgL3mJkEVAiCAADN8AIs9SkA7f0gAKD0sgBWlbABBDUuBVGoiQjNM8ECCGZ1bmN0aW9uBm1ldGhvZAUA0JR9Jq7o4cWH-4oh4buH-wEOq6uKgfmpGK2e7O8akn4lARy6hH4UfJjzcz4WEW3pvdsBlDHR1q1BZtoSQPzUocsnIwHJOpRd4D4lP_QeZkzxRS--
    bodyHash: 6abe56ae4a1b286b36c6b7862eb26992fe3be6f03bb0faf02d836a10bb1ab320
-->
## Every outbound frame is validated and carries a monotonic sequence

GameConnection.send increments clientSequence, runs ClientEnvelope.safeParse before JSON.stringify, blocks an invalid message by setting an error status, and only accounts traffic after a successful socket.send.

<!-- mex:entity
id: mx_01M88T0K2V7PDT41422J9JCCJ5
type: fact
status: promoted
revision: 1
metadata:
  aliases:
    - client keeps reconnecting
    - fatal disconnect
    - stale reconnect token
relations:
  - type: refines
    target: mx_01M88T0K1SZXV9JKH71QCR12A3
    note: Part of client in context/client.md
provenance:
  createdBy:
    kind: agent
    id: opencode
  createdAt: 2026-11-25T12:20:02Z
grounds_to:
  - file: apps/client/src/net/connection.ts
    node: method:71de44ea94bc65d5b34f3a479a58395d
    fingerprint: mh2:64:egFd_SoEFuOCFb-G-A4Yvg4IsfwnAiAVhQXOs2EI5BlQATr0BQDS66QIbYKLDiDk7AJnjHwADyBnAjgNJgBL2JsCnk0CACBzvgC0dSoAQYzcAJdmhwGYjukAyoc4AeIdvAP1Z0UBlgG9CLXbrgDuKGoBQr9RDTCE7gS0FlgDV3LXAAHOkAFOm_0CgIw8A1WftwBG88UMhPgzBaIglgKFixgF7xxIAxF0TALljJIE3KH-AXvvOgGscZgEQkRdAnuhVAap6o4C2YT8BTVaDgHnivYB_KAwAnWIMgL3mJkAyDTTAADN8AIs9SkA7f0gAd_8PQBWlbABt_lWAfCTRwGqsMgCCGZ1bmN0aW9uBm1ldGhvZAYAmQyc4xkVMO9LqCYiUCCkBAEALqj0IebF6P2i__lomgJtAU-LkDWkDGCVKwyo0dlC2O0BlDHR1q1BZtoSQPzUocsnIwG3c_Z0bzsGj_n563PIPQGNAck6lF3gPiU_9B5mTPFFL74
    bodyHash: 803d5edaef38eea2be2cb8a28ad5b056ee2287f2d4f41e5e1ed6d03c7a5ebae6
-->
## Close codes decide whether the client retries or stops

GameConnection.onSocketClose retries on 1000 and 4006, clears the reconnect token on 4003 and 4006, and sets a terminal error for 4001, 4002, 4004, 4009, 1002, 1003 and 1009; all other codes retry by default.

<!-- mex:entity
id: mx_01M88T0K37ZMGFHAW2ZXAGRKCZ
type: fact
status: promoted
revision: 1
metadata:
  aliases:
    - reconnect storm
    - thundering herd
    - retry backoff timing
relations:
  - type: refines
    target: mx_01M88T0K1SZXV9JKH71QCR12A3
    note: Part of client in context/client.md
provenance:
  createdBy:
    kind: agent
    id: opencode
  createdAt: 2026-11-25T12:20:03Z
grounds_to:
  - file: apps/client/src/net/connection.ts
    node: method:b773f6746f3b068ff9f9eb73c83d018d
    fingerprint: mh2:64:bADfVgcFSV-DCgBQzwaz5ZQIsfwnAiAVhQKoVXcCektjA2qLuQDS66QJKw42A5eVLwA9VwwBkynQAYIj6gFhfjYCnk0CAPQLYwMBErcAN0uuBHdNAwA79LEBxKXAAJZBMQHLSlsDA-iTBndgTQJ5VQsE4bglBkl3CQPUpGAG3ZJqAAHOkALzoOQCgIw8AOl85AZ9_jEB3lgPA8a1bQKFixgCIa4dAUoXUwcP6n0EKiDaAXvvOgGQW5QBH29QAQwZBgPWggoCmx1eAJfQnQCOjSsAj1ADAnWIMgAlTO4EVAiCAX3LAgDRvJAA7f0gApWEmABWlbABt_lWBVGoiQetmwEBBm1ldGhvZAQAcd5E6pS8ZdWzTzpHmlg5XQCUMdHWrUFm2hJA_NShyycjAJnbbxW6-UQlhOmEnoQgwhoAolMnxyRl41ieP09a767JFQ
    bodyHash: 8af69191c6060d77ed193613e2316133fb8a08288cd356187598f8d54fc32a0f
  - file: apps/client/src/net/connection.ts
    node: method:e334477a706f4fb7706c6703bb8c10da
    fingerprint: mh2:64:xwIAEtfOALyHnAO_3CEA_JL0BC_xAQAnAuoC-Iv_Aiy1NgE69AUA0uukBFzNlQUh6ioCZ4x8AA8gZwGCI-oEiwEWATOW-AAgc74EKGJkADdLrgMSjfcBmI7pAGkIZQCRYEEDHeqvAZYBvQLWJH0A7ihqA8jfCAkJ5dIEKkNNAhY2kwABzpABTpv9AoCMPAALfg0ARvPFAizNNwKd5DAChYsYBTvTbwMRdEwFlQkGAUGk7AF77zoAkQlIAJlPSwBRaE0D1oIKAtmE_ACX0J0Cw8R-AdRk1wJ1iDIC95iZAEk3nwAAzfACLPUpAO39IAA_gVQAVpWwANlHQAHwk0cA_VCtAghmdW5jdGlvbgZtZXRob2QGAE3_0gbShuXxntw9TbvrV4QA0JR9Jq7o4cWH-4oh4buH-wE5EnjrH7OV5z-uLDJj1LuPAZQx0datQWbaEkD81KHLJyMByTqUXeA-JT_0HmZM8UUvvgH0uWJjcu38_j9i3S7o6ySE
    bodyHash: 6dccf7e4d18b5b02b6179e4c0db2a539543a88c6ba6712536ab5dfbf7043a633
-->
## Reconnect delays are exponential with jitter and a floor

GameConnection.scheduleReconnect doubles reconnectBaseMs with each attempt up to reconnectMaxMs, then multiplies by a random factor in [0.75, 1.25); a welcome resets reconnectAttempts to zero.

<!-- mex:entity
id: mx_01M88T0K3NGR5VGG0VY8CNRP0P
type: fact
status: promoted
revision: 1
metadata:
  aliases:
    - ipad background disconnect
    - reconnect churn
    - battery drain while hidden
relations:
  - type: refines
    target: mx_01M88T0K1SZXV9JKH71QCR12A3
    note: Part of client in context/client.md
provenance:
  createdBy:
    kind: agent
    id: opencode
  createdAt: 2026-11-25T12:20:04Z
grounds_to:
  - file: apps/client/src/net/connection.ts
    node: method:1c241aa8f886ff46d237314db12c0602
    fingerprint: mh2:64:QQFd_SoAvIecC5pW6waz5ZQXKyvlAiAVhQL4i_8CkIqzATr0BQDS66QAhMgMCAUpqwJnjHwEHZP_AjgNJgVN59kCnk0CAPQLYw1jwUoAN0uuCBBEtgPrC5gT0j_pAeIdvAMJ_scGDz68BU_WUASO-7ALFm9VBkl3CQVdNIcG3ZJqAAHOkAFOm_0FozOyAAt-DQBG88UB3lgPBaIglgKFixgGR6d-BCZ_GgkBKxQCEyAxAXvvOgGscZgCKnaaAFFoTQxMLpMC2YT8AJfQnQCOjSsDK7dGAnWIMgL3mJkA5H8fAaxgRQIs9SkA7f0gAKD0sgBWlbABmdS1AfCTRwcF9YIBBm1ldGhvZAQAT4uQNaQMYJUrDKjR2ULY7QCUMdHWrUFm2hJA_NShyycjAPc0r7Ac1PLZqpGKC4GVa_MA_-L4GzOJ4H3YXO6aeGGBJg
    bodyHash: 650b229745be68551ac70f7ea0f9fe4ede5f19f51cf9c87c97e086e9c17f978a
  - file: apps/client/src/net/connection.ts
    node: method:45e23c70ccbed3d2863da64d5b942377
    fingerprint: mh2:64:MAFd_SoSj5wlA8EP_wyc-hAIZVLpAiAVhQWGLgsCP5fuATr0BQDS66QMRc8_DiDk7AJnjHwEHZP_AjgNJga8JRcCnk0CAPQLYxaOGDoCczZeCBBEtgYrZY0X9muMAeIdvAvZihsGDz68BU_WUAzQQK0DyN8IDcWqPwVdNIcG3ZJqAAHOkAccopIFozOyCAf-NQBG88UMhPgzALI8EAKFixgFO9NvBViZERYx0BMCEyAxAXvvOgGscZgGn_blBXlWlw17LKsC2YT8B23VOAa4n1sDK7dGAnWIMgL3mJkDPPlfEcb77wIs9SkAJPrSAV2fgwBWlbABt_lWBVGoiQjNM8EBBm1ldGhvZAQAT4uQNaQMYJUrDKjR2ULY7QB7cLKxrBoVspQq3kqYecoSAKV7pBBrqzcv5QHdpXnkZ-QA_-L4GzOJ4H3YXO6aeGGBJg
    bodyHash: a4853f822d1478d2308615b5c4ea0d5e5c2b56f8ace095e18394dc28fa2b2d32
-->
## Hidden pages close the socket and resume with one reconnect

GameConnection.suspendForBackground closes with 1000 'Page hidden', clears all timers and skips retries while suspended; resumeFromBackground clears timers, resets attempts and calls connect(false) once from pageshow or visibilitychange.

<!-- mex:entity
id: mx_01M88T0K41DTX10Q1363V7TW3C
type: fact
status: promoted
revision: 1
metadata:
  aliases:
    - dev sign-in fails
    - test character changes
    - incomplete auth response
relations:
  - type: refines
    target: mx_01M88T0K1SZXV9JKH71QCR12A3
    note: Part of client in context/client.md
provenance:
  createdBy:
    kind: agent
    id: opencode
  createdAt: 2026-11-25T12:20:05Z
grounds_to:
  - file: apps/client/src/net/dev-auth.ts
    node: function:dd90bd26ea258d4036ffadfb8759e56b
    fingerprint: mh2:64:VwS8i7oDzD4yBfagxQaz5ZQAje_EBge6pQHzzxcDYc7BCAtQtwFEIbMAhMgMAuG_sQG5IEEAY1STAYIj6gPuvAYCV4mxAeHZKwOiAkcDk0LvAMIwPQFbJOIAtGCIAF1opQMd6q8BlgG9AFE5EAe_OcAEcQD5AxvkfwVdNIcDB0CyAQv2CQKk4sUCgIw8A1WftwHeaVwB3lgPAH_gAAKiG4kALp_uAO4ExAGhNZYCS9l3ANhZKgLS1awEg6lwAEphSgaAZEYCVGM0AJfQnQPZTBYBsjAdARZuGAL3mJkAeZSkAADN8AIs9SkGBqfCAd_8PQW-ZxABBDUuAUgFigVXppwBCGZ1bmN0aW9uBQAT2F9idRzEHkeZYv25IDLwAHZ1Xv9238AC287b5dI1ryUAoq-1uAO_UiYK3a9gqVhviQC2YIHwEkqTefXELqlM0g1HAOmNkmm3hHxH_fcgvzdcy84
    bodyHash: 2666027c07d55c8e444be8c966f433ed1afe38d8156a6ae5929094509bf7c765
-->
## Development sign-in reuses a local identity and validates the response

requestDevSession posts a stored {playerId, characterId, displayName} identity or an empty body, requires token/playerId/characterId/displayName/serverId in the reply, then persists the identity to localStorage; storage failures are swallowed so the tab session still works.
