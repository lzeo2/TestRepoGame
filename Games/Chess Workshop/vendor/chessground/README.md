# Lichess Chessground 9.2.1

Chess Workshop uses the open-source board by Thibault Duplessis and
[Lichess contributors](https://github.com/lichess-org/chessground).
Chessground is distributed under [GPL 3.0 or later](LICENSE).

The unmodified ESM bundle and base stylesheet come from the
[official npm release](https://registry.npmjs.org/chessground/-/chessground-9.2.1.tgz).
The package pins [revision 7179b0e472ffafa397a4a5db7aeffb8fdcdb7ac5](https://github.com/lichess-org/chessground/tree/7179b0e472ffafa397a4a5db7aeffb8fdcdb7ac5).
The [corresponding source archive](chessground-9.2.1-source.tar.gz) is the
complete checkout at that revision with its license, TypeScript sources,
styles, build scripts, configuration, and pnpm lockfile.

To reproduce the ESM bundle, unpack the upstream source in a temporary build
directory, run `pnpm install --frozen-lockfile`, then `pnpm run bundle`. It
writes `dist/chessground.min.js`. Chess Workshop adds the plain-text
`board.js` adapter and `chessground.css` styling in the same public game folder.

| File | SHA-256 |
| --- | --- |
| `chessground.min.js` | `915457e1a6b84abd9778d3ea5317a9fccaf59f4caa78196efbd92f586c0f0e9b` |
| `chessground.base.css` | `77cbfd65f9b3f64f310a0b8eab0e34ef9f364172e4f678fc05c114b385a341a6` |
| `LICENSE` | `8ceb4b9ee5adedde47b31e975c1d90c73ad27b6b165a1dcd80c7c545eb65b903` |
| `chessground-9.2.1-source.tar.gz` | `af1e3f526549436b295cb632f42e49e484921cc1df12ce8793bc388606b0fc6d` |

The original npm tarball SHA-256 is
`6bcb9f102c05aa1d5e3cfe9eb82338fb79d829cd575b545a6896706b4a06d058`.
