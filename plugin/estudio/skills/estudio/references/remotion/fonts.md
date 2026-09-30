# Fonts

> Source: distilled in our own words from `packages/skills/skills/remotion/rules/fonts.md`
> (remotion-dev/remotion, tag `v4.0.451`, commit `a06ca6db658a5d14de2a15c491c8cce546c4ed1d`). Docs:
> https://www.remotion.dev/docs/google-fonts/load-font, https://www.remotion.dev/docs/fonts-api/load-font.
> Back to the [index](index.md).

A font that has not finished loading renders as a fallback font in some frames and the Kit's font in
others. Both loaders below block rendering until the font is ready, which is why they are the only
ways to load one. Take the family, weights and styles from the Kit's type scale.

## Google Fonts: `@remotion/google-fonts`

Add the package (`npx remotion add @remotion/google-fonts`), then import the family's own module and
call its `loadFont()` at module top level (outside the component), asking only for the weights and
subsets you use, which keeps the download small:

```tsx
import {loadFont} from '@remotion/google-fonts/Montserrat';

const {fontFamily} = loadFont('normal', {weights: ['400', '800'], subsets: ['latin', 'latin-ext']});
```

Use the returned `fontFamily` in `style`. `latin-ext` matters for pt-BR accents in some families.
The result also has `waitUntilDone()`, a promise for when the files are in (needed before measuring
text, see [measuring-text.md](measuring-text.md)).

## Font files: `@remotion/fonts`

For a font file in her Kit assets, add `@remotion/fonts` and call its `loadFont({family, url, weight,
style})` once per file, all under the same `family` name, with `url: staticFile('…')`. It returns a
promise; call it at module top level so it starts before the first frame. `format` is inferred from
the extension; `display`, `unicodeRange` and similar CSS `@font-face` options are accepted too.

```tsx
import {loadFont} from '@remotion/fonts';

const kitFont = (file: string, weight: string) =>
  loadFont({family: 'MarcaSans', url: staticFile(`${kitDir}/${file}`), weight});
Promise.all([kitFont('MarcaSans-Regular.woff2', '400'), kitFont('MarcaSans-Bold.woff2', '700')]);
```

## Where to call it

Load fonts in a small module that every scene imports (or at the top of the file that uses them),
never inside a component body or an effect: those run per frame or too late.
