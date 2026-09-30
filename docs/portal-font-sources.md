# Portal fonts

Local-only SIL Open Font License 1.1 fonts; no runtime Google Fonts requests.
Original copyright notices and full licenses are beside each family.

- Bungee: The Bungee Project Authors; display heading and missing-art initials.
- Atkinson Hyperlegible: Braille Institute of America, Inc.; body/control text,
  regular 400 and bold 700.

Official source families: https://github.com/google/fonts/tree/24ecb0bbdc3a52d6fddef160b769c61463f455d9/ofl/bungee
and https://github.com/google/fonts/tree/24ecb0bbdc3a52d6fddef160b769c61463f455d9/ofl/atkinsonhyperlegible .
OFL.txt files are unmodified snapshots at that revision.

Google's official distribution supplies already-subset Latin WOFF2 files.
These are unmodified downloads, not locally converted or newly generated fonts.
The source revision pins the license snapshots, not a claimed WOFF2 build.
The distribution URLs and SHA-256 hashes below pin the actual binaries.

| Local file under assets/fonts/ | Bytes | SHA-256 |
|---|---:|---|
| bungee/bungee-400-latin.woff2 | 14344 | `126eec706b7931682dbcf6c6efc274132c603f181fbf912678e6cfeb341e721b` |
| atkinson-hyperlegible/atkinson-hyperlegible-400-latin.woff2 | 17208 | `d64ba838ef5472bba248620ec4fd8b5aa7cf0db2908e0bb230600caf279ba7bc` |
| atkinson-hyperlegible/atkinson-hyperlegible-700-latin.woff2 | 17524 | `140e2bd25a7315c8a062508391426b0d8c3297400c947b8d847be28f73a199f0` |

Exact distribution sources, in table order:

- https://fonts.gstatic.com/s/bungee/v17/N0bU2SZBIuF2PU_0DXR1.woff2
- https://fonts.gstatic.com/s/atkinsonhyperlegible/v12/9Bt23C1KxNDXMspQ1lPyU89-1h6ONRlW45G04pIo.woff2
- https://fonts.gstatic.com/s/atkinsonhyperlegible/v12/9Bt73C1KxNDXMspQ1lPyU89-1h6ONRlW45G8Wbc9dCWP.woff2

Selected from the Latin blocks of the official Google Fonts CSS response for
`family=Atkinson+Hyperlegible:wght@400;700&family=Bungee&display=swap`.
Latin coverage includes basic Latin, accented Western European letters, and
common punctuation. Unsupported glyphs retain the CSS fallback; this is not a
complete international font pack.

Verification: `file assets/fonts/*/*.woff2`, `sha256sum assets/fonts/*/*.woff2`;
portal browser regression verifies all three local font faces are loaded.
