---
name: packages
description: Shared libraries in packages/ — protocol wire schemas and shared gameplay primitives. Load when changing message formats, ids, math, or seeded randomness.
triggers:
  - "protocol message"
  - "wire format"
  - "shared math"
  - "seeded random"
  - "chunk coordinates"
  - "branded id"
edges:
  - target: context/architecture.md
    condition: when a library change affects how client and server connect
  - target: context/conventions.md
    condition: when adding a new export or test to a package
  - target: context/game-server.md
    condition: when a server message schema changes
  - target: context/client.md
    condition: when a client message schema changes
grounds_to: []
last_updated: 2026-11-27
mex:
  id: mx_01M88SV6KFDDEH3R3W2YEVSD0V
  type: component
  status: promoted
  revision: 5
  title: packages
  relations:
    - type: related_to
      target: mx_01M88NM5EH1VCT3WG3WSSD1EFQ
      note: when a library change affects how client and server connect
    - type: related_to
      target: mx_01M88NM5F10AJHP932SWKB9152
      note: when adding a new export or test to a package
    - type: related_to
      target: mx_01M88SYZDE4PCAB6J2BT60K8N2
      note: when a server message schema changes
    - type: related_to
      target: mx_01M88T0K1SZXV9JKH71QCR12A3
      note: when a client message schema changes
---

# Packages

`packages/` holds three workspace libraries. `protocol` defines the versioned
wire contract: Zod schemas for every client and server message, envelopes with
`v`/`cs`/`ss`, close codes, and protocol-error codes. `shared` defines the
deterministic primitives both apps use: branded ids, chunk constants and
coordinate helpers, item/container/body-region types, clamped math, and a seeded
non-cryptographic PRNG. `config` supplies shared TypeScript and Vitest presets.
Both apps depend on `protocol → shared`; nothing internal depends on an app.
Libraries export TypeScript source through `packages/shared/src/index.ts` and
`packages/protocol/src/index.ts` and build with `tsc --noEmit` only.

<!-- mex:entity
id: mx_01M88SV6JPW9H9ED5Z8MT8Y3DF
type: fact
status: promoted
revision: 1
metadata:
  aliases:
    - stable string seed
    - reproducible roll values
    - not for secrets
relations:
  - type: refines
    target: mx_01M88SV6KFDDEH3R3W2YEVSD0V
    note: Part of packages in context/packages.md
provenance:
  createdBy:
    kind: agent
    id: opencode
  createdAt: 2026-11-25T12:00:00Z
grounds_to:
  - file: packages/shared/src/prng.ts
    node: function:b564feead2414a7b9ae2f8652fcbd735
    fingerprint: mh2:64:PwBxdJcQjus_CwdbUgiaFfsGNSOlCl1dOgMZZyAS49rkA7isbQWqFTUCXDypBSr-eA2TzV8Adb2bAYIj6gz-OeEBAXIdC6UA7gCNAMsFDiWhA2FJ7ghrVMQAtGCIBRqA-Ac4OLMBIZdYBU_WUA3bZGIEcQD5AqOGTgQtqqYEFXIzAhJYYABqkcQCgIw8AAFMuAY2avwCLM03ALMz5AW8VgACJlsSAO4ExAwZdKEBQaTsDrP8XgbkfnEDlDsYAnuhVANad_wGvhNFAen1owLDxH4C075LAnGVAxH-DxgCxxoGAmbc5wLpUpkJgbc2AV2fgwJNJysMUL0zBtEUHRRL-nwBCGZ1bmN0aW9uAwBAQzW7eMqzehPeK2Paq57qAIViPKpnY5NPsKU0OLxqJWMAjfp4pNbpyF0Ph21IC5hwwA
    bodyHash: 0b88fb329d7cffe23f5f0f90eba8c3a2c6d324acfe2d5bbacb3330a3d1c972bd
-->
## String hashing uses FNV-1a 32-bit constants

hashString starts from 0x811c9dc5, multiplies by 0x01000193 per UTF-16 code unit and returns an unsigned 32-bit value; it is a deterministic material helper, not a cryptographic hash.

<!-- mex:entity
id: mx_01M88SV6M9VAK06MZVQ5Z0MJ6D
type: fact
status: promoted
revision: 1
metadata:
  aliases:
    - seed collision
    - mixed seed parts
    - same-looking seed values
relations:
  - type: refines
    target: mx_01M88SV6KFDDEH3R3W2YEVSD0V
    note: Part of packages in context/packages.md
provenance:
  createdBy:
    kind: agent
    id: opencode
  createdAt: 2026-11-25T12:00:01Z
grounds_to:
  - file: packages/shared/src/prng.ts
    node: function:8dfa78a4d6e9c85d0f876d480b9870c0
    fingerprint: mh2:64:LABxdJcDIq_oAZOpDgbUgHwIsfwnArlj5AXOs2ECvgn7BtSbjhDO2twFinsPCmX3RRLkfBoXQOorAYIj6gGLhwkPjIqJFI2xKQgSQjwAA7FGAoGKChJuTgwOtrglA4nZ2QXnhEEBL3yvAN-E5QOxtzkIGPR4AJ2HJAQtqqYC7lbjAQv2CQBqkcQCgIw8BqUXcg7y_UQFNsm9AWHByATPfwwA5C6kAxF0TA6LyQwAqFn_ABCrNArvANkDrcRhAnuhVARLaaoKiSl0AJfQnQLDxH4AC9QzAblQ1Aq0wlsLmHtmBt30xALpUpkDFXU1B-qNeAhKFOkDH9EHBxdHCwCEPcwCCGZ1bmN0aW9uBm1ldGhvZAUANand6lWH3llbuY_f8jEsbQCmYyUQXakyRDROkSA_4EQPALVk_urSQUp7muL4ZS_L1zUA9x4L6C516aWTL1paHYcziAHKkROMVPpxgLcqYu9WeGEI
    bodyHash: 1e6ac13b58c88135e54533fc3be9a8aba3fa9455c26adf8973519af5e086ebce
  - file: packages/shared/src/prng.ts
    node: function:b564feead2414a7b9ae2f8652fcbd735
    fingerprint: mh2:64:PwBxdJcQjus_CwdbUgiaFfsGNSOlCl1dOgMZZyAS49rkA7isbQWqFTUCXDypBSr-eA2TzV8Adb2bAYIj6gz-OeEBAXIdC6UA7gCNAMsFDiWhA2FJ7ghrVMQAtGCIBRqA-Ac4OLMBIZdYBU_WUA3bZGIEcQD5AqOGTgQtqqYEFXIzAhJYYABqkcQCgIw8AAFMuAY2avwCLM03ALMz5AW8VgACJlsSAO4ExAwZdKEBQaTsDrP8XgbkfnEDlDsYAnuhVANad_wGvhNFAen1owLDxH4C075LAnGVAxH-DxgCxxoGAmbc5wLpUpkJgbc2AV2fgwJNJysMUL0zBtEUHRRL-nwBCGZ1bmN0aW9uAwBAQzW7eMqzehPeK2Paq57qAIViPKpnY5NPsKU0OLxqJWMAjfp4pNbpyF0Ph21IC5hwwA
    bodyHash: 0b88fb329d7cffe23f5f0f90eba8c3a2c6d324acfe2d5bbacb3330a3d1c972bd
-->
## Seed derivation includes the type of every part

deriveSeed renders each part as 'type:value', joins with '|', then calls hashString, so the number 7 and the string '7' never produce the same seed.

<!-- mex:entity
id: mx_01M88SV6MQJR238S1YZX2CDQG7
type: fact
status: promoted
revision: 1
metadata:
  aliases:
    - random roll out of range
    - fractional bound crash
    - repeatable gameplay random
relations:
  - type: refines
    target: mx_01M88SV6KFDDEH3R3W2YEVSD0V
    note: Part of packages in context/packages.md
provenance:
  createdBy:
    kind: agent
    id: opencode
  createdAt: 2026-11-25T12:00:02Z
grounds_to:
  - file: packages/shared/src/prng.ts
    node: function:35a9ddea5587de595bb98fdff2312c6d
    fingerprint: mh2:64:4QEAE1uhAQEuQQIeEUkB6JnSBTt3awDHfrsD6IdNAnpLYwFZauIDcOBmAML3XALnLzECK8Y_AC4O8QC-GQMFTefZATPfhwV1u3sAjQDLAYW6uwHj5HQD57ffAGkIZQAtzvIADmm-AIMr4gBRORAAI_BdBzkY8QCdhyQAKLF1AHOzeQEL9gkAapHEAUkVewDpfOQDzijNARN8KQBTsssFyB-IAhYkvwHeY0AEiBNRAFBMzAEqw58DlbjeA1A7dgD5vQoEwtmEA-NdsQCX0J0Cw8R-AAvUMwEWbhgI1wnUAscaBgAAzfAAz2VpAg2p9wFdn4MBO01lAZnUtQTgEd8AYGOXAghmdW5jdGlvbgZtZXRob2QKAAiVMgxFtJp_LFFv8ZAPZuUAKGjmEz02kbSu5LWYoMJKYwA1qd3qVYfeWVu5j9_yMSxtAEEf2k4-77RLYDmZAc515icAR2Uy-ROjNOjGcNctiN_ZjgBTHSD4WuPXh0cqeYwy7TLIAGzleiguIl4oEPKLEe7G7zEAbYy4U2Ii7vC-shTDVDj8ogCN-nik1unIXQ-HbUgLmHDAAcqRE4xU-nGAtypi71Z4YQg
    bodyHash: df03e54d715796c77fc45d765d5b8781a4ea6bef0a2703b45c142d3285765b02
-->
## PRNG stream has strict integer bounds

createPrng advances state with 0x6d2b79f5, nextFloat divides by 4294967296, and nextInt throws RangeError unless both bounds are integers and maxExclusive is greater than minInclusive.

<!-- mex:entity
id: mx_01M88SV6N2VSY4WK65RP2HTZSD
type: fact
status: promoted
revision: 1
metadata:
  aliases:
    - independent random streams
    - fork order changes results
    - label-specific rolls
relations:
  - type: refines
    target: mx_01M88SV6KFDDEH3R3W2YEVSD0V
    note: Part of packages in context/packages.md
provenance:
  createdBy:
    kind: agent
    id: opencode
  createdAt: 2026-11-25T12:00:03Z
grounds_to:
  - file: packages/shared/src/prng.ts
    node: function:35a9ddea5587de595bb98fdff2312c6d
    fingerprint: mh2:64:4QEAE1uhAQEuQQIeEUkB6JnSBTt3awDHfrsD6IdNAnpLYwFZauIDcOBmAML3XALnLzECK8Y_AC4O8QC-GQMFTefZATPfhwV1u3sAjQDLAYW6uwHj5HQD57ffAGkIZQAtzvIADmm-AIMr4gBRORAAI_BdBzkY8QCdhyQAKLF1AHOzeQEL9gkAapHEAUkVewDpfOQDzijNARN8KQBTsssFyB-IAhYkvwHeY0AEiBNRAFBMzAEqw58DlbjeA1A7dgD5vQoEwtmEA-NdsQCX0J0Cw8R-AAvUMwEWbhgI1wnUAscaBgAAzfAAz2VpAg2p9wFdn4MBO01lAZnUtQTgEd8AYGOXAghmdW5jdGlvbgZtZXRob2QKAAiVMgxFtJp_LFFv8ZAPZuUAKGjmEz02kbSu5LWYoMJKYwA1qd3qVYfeWVu5j9_yMSxtAEEf2k4-77RLYDmZAc515icAR2Uy-ROjNOjGcNctiN_ZjgBTHSD4WuPXh0cqeYwy7TLIAGzleiguIl4oEPKLEe7G7zEAbYy4U2Ii7vC-shTDVDj8ogCN-nik1unIXQ-HbUgLmHDAAcqRE4xU-nGAtypi71Z4YQg
    bodyHash: df03e54d715796c77fc45d765d5b8781a4ea6bef0a2703b45c142d3285765b02
  - file: packages/shared/src/prng.ts
    node: function:8dfa78a4d6e9c85d0f876d480b9870c0
    fingerprint: mh2:64:LABxdJcDIq_oAZOpDgbUgHwIsfwnArlj5AXOs2ECvgn7BtSbjhDO2twFinsPCmX3RRLkfBoXQOorAYIj6gGLhwkPjIqJFI2xKQgSQjwAA7FGAoGKChJuTgwOtrglA4nZ2QXnhEEBL3yvAN-E5QOxtzkIGPR4AJ2HJAQtqqYC7lbjAQv2CQBqkcQCgIw8BqUXcg7y_UQFNsm9AWHByATPfwwA5C6kAxF0TA6LyQwAqFn_ABCrNArvANkDrcRhAnuhVARLaaoKiSl0AJfQnQLDxH4AC9QzAblQ1Aq0wlsLmHtmBt30xALpUpkDFXU1B-qNeAhKFOkDH9EHBxdHCwCEPcwCCGZ1bmN0aW9uBm1ldGhvZAUANand6lWH3llbuY_f8jEsbQCmYyUQXakyRDROkSA_4EQPALVk_urSQUp7muL4ZS_L1zUA9x4L6C516aWTL1paHYcziAHKkROMVPpxgLcqYu9WeGEI
    bodyHash: 1e6ac13b58c88135e54533fc3be9a8aba3fa9455c26adf8973519af5e086ebce
-->
## Forked streams use the original seed, not current state

createPrng.fork calls deriveSeed with [baseSeed, label] rather than the live state, so the same label always yields the same child stream and parent consumption cannot change it.

<!-- mex:entity
id: mx_01M88SV6NG7943PP6S4BXKGNP7
type: fact
status: promoted
revision: 1
metadata:
  aliases:
    - NaN slips through
    - silent bad math
    - invalid range guard
relations:
  - type: refines
    target: mx_01M88SV6KFDDEH3R3W2YEVSD0V
    note: Part of packages in context/packages.md
provenance:
  createdBy:
    kind: agent
    id: opencode
  createdAt: 2026-11-25T12:00:04Z
grounds_to:
  - file: packages/shared/src/math.ts
    node: function:9b667487fd4bf70348bfe5fe7689535e
    fingerprint: mh2:64:VwBxdJcDzD4yBfagxQJRf5cIsfwnCMq0TwXOs2EBXM5DDcnVmBY3c48AwvdcBNxqPgJnjHwHYlhrBhqdbAVN59kEIOgfA0Lx3AgSQjwMNV-OB28auAmZ1cAAaQhlEDzloAMd6q8BIZdYAFE5EASO-7AHORjxAxvkfwAHAn0ExX4SBlzdUgBqkcQCgIw8AOl85A1xFdgC1TWIAH_gAAn1-iMGR6d-AxF0TAkw5X0BQaTsBZlQTArvANkjC7aaAnuhVAp9M0wFMSkZBesBnwCIA7EB1GTXA5ZsFhA1-QsEVAiCAADN8AIs9SkGjYMrAV2fgwE7TWUBmdS1BxdHCwD9UK0BCGZ1bmN0aW9uAwAmHt11-g3kNzoRkGGXVm41AHR60G0w1FMrBksIojIyi7UAuZDSmA_hHTuudObTM6JVkg
    bodyHash: 3a3dedf747de534f1572b5a27e386544b6ab3659dfa700e366431e6817355281
-->
## clamp rejects invalid ranges instead of coercing

clamp throws RangeError when any argument is non-finite or when min is greater than max; callers must supply finite, ordered bounds.

<!-- mex:entity
id: mx_01M88SV6NXM4S8M4GFDW07ZSK8
type: fact
status: promoted
revision: 1
metadata:
  aliases:
    - NaN movement
    - division by zero
    - stationary facing
relations:
  - type: refines
    target: mx_01M88SV6KFDDEH3R3W2YEVSD0V
    note: Part of packages in context/packages.md
provenance:
  createdBy:
    kind: agent
    id: opencode
  createdAt: 2026-11-25T12:00:05Z
grounds_to:
  - file: packages/shared/src/math.ts
    node: function:e9632cad644c9a253f21f13e42de1dc4
    fingerprint: mh2:64:PgVocGELDldJE5Wy9AG8nYgGNSOlCiayVgAX17QJ0KNGDcnVmAk_5z8CnDOSAT8nHQPM66oA_SjRAYIj6gbqVhwDDJFJDKPwFwj6HSsFDiWhBFKjSgGYjukAyoc4Dy3vYgUzNSwBlgG9BndgTQAj8F0EIUReAxvkfwNIDPsJEHgVAQv2CQBqkcQCgIw8AOl85A1asbECuxtJA8a1bQn1-iMH5fxAAxF0TABm18EQvCTnAM8YzwQiX3EF6PD8APm9CgY4YeIMzsLbAJfQnQCIA7EB_KAwARZuGA2Cb5AASTefAADN8AHmpDcGjYMrBdjA1AJNJysHB-NjBxdHCxLbSIUBCGZ1bmN0aW9uAgADzfWGQaKHsk-VogpbLQu8AH8N86CpmypQJ8JYKaCDMFI
    bodyHash: b4ff0e55c805976660f4b5ad6cf0557e6325b54bf43e889ca02df8f35021c512
-->
## Zero-length vectors normalize to an explicit zero vector

normalizeVector returns { x: 0, y: 0 } when the length is zero, preventing NaN components from entering movement or facing math.

<!-- mex:entity
id: mx_01M88SV6PD4V198TYKF1PFSH2S
type: fact
status: promoted
revision: 1
metadata:
  aliases:
    - position snapping
    - quantized movement
    - network float precision
relations:
  - type: refines
    target: mx_01M88SV6KFDDEH3R3W2YEVSD0V
    note: Part of packages in context/packages.md
provenance:
  createdBy:
    kind: agent
    id: opencode
  createdAt: 2026-11-25T12:00:06Z
grounds_to:
  - file: packages/shared/src/math.ts
    node: function:5866e4fe45162e4fafb717953de1dc5d
    fingerprint: mh2:64:FhbpaU8OYTzwFb-G-Aoa0w8IsfwnCl1dOgXOs2EBXM5DJVDpDBjNATYMRc8_EOpjngA9VwwC3gmDCOYxnRPU7CADIjGZMJUQNQGNUskJuXFWB_i9RRJuTgwBq9_dBRqA-AMVZMsDAttRBU_WUAtMs_0eaBwEAxvkfwAHAn0ExX4SFZoNOwBqkcQCgIw8AOl85A_F9AUEsM40ALMz5An1-iMiJNI5AUoXUzGk_KQItEmaDrP8XgrvANkJO7xlAnuhVA1NdDQII2EjBesBnwXJd8IC075LEHFM9hj6gQsPfESLIqMrVgLpUpkZJTLaAV2fgwNcLp0MVr8xBxdHCwkOON4BCGZ1bmN0aW9uAQDEXmFiOgAAUtB0D0EXdI7x
    bodyHash: 79df076ae91fae026dad38cb462361f438b50d65cc74dde1587b3741ff7dc1ff
  - file: packages/shared/src/math.ts
    node: function:386f22a661c81797c79d40dfa196df10
    fingerprint: mh2:64:EQyBIIIPZYeVFb-G-BY4lJsW41fyCzp99wXOs2ES49rkA7isbRjNATYjOBZMEOpjngPM66oNXbOFDEWL-xPU7CAFfVWfAye5rggSQjwQShhAB_i9RTMd3jsBq9_dH2MM5iPEV8sDAttRBndgTQtMs_0WOOyQAxvkfxarIe8DtFrHFZoNOwBqkcQCgIw8AOl85AO5RV4FNsm9BPhF-An1-iMiJNI5AxF0TANcprgQvCTnDrP8XgrvANkr8guKCHPvuxaQoLk4cAq_BesBny8mw3IC075LAnGVAxj6gQsPfESLIqMrVgLpUpkJ6S7eB-2bMgE5FNMS8VdCBxdHCx6gxxUBCGZ1bmN0aW9uAQDEXmFiOgAAUtB0D0EXdI7x
    bodyHash: 3331df1d52f64689b086aabcdf12eb06830c14c48422e3dca029d3b2c5b0c159
-->
## Tile coordinates quantize to sixteenths with rounding

quantizeToSixteenth multiplies by 16 and rounds, while dequantizeFromSixteenth divides by 16; a position sent through both is snapped to the nearest 1/16 tile and is not bit-identical to the original.

<!-- mex:entity
id: mx_01M88SV6PV38XV2S0QSWAHN27B
type: fact
status: promoted
revision: 1
metadata:
  aliases:
    - turning the long way
    - facing wrap-around
    - shortest rotation
relations:
  - type: refines
    target: mx_01M88SV6KFDDEH3R3W2YEVSD0V
    note: Part of packages in context/packages.md
provenance:
  createdBy:
    kind: agent
    id: opencode
  createdAt: 2026-11-25T12:00:07Z
grounds_to:
  - file: packages/shared/src/math.ts
    node: function:11ba36a141baa1506c8c69fdbbbb03e3
    fingerprint: mh2:64:SgATW6EOYTzwAH58sAJRf5cCVvlsAiHP_AXOs2EBoLx0A7isbQHy9CEKzjbdBgLeDQA9VwwByaDJAjgNJhAidIADIjGZD2BhbgAAZksNUm4nB_i9RQGYjukH7wc6ATf0bwMVZMsBIZdYAfq8hQtMs_0HORjxAsW1rQafLBYBqWodAGh5KQBqkcQCgIw8AOl85ABsh7UBE3wpALMz5ABSCA4GR6d-ARb4cQ6h1J8De7NZCJceBwVhIBIAj149Al_LoQIdYkkBKclcAucsoQCIA7EC075LAnGVAwhGJtACxxoGAADN8ADPZWkGjYMrA-XZQwJNJysIQgl2AZPtgQkOON4BCGZ1bmN0aW9uAQDNi4vekE_IZV_vipDczCZU
    bodyHash: 06231c184ab7ac575c46769f28ce71e25b179e9356767a172cf6d3d7ce4a8208
-->
## Angle difference wraps into a half-turn range

shortestAngleDifference reduces modulo 2*pi, then shifts values above pi down by 2*pi and values below -pi up by 2*pi, so the result never exceeds a half turn in magnitude.

<!-- mex:entity
id: mx_01M88SV6QB3PTDYTHADB24E907
type: fact
status: promoted
revision: 1
metadata:
  aliases:
    - negative tile lookup
    - chunk boundary wrap
    - out of range tile index
relations:
  - type: refines
    target: mx_01M88SV6KFDDEH3R3W2YEVSD0V
    note: Part of packages in context/packages.md
provenance:
  createdBy:
    kind: agent
    id: opencode
  createdAt: 2026-11-25T12:00:08Z
grounds_to:
  - file: packages/shared/src/ids.ts
    node: function:cadc475edf02244facb89737d6578ecf
    fingerprint: mh2:64:KAATW6ERbMLaBo2cFRFVH6wIsfwnCzp99wIy04cChW1jFOdIWxTGzu8OrfZRDcPG7QQFfrMApFoVFrfhMxwwDE8PjIqJFg3Txw9MxVYGRVykCfUNFwRly_QAyoc4Dy3vYgUzNSwAZUnmEoG23A44sZMbXAfQBPoudwGk__s403XNEoo7ZwY6nUcCgIw8Gwkf8APOSU4rJxVTHOHBKQ3_h4MGz2x_AxF0TAh9c8MQvCTnDpOMSwQiX3EP4rdbAnuhVAap6o4cMvlKDIvc9gSjSTIRzkoZARZuGCegIYMGRt-nAADN8ADPZWkBK6CeBJvQbBwSxWQVPh4pC2Mr2xaB-e8AAA
    bodyHash: b77477fd351dc313f91a5bbd9066e41d0332c929d98209a66dfd2b73543a6fa3
  - file: packages/shared/src/ids.ts
    node: function:659d33431178a3f1f173858570cfe625
    fingerprint: mh2:64:OwATW6EJjMdgAh4RSQaz5ZQBb4rBFsLZQgPoh00BXM5DIEVLiwII3rgKzjbdA9qzHQQFfrMALg7xAL4ZAwrCCD4HYbKxHbtw7hOzH2kHqL3fAFd05ARly_QAyoc4ASHf7AAOab4BlgG9Cv7Qfwd9oyMS1eSGAJ2HJAAHAn0ExX4SAQv2CQY6nUcDhJWxDOw4dgPOSU4KpAnaArYREAJ3z84Pf72UAxF0TAktuU4EKiDaDKK0oAQiX3EC2kH8AnuhVAZ1AOQdoP-pAJfQnQlAzCQHyp5HAqgKXAGxSXsKeCtLDK1T_wDPZWkRIBzRA-XZQw2q0IcMVr8xBWe_6wCT0lQAAA
    bodyHash: 6915982e4c3065fdb75331a22f09de508193ab0e12a64810eec72406f2d1cbff
-->
## Negative tile coordinates use wrapping local indices

chunkCoordOfTile floors toward negative infinity, so negative tiles map to negative chunk indices, while localTileIndex applies a double modulo to wrap negatives into [0, CHUNK_SIZE) before packing z, y and x.

<!-- mex:entity
id: mx_01M88SV6QXA2H040V1Y10FZN9C
type: fact
status: promoted
revision: 1
metadata:
  aliases:
    - floor collision
    - shared chunk cache
    - missing floor in key
relations:
  - type: refines
    target: mx_01M88SV6KFDDEH3R3W2YEVSD0V
    note: Part of packages in context/packages.md
provenance:
  createdBy:
    kind: agent
    id: opencode
  createdAt: 2026-11-25T12:00:09Z
grounds_to:
  - file: packages/shared/src/ids.ts
    node: function:357c189a162b3715a3c59e8e69a6fb02
    fingerprint: mh2:64:FwATW6EKdeezBkDN-BPpSrQIsfwnFpEBvAApasEChW1jDjKEyxTGzu8OrfZRGeAOeQQFfrMC8y43EXpFZwOOnVYIJTWHLSnwwgHkLoYOiUfjC2hN3wFe-CcAyoc4BvkZ-wUzNSwBlgG9CV_afge_OcA4gSatB80K9yp8uEovddmcEoo7ZwNn4nMHxrSeEIMZ1gPOSU4OiUAYAMzm6gvOxmcWXOJkAxF0TAdi4pkf9SKrDMdfBQQiX3EJIRBtAnuhVAVH0XorWrb4EL1Qaw4wMCADc56RAqgKXAWPpZYKeCtLGEZBqADPZWkYHjWyBBvS6hwSxWQU9s2xDKj8mgHyweUAAA
    bodyHash: 14546bd60c2892893e88284419b0dab94e6921efd314fdf62496af81f9985e23
-->
## Chunk keys identify a column, not a floor

chunkKey formats only cx and cy as 'cx,cy'; all floors of a chunk share one key, so any per-floor data must carry z separately.

<!-- mex:entity
id: mx_01M88SV6RFJT85ZYTW3BKXMVXA
type: fact
status: promoted
revision: 1
metadata:
  aliases:
    - invalid entity id
    - id overflow
    - safe id construction
relations:
  - type: refines
    target: mx_01M88SV6KFDDEH3R3W2YEVSD0V
    note: Part of packages in context/packages.md
provenance:
  createdBy:
    kind: agent
    id: opencode
  createdAt: 2026-11-25T12:00:10Z
grounds_to:
  - file: packages/shared/src/ids.ts
    node: function:7e3cfb06c4ba9f099d6868443af0ac66
    fingerprint: mh2:64:LAATW6EDzD4yANfDzgX__ywIsfwnAgzCfwMZZyAChW1jDcnVmARrd5wAwvdcAlq37APM66oHYlhrBlcyIQVN59kBM9-HBgPUaQLx95kFDiWhBVpLcQRly_QAaQhlAe5XVQMd6q8BIZdYAFE5EASO-7AOQIqMB80K9wQtqqYH_m9JAxcNJgupRJoCgIw8AOl85AJ08BYMWQJfAH_gAAn1-iMEi4WrAxF0TANTqwMBQaTsA-bEewOVuN4M46sRAnCdBRMmb-4AqJ_7AMwj8wLDxH4MGNa0ARZuGBH-DxgEVAiCArUCVQDPZWkOoRFXAV2fgwE7TWUBmdS1DKj8mhW871QAAA
    bodyHash: 689892268142582deb5b0574604658e5e45f4f8457d24f0ebcaa7a480ff8373e
-->
## Entity ids are validated unsigned 32-bit integers

asEntityId throws RangeError unless the value is an integer between 0 and 0xffffffff; other branded id helpers are unchecked casts and rely on upstream validation.

<!-- mex:entity
id: mx_01M88SV6S017746H3BZGNT0RNH
type: fact
status: promoted
revision: 1
metadata:
  aliases:
    - oversized chat rejected
    - input tick bounds
    - protocol reject reasons
relations:
  - type: refines
    target: mx_01M88SV6KFDDEH3R3W2YEVSD0V
    note: Part of packages in context/packages.md
provenance:
  createdBy:
    kind: agent
    id: opencode
  createdAt: 2026-11-25T12:00:11Z
grounds_to:
  - file: packages/protocol/src/client.ts
    node: constant:a070e648f6705406c69927522fc450c3
    fingerprint: mh2:64:JwBxdJcEFuOCBo2cFRFVH6wIsfwnBSjaKQIy04cHKsUXBSXypQNw3DADdX21ACPKkwQFfrMC8y43AYIj6gHaE10PjIqJC-aZ9A9MxVYjLwD1ANe4UAcpiZwAyoc4AI_veQUzNSwBlgG9AJ0JYQlbWSgesPjXH5y5twQtqqYEwKK4Eoo7ZwB7J_ACgIw8Cd-2URItStQFoBdDA8a1bQF1Sd8Gz2x_BR7lqQdYNOwBQaTsGnRdzAPErXcJgjfJAnuhVBfnBd8VKlrxC4YjpALDxH4B_KAwEHFM9hA1-QsAxQvFAADN8ADOU4MJX7K6CKJ0LQvIkBsavevdA6WMlBOSZhkAAA
    bodyHash: 0662e780d96b017dd03bc1e348f3d23bd081323b7652592ef5200c4734010623
  - file: packages/protocol/src/client.ts
    node: constant:9b7f50cc91712f8234b58c4e3cedc082
    fingerprint: mh2:64:lgMAcXSXAtIEugaNnBUCd-kdBqw3sQPkljUFzrNhByrFFwAoQMYDcNwwA3V9tQAcl04CLCI-AVw9MAGCI-oAYjRTBC3QrwALH-IAuESEADdLrgDXuFABWB7wAARougCP73kCSMEBAS5IbACdCWEEjvuwCUOQ4Q3Fqj8ELaqmBMCiuAMR70kAeyfwAoCMPAPBB4QGpj0pBIlDQgPGtW0BdUnfAfI4ZgRWeT0HWDTsAUGk7A4bYjQAiw-JCXhsRgBRaE0EC215AH_iBwccX8UAY83bAfygMAdwjmcDXfkwAMULxQAAzfAAzlODBIMDIgeTX-wAg7KjAhZSCwOljJQJ2A_1AAA
    bodyHash: e53356c364e561881cf1a55ca02e8ea568f2297dbe7d38852b3111afae99c268
-->
## Client messages have hard size and range limits

ClientEnvelope accepts only v equal to PROTOCOL_VERSION with a nonnegative cs, and ClientMessage limits hello token to 4096 chars, reconnectToken to 128, chat text to MAX_CHAT_CHARS (200), input dtMs to 1..100 and inventory quantity to 1..999.

<!-- mex:entity
id: mx_01M88SV6SKJ3H7K8YBP8K5RTY1
type: fact
status: promoted
revision: 1
metadata:
  aliases:
    - latency echo
    - snapshot acknowledgement
    - inventory failure reasons
relations:
  - type: refines
    target: mx_01M88SV6KFDDEH3R3W2YEVSD0V
    note: Part of packages in context/packages.md
provenance:
  createdBy:
    kind: agent
    id: opencode
  createdAt: 2026-11-25T12:00:12Z
grounds_to:
  - file: packages/protocol/src/server.ts
    node: constant:4e80dc36b61ae62b95d6cc0c1240e9a4
    fingerprint: mh2:64:JwBxdJcEFuOCBo2cFRFVH6wIsfwnBSjaKQIy04cHKsUXBSXypQNw3DADdX21ACPKkwQFfrMC8y43AYIj6gHaE10PjIqJC-aZ9A9MxVYjLwD1ANe4UAcpiZwAyoc4AI_veQUzNSwBlgG9AJ0JYQlbWSgesPjXH5y5twQtqqYEwKK4Eoo7ZwB7J_ACgIw8Cd-2URItStQFoBdDA8a1bQF1Sd8Gz2x_BR7lqQdYNOwBQaTsGnRdzAPErXcJgjfJAnuhVBfnBd8VKlrxC4YjpALDxH4B_KAwEHFM9hA1-QsAxQvFAADN8ADOU4MJX7K6CKJ0LQvIkBsavevdA6WMlBOSZhkAAA
    bodyHash: 9d962acbaab217a3344bdcb3ba24296fcecf623b8627ef6537c39f909ec9fb70
  - file: packages/protocol/src/server.ts
    node: constant:9b185e01785e42a59c5289f520bd401a
    fingerprint: mh2:64:pAIAcXSXBBbjggQgtPECd-kdBqw3sQPkljUCMtOHAbdO5wAoQMYDcNwwA3V9tQAjypMEBX6zAZMp0AGCI-oB2hNdBC3QrwvmmfQAuESEADdLrgDXuFABWB7wAARougCP73kCSMEBAS5IbACdCWEEjvuwCUOQ4Q3Fqj8ELaqmBMCiuAMR70kAeyfwAoCMPAcE6c4DHYS8BIlDQgPGtW0BdUnfBs9sfwUe5akHWDTsAUGk7A4bYjQAiw-JCXhsRgJ7oVQEC215C0gfPAcyiWMAY83bAfygMAeoNiIQNfkLAMULxQAAzfAAzlODBQmF3geTX-wAg7KjAhZSCwOljJQJ2A_1AAA
    bodyHash: 1a311861e476629cbdc54ebea657a9c11284888de241c7ecba0ca064472a366b
-->
## Server replies carry sequences and typed payloads

ServerEnvelope pins v to PROTOCOL_VERSION and adds a monotonic ss, while ServerMessage covers welcome with a reconnectToken and optional entityId, snapshot with ackInput and entity coordinates in 1/16-tile units, inv.result with container versions, sound, pong echoing t and error with a fatal flag. The optional entityId preserves parsing compatibility with older welcome messages.

<!-- mex:entity
id: mx_01M88SV6T494F2GFADVP99QFMX
type: fact
status: promoted
revision: 1
metadata:
  aliases:
    - socket close reason
    - custom disconnect codes
    - typed failure signal
relations:
  - type: refines
    target: mx_01M88SV6KFDDEH3R3W2YEVSD0V
    note: Part of packages in context/packages.md
provenance:
  createdBy:
    kind: agent
    id: opencode
  createdAt: 2026-11-25T12:00:13Z
grounds_to:
  - file: packages/protocol/src/errors.ts
    node: constant:574a9a6cecadfbc38827309fbf1fb48f
    fingerprint: mh2:64:Tgf3fE9I5B37E5Wy9ASa72IE-Sd3EDTqbQIy04cF-1yMGd8lLgk_5z8OjHIiAbNQBh9jT6odYBDbM3wvbgRo-Q8DDJFJDKPwFxPcaN4kWt72B7XOMStDpQUJCcFSJVlL2haT-aQRsC7rKcgYhAAj8F0uXMmfCF9ncQtm31AbqWdpBGgNmwYtwv0cYsL-anEIRQ1asbFFeOrUCRoXEjgv1eE3WcqMO1-C4xvguJADp56TS7vb6wmPpX8SXG6fAPm9CgY4YeIIhVoMDIvc9iNha7oe7n5nGXlK1kLB-zkASTefAADN8AWegg4O7XHBBdjA1AqTCIc8ZqmoCMtqCDQkcKwAAA
    bodyHash: 840305a3eba5b4c2b6e1d15d26b86ef8c7904c2041dd2a5e22f4b4b3c8f32f3c
-->
## Application close codes occupy 4000-4009

CloseCode reserves 4000 through 4009 for Lanternfall-specific failures such as HelloTimeout, DuplicateSession, ReconnectRejected and ProtocolViolation, distinct from standard WebSocket codes 1000-1013.

<!-- mex:entity
id: mx_01M88SV6TPKPVWBP5VADWAZNW4
type: fact
status: promoted
revision: 1
metadata:
  aliases:
    - leaky test spies
    - slow test timeout
    - shared test defaults
relations:
  - type: refines
    target: mx_01M88SV6KFDDEH3R3W2YEVSD0V
    note: Part of packages in context/packages.md
provenance:
  createdBy:
    kind: agent
    id: opencode
  createdAt: 2026-11-25T12:00:14Z
grounds_to:
  - file: packages/config/vitest/base.ts
    node: constant:80db949865b918e2cc2ae7c19b2f26b4
    fingerprint: mh2:64:IAf3fE8HUJLaD__NswSa72IFHDJ3DNkx2wIy04cfJ9pRRynyXQDyzUMLr8gyATWptQ_9dXYVnS97AYIj6kSuzlYDDJFJBJkDwg9MxVYDk0LvC0K30RDxGggHauHWCa3yIQc4OLMZZwB6GjjZLAAj8F0FH7oxDPrAPwtm31Aahk6uDn7FKBFcjgkG00UlGwkf8ASbCfUPqcAEA8a1bQ0QA8QaChH6CXqiaw6c3icis2gdGPv-6wmPpX8GpDuoAPm9CgFP_scJEznJBTVaDhvHA58DhC6zCgCsER7pY28ASTefAADN8AWegg4JX7K6BdjA1A2_3cUOQ5LaBDdOsQVXppwAAA
    bodyHash: 51e283246523469e633a567465cba196f07ca0e7c51806decc3f0e08fc8a0e16
-->
## Shared test config resets mocks between tests

baseTestConfig sets a Node environment, 15 second test and hook timeouts, and enables restoreMocks and clearMocks so workspace tests do not inherit spy state.
