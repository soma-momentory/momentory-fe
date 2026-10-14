# iOS 26 / iPadOS 26 UI Kit — Design System

A code design system rebuilt from the community Figma file **“iOS and iPadOS 26 (Community).fig”**, attached
to this project and mounted read-only. Every colour, radius, height, font size, line-height and tracking
below was read off that file's own frames and Variable collections — nothing is rounded to a 4/8-px grid and
nothing is recalled from public documentation.

## What this is

This is not a product brand. It is the **platform** design system that third-party iPhone and iPadOS apps are
designed against: the system colour ramps, the Dynamic Type scale, the blur materials and Liquid Glass
surfaces, and the standard controls (buttons, toggles, sliders, lists, bars, sheets, menus). Use it to mock
or prototype an app that should look native on iOS 26 / iPadOS 26.

**Sources given**

- `iOS and iPadOS 26 (Community).fig` — mounted virtual filesystem. 46 pages, 29,846 nodes,
  362 component sets + 1,825 standalone symbols, 130 Figma Variables across 5 collections.
  No public URL was supplied; if you have the file, the page names in this readme map 1:1 to its pages.
- No codebase, repository, slide deck or brand guideline was provided.

**No logo exists in the source.** The file carries no wordmark or brand mark for itself, so nowhere in this
system is one drawn. `thumbnail.html` sets the system's name in type, and `AppIconTile` ships as an empty
squircle you fill with your own artwork.

## Index

| Path | What it is |
| --- | --- |
| `styles.css` | The single entry point consumers link. `@import`s only. |
| `tokens/fonts.css` | Font stacks and the five SF Pro weight stops. |
| `tokens/colors.css` | 89 colour variables × 4 modes (Light, Dark, Increased Contrast light/dark) + the Liquid Glass Dim context. |
| `tokens/metrics.css` | Liquid Glass floats, sheet radii and the geometry read off the source frames. |
| `tokens/typography.css` | Dynamic Type scale tokens + `.ios-*` text-style classes. |
| `tokens/materials.css` | The five blur materials, Liquid Glass fills, protection gradients, key fills. |
| `tokens/base.css` | Reset and link colours. |
| `components/controls/` | Button, GlassButton, BackButton, DoneButton, Toggle, Slider, Stepper, SegmentedControl, PageControl, ProgressBar, ActivityIndicator, PopUpButton |
| `components/forms/` | TextField, SearchField, DatePicker, PickerWheel, ColorPicker, ColorSwatch, ColorGrid, AutocorrectionBar |
| `components/lists/` | ListSection, ListRow, SwipeActions, Disclosure, ProminentHeader, NestedHeader, RowAction, PickerRow |
| `components/bars/` | StatusBar, StatusBarIPad, NavigationBar, NavigationTitle, TabBar, TabBarButton, TabBarIPad, Toolbar, ToolbarIPad, Sidebar, SidebarToolbar, SidebarSectionHeader, SidebarSearchField, MenuBar, AccessoryBar |
| `components/overlays/` | Alert, ActionSheet, ActionSheetButton, Overlay, BottomButtons, CardTop, Menu, MenuItem, EditMenu, TextSelection, Popover, Sheet, ActivityView, Notification, Lollipops, EmptyState |
| `components/system/` | Material, SFSymbol, AppIconTile, Widget, WidgetControl, Keyboard, DeviceFrame, WindowChrome, DocumentHeader, ResizeGrabber, FaceIDPrompt, Badge, Grabber |
| `components/parts/` | Separator, SectionTitle, TableFooter, SliderTrack, SliderKnob, SliderTicks, Dot, Checkmark, Chevron, CloseButton, EditButton, ListThumbnail, ProtectionGradient, ScrollEdgeEffect, ButtonGroup, LabelText, LabelSymbol |
| `components/keyboard/` | KeyboardKey, SpaceKey, ReturnKey, ShiftKey, DeleteKey, NumericKeyboard, EmojiTabs, EmojiSearchField, FindField, ReplaceField, AccessoryBarFind, AccessoryBarReplace, AccessoryBarNext, AccessoryBarPrevious, AccessoryBarReplaceAction, AccessoryBarButton, AccessoryBarFindBar, AccessoryBarURL, AccessoryBarWebForm, AccessoryBarEditingTools |
| `components/springboard/` | Dock, AppIconRow, LaunchPad, HomeScreenQuickActions, ControlCenter, LockScreen, NotificationStack, ContactAvatar |
| `guidelines/` | 24 foundation specimen cards (Colors, Type, Materials, Spacing, Brand). |
| `ui_kits/iphone/` | *Field Notes* — clickable five-screen iPhone app. See its README. |
| `ui_kits/ipad/` | *Field Notes* — iPadOS three-column split view, windowed mode, Home Screen. |
| `templates/iphone-screen/` | Starting template: 402×874 iPhone screen (status bar, large-title nav, grouped list, tab bar). |
| `templates/ipad-split-view/` | Starting template: 1024×768 iPadOS three-column split view. |
| `assets/icons/` | Status-bar cellular + Wi-Fi vectors and menu-bar shapes, copied from the source. |
| `assets/images/` | The source's list-thumbnail placeholder bitmap. |
| `SKILL.md` | Agent-Skills front matter so this folder works as a Claude Code skill. |

### Components (118 built)

AccessoryBar · AccessoryBarButton · AccessoryBarEditingTools · AccessoryBarFind · AccessoryBarFindBar ·
AccessoryBarNext · AccessoryBarPrevious · AccessoryBarReplace · AccessoryBarReplaceAction ·
AccessoryBarURL · AccessoryBarWebForm · ActionSheet · ActionSheetButton · ActivityIndicator · ActivityView · Alert ·
AppIconRow · AppIconTile · AutocorrectionBar · BackButton · Badge · BottomButtons · Button · ButtonGroup ·
CardTop · Checkmark · Chevron · CloseButton · ColorGrid · ColorPicker · ColorSwatch · ContactAvatar ·
ControlCenter · DatePicker · DeleteKey · DeviceFrame · Disclosure · Dock · DocumentHeader · DoneButton ·
Dot · EditButton · EditMenu · EmojiSearchField · EmojiTabs · EmptyState · FaceIDPrompt · FindField ·
GlassButton · Grabber · HomeScreenQuickActions · Keyboard · KeyboardKey · LabelSymbol · LabelText ·
LaunchPad · ListRow · ListSection · ListThumbnail · LockScreen · Lollipops · Material · Menu · MenuBar ·
MenuItem · NavigationBar · NavigationTitle · NestedHeader · Notification · NotificationStack ·
NumericKeyboard · Overlay · PageControl · PickerRow · PickerWheel · PopUpButton · Popover ·
ProgressBar · ProminentHeader · ProtectionGradient · ReplaceField · ResizeGrabber · ReturnKey · RowAction ·
ScrollEdgeEffect · SearchField · SectionTitle · SegmentedControl · Separator · SFSymbol · Sheet ·
ShiftKey · Sidebar · SidebarSearchField · SidebarSectionHeader · SidebarToolbar · Slider · SliderKnob ·
SliderTicks · SliderTrack · SpaceKey · StatusBar · StatusBarIPad · Stepper · SwipeActions · TabBar ·
TabBarButton · TabBarIPad · TableFooter · TextField · TextSelection · Toggle · Toolbar · ToolbarIPad ·
Widget · WidgetControl · WindowChrome

Each directory holds `<Name>.jsx`, `<Name>.d.ts`, `<Name>.prompt.md` and one `@dsCard` preview page.

**How the nine groups divide up.** `controls`, `forms`, `lists`, `bars`, `overlays` and `system` are the
composed components you place. `parts` holds the atoms those are assembled from — the source's `_Separator`,
`_Track`, `_Knob`, `_Chevron`, `_Label - Text` and friends — exposed because a code system needs them
reachable when you build something the composed set does not cover. `keyboard` and `springboard` are the
two large surface families (keyboard layers; Home Screen / Lock Screen / Control Center).

---

## CONTENT FUNDAMENTALS

The source file is a UI kit, so its "copy" is the label text on its own controls. That text is remarkably
consistent, and it is the house voice for anything built with this system.

**Casing.** Title Case for anything a user can tap or that names a place: `Play`, `Done`, `Add People`,
`All Notes`, `Move to Folder…`, `Delete Account`. Sentence case for explanatory prose: `Joining a network
shares it with your other devices.` Section headers in grouped lists are **UPPERCASE** at Footnote size
(`NETWORK`, `ACCOUNT`, `APPEARANCE`) — never Title Case, never sentence case.

**Length.** Button labels are one or two words. The file's own examples are `Play`, `Done`, `Cancel`,
`Label`. Alert titles are a question when they ask for a decision (`Delete Album?`) and a statement when
they report one. Descriptions run to one sentence; two is the ceiling.

**Person.** Second person for instructions to the user (`Look at your iPhone`, `Notes you archive appear
here`). First person only in possessives the system owns on the user's behalf (`My Albums`). Never "we".

**Empty states name the content, not the absence.** The source's Empty State component pairs a Message with
a Description at the same 22px size: `No Albums` / `Albums you create appear here.` Not "Nothing here" and
not "Error: no data".

**Destructive copy says the noun.** `Delete Album?`, `Move to Trash`, `Delete All Notes` — never "Are you
sure?" alone, never "Confirm".

**Numbers and units.** Plain, unpadded, with a thin separator: `1.2 GB of 5 GB`, `24 albums`, `9:41`,
`Fri 9:41`. Metadata lines join facts with a middle dot: `Note · 1.2 KB`, `2 min ago · Spec`.

**Ellipsis means "a further choice is coming".** `Move to Folder…` opens a picker; `Move` does the thing.
Always the single character `…`, never three periods.

**No emoji anywhere.** The source file contains none outside the emoji keyboard's own key faces. Icons are
SF Symbols; if you want an emoji, you want a symbol.

**No exclamation marks, no marketing voice.** The vibe is a calm, competent utility: it states the fact,
offers the action, and gets out of the way.

---

## VISUAL FOUNDATIONS

**Colour.** Four ramps, and you pick by role, never by hue:
`--labels-{primary,secondary,tertiary,quaternary}` for text; `--fills-{primary…quaternary}` for translucent
control substrates; `--backgrounds-{primary,secondary,tertiary}` (plus `-grouped-` variants) for surfaces;
`--separators-{opaque,non-opaque,vibrant}` for hairlines. On top of a blur material you switch to the
`--labels-vibrant-*` ramp — the plain ramp is too weak there. Twelve accents (`--accents-blue` is the default
tint at `rgb(0,136,255)`, which is *not* the older `rgb(0,122,255)`). Every ramp re-tints across four modes:
Light, Dark, and Increased Contrast for each. Set `data-theme="dark"` and/or `data-contrast="high"` on the
root — or use the `.dark` / `.contrast-high` classes on any subtree.

**Type.** One family: SF Pro (SF Compact on keyboard keys, at weight 457). Eleven Dynamic Type styles at the
Large content size, 34/41 down to 11/13, with negative tracking that shrinks as size drops
(−0.43 at 17px, −0.23 at 15px, −0.08 at 13px, then positive 0.06 at 11px). Weights are the variable-font
stops the file actually uses: 400 / 510 / 590 / 700 / 860. Control type has its own odd-but-exact sizes —
the segmented-control label is **13.333px**, and that is the value in the file.

**Spacing and layout.** 16px is the content inset on every screen. The tab bar pulls in to 25, the bottom
search bar to 28, and grouped section headers hang at 32 (16 screen inset + 16 card inset). Vertical metrics
are fixed, not fluid: 28 small button / toggle, 32 segmented, 34 medium button, 43 keyboard key, 44 nav
controls row + sidebar row + minimum hit target, 48 glass button + search field, 50 large button,
52 list row, 62 iPhone status bar, 95 tab bar. iPhone screens are 402×874; iPad 1024×1366.

**Corner radii.** 8.5 key · 12 list card · 13 menu/popover/date picker · 14 alert and sheet cards ·
20 segmented pill · 24 widget and notification banner · 34 iPhone sheet top (58 bottom, 38 iPad) ·
44 iPhone screen · and `1000px` for anything pill-shaped. Buttons, toggle tracks, segmented tracks, sidebar
rows and tab pills are all fully rounded — there is no "slightly rounded rectangle" button in this system.
App icons are squircles, approximated here at 25.6% of the edge.

**Backgrounds.** No photography or illustration ships in the system itself; wallpapers in mocks are the only
place imagery appears, and the source's own wallpapers are Apple artwork so they are not redistributed here
(see CAVEATS). Screens are flat token colours: grouped screens sit on `--backgrounds-grouped-primary` with
white cards on top. No patterns, no textures, no noise, no decorative gradients.

**Gradients — only two legitimate kinds.** (1) *Material stacks*: each blur material is two flat translucent
layers, expressed as stacked `linear-gradient()`s only because Figma stacks fills. (2) *Protection
gradients*: `--edge-top` is a black-to-transparent ramp that guarantees contrast for status-bar ink over
arbitrary content, and `--scroll-edge-effect-blur-radius` (10) is the scroll-edge blur. Everything else is a
flat fill. There are no decorative brand gradients, and never a blue-to-purple one.

**Transparency and blur.** Blur is the system's signature, and it is used for one reason: to let content show
through chrome. Five materials, thinnest to most opaque — ultrathin, thin, regular, thick, chrome — all at a
100px backdrop blur. Liquid Glass adds refraction/depth/frost parameters (`--liquid-glass-*`: depth 16,
frost 7/12/14, refraction 100, opacity 60, light angle −45°) to floating controls: the tab bar pill, glass
buttons, the bottom search field, toolbar capsules. Rule of thumb: chrome that floats over content is glass;
chrome that *is* the content's surface is a flat token colour.

**Shadows.** Sparse and soft. Outer: `0 10px 60px rgba(0,0,0,0.1)` for popovers, menus and picker cards
(`--glass-shadow`); a tighter `0 3px 8px` under the segmented-control pill and the slider knob. Inner:
`inset 0 0 0 1px` is how the source draws strokes at all (the status-bar battery outline, kit section
frames) — borders are box-shadows, not `border`, so they do not affect layout. Cards in grouped lists have
**no shadow at all**: they are distinguished by fill alone.

**Borders.** Hairlines only, and only as separators. The source draws them at `0.333px`; use the
`--hairline` token and accept that browsers snap it. Separators sit *inside* the row's content column, so a
leading thumbnail or symbol tile bleeds past the line — that inset is deliberate and is what makes a list
read as iOS rather than Material.

**Animation.** Restrained and short. Selection and fill changes cross-fade in 120–200ms with an ease-out
curve. Sheets and swipe reveals use the iOS spring approximation
`cubic-bezier(0.32, 0.72, 0, 1)` over ~280ms. Disclosure chevrons rotate 90° in 200ms. The activity spinner
is the one exception to smoothness: it steps through 8 discrete frames per 800ms — it never rotates
continuously. No bounces, no overshoot on UI chrome, no entrance animations on content.

**Hover states.** iOS has no hover. Pointer-driven surfaces (iPad with a trackpad, and these mocks in a
browser) get the lightest possible treatment: a fill one step up the `--fills-*` ramp, or 0.7 opacity on
text links. Never a colour change, never a shadow lift, never a scale-up.

**Press states.** Opacity, not colour. Buttons dip to 0.6 opacity on pointer-down and snap back. Rows
flash a `--fills-quaternary` highlight. Nothing shrinks; nothing darkens.

**Disabled states.** Keep the fill, drop the label: a disabled button retains `--fills-tertiary` and its
label falls to `--labels-tertiary`. Destructive disabled uses
`--miscellaneous-buttons-label-destructive-disabled` (the accent at 50%). Never grey the whole control out.

**Imagery.** Where the source shows photos they are warm, naturalistic and full-bleed — landscape wallpapers
and square list thumbnails with no filter, no duotone, no grain. Photos always fill their frame
(`center / cover`) and are clipped by the container's radius, never given their own border.

**Fixed elements.** Status bar pinned to the top edge and always present. Navigation bar directly beneath.
The tab bar floats above the bottom edge (25px inset) rather than sitting on it — in iOS 26 the bar is a
detached glass pill. Search moves to the *bottom* on iPhone. The home indicator is a 140×5 pill 8px from the
bottom of the screen.

---

## ICONOGRAPHY

**The kit has exactly one icon system: SF Symbols, rendered as text.** Throughout the source file, icons are
private-use-area characters set in SF Pro — the play button is the single character `􀊄`, a checkmark is
`􀆅`. They inherit colour, size, weight and optical alignment from the surrounding type, which is why the
file never sizes an icon independently of its label.

- **No icon font or SVG sprite ships with the kit**, because the icons are glyphs in a font Apple licenses
  separately. `components/system/SFSymbol.jsx` carries the fifteen glyphs the source file actually uses
  (play, plus, minus, checkmark, star, info, chevron left/right, mic, speaker min/max, gear, command, shift,
  arrow.up) with the characters copied verbatim. For anything else, copy the glyph out of SF Symbols.app and
  pass it as `glyph`.
- **Rendering caveat / substitution.** On macOS and iOS these glyphs render natively through `-apple-system`.
  Off Apple platforms they fall back to tofu. There is no CDN equivalent with matching optical weight —
  Lucide and Heroicons are stroke sets, SF Symbols is a mixed fill/stroke family with its own weight axis
  bound to the type. **If you need cross-platform output, substitute a CDN set deliberately and say so**;
  this system does not silently swap one in, because a Lucide chevron next to SF Pro text reads visibly
  wrong.
- **Real vectors that ARE shipped.** The status-bar cellular and Wi-Fi indicators, and three menu-bar
  shapes, are genuine vectors (not glyphs) in the source. They were copied out verbatim to `assets/icons/`
  and the two status-bar paths are inlined in `StatusBar.jsx` so the component is path-independent.
- **PNG icons.** The source's `/App-Icons` page holds 129 first-party app-icon bitmaps (43 icons × 3 modes).
  Those are Apple's own artwork, not generic UI assets, so they are **not** redistributed here — see CAVEATS.
- **Unicode as icons: almost never.** The source uses real glyphs for everything; the only Unicode character
  doing icon duty is `…` in menu labels and `•` as a metadata separator.
- **Emoji: never**, outside the emoji keyboard's own key faces.

---

## Using this system

```html
<link rel="stylesheet" href="styles.css">
<script src="_ds_bundle.js"></script>
```

```jsx
const { NavigationBar, ListSection, ListRow, Toggle, TabBar } = window.IOS26UIKitDesignSystem_138099;

<NavigationBar title="Settings" />
<ListSection title="Network" footer="Joining a network shares it with your other devices.">
  <ListRow title="Wi-Fi" value="Studio" accessory="chevron" />
  <ListRow title="Airplane Mode"><Toggle /></ListRow>
</ListSection>
<TabBar tabs={[{ label: "Notes" }, { label: "Settings" }]} selected={0} />
```

Dark mode and increased contrast are attribute switches, not component props:

```html
<html data-theme="dark" data-contrast="high">
```

Two components take `style` as a **variant** name (`Button`, `Material`, `NavigationBar`, `Sheet` via
`detent`). On those, pass extra CSS through `css={{ … }}` instead.

### Intentional additions

Three components have no single counterpart in the source and were added to make the set usable in code.
Each is a wrapper over things the file does define, not a new design:

- **`SFSymbol`** — a text-glyph wrapper plus the name→character map. The source has no "Icon" component
  because its icons are raw text nodes; code needs a handle.
- **`Material`** — one component with a `style` axis, standing in for the source's `_Materials` set and its
  `_Materials/Mode Options` (20 variants). Same five styles, same fills.
- **`DeviceFrame`** — a bezel wrapper over the `/Product-Bezels` page frames, so a screen can be dropped into
  a device without hand-building the chrome.

---

## CAVEATS

1. **Component coverage — what is built and what is deliberately not.** The source enumerates 362 component
   *sets* plus 1,825 standalone symbols (2,077 total as the compiler counts them). This system builds **118
   components**: every public family the file exposes, plus the internal parts that are genuinely reusable
   (`_Separator` → `Separator`, `_Track`/`_Knob`/`_Ticks` → `SliderTrack`/`SliderKnob`/`SliderTicks`,
   `_Chevron` → `Chevron`, `_Label - Text`/`_Label - Symbol` → `LabelText`/`LabelSymbol`, `_Keys - iPhone`
   → `KeyboardKey`, and so on).

   **Intentionally skipped, and why:**
   - **Per-variant symbols.** The bulk of the 1,825 are one symbol per variant combination —
     `Size=Large, Style=Bordered, Label Type=Text, Enabled=True, Destructive=False` is a *single*
     `Button` variant, and the Buttons page alone contributes 168 of them. In code these are prop
     combinations, not components. Shipping them separately would be an API no designer could navigate.
   - **Mode duplicates.** Roughly half of every family exists twice or four times over
     (`Mode=Light` / `Mode=Dark` / `IC - Light` / `IC - Dark`, e.g. `_Edit Buttons/Light` and
     `_Edit Buttons/Dark`). Here mode is a CSS scope (`data-theme`, `data-contrast`), so one component
     covers all four.
   - **Figma plumbing.** `_Component Header`, `_Mode Label`, `_Kit Section`, `_BG`, `_Fill`,
     `_Contents`, `_Background` and the `/Kit-Helpers` page are scaffolding for annotating the Figma file
     itself. They have no product meaning.
   - **Example and doc frames.** `/Examples`, `/Cover`, `/Change-log`, `/License` and
     `/Getting-Started` are documentation, not UI.
   - **First-party app icons.** 129 symbols on `/App-Icons` are Apple's own icon bitmaps — excluded on
     IP grounds, see item 4.

   The `_Accessory Bar` group is the one place where the source's fine-grained split was worth keeping:
   `AccessoryBarFind`, `AccessoryBarReplace`, `AccessoryBarNext`, `AccessoryBarPrevious`,
   `AccessoryBarReplaceAction`, `AccessoryBarButton`, `AccessoryBarURL`, `AccessoryBarWebForm` and
   `AccessoryBarEditingTools` all ship separately, plus `AccessoryBarFindBar` as the assembled bar. Ask and
   any other group can be split the same way.

   If you want any skipped family promoted to public API, name it and it will be added.
2. **No SF Pro / SF Compact binaries.** They are not in the .fig and are not redistributable. The font stack
   resolves to the real thing on Apple platforms and falls back to **Inter** (loaded from Google Fonts)
   elsewhere. **This is a flagged substitution** — off-platform, tracking and the 510/590 weights will not
   match. If you can supply SF Pro and SF Compact `woff2` files, drop them in and I will add the
   `@font-face` rules.
3. **No Figma text styles existed.** The file defines 0 named TEXT/EFFECT styles — the Dynamic Type table is
   drawn as raw text nodes on `/Text-Styles-and-Dynamic-Type`. `tokens/typography.css` therefore reconstructs
   the eleven-style scale from the values on those nodes (Body 17/22/−0.43, Subheadline 15/20/−0.23,
   Caption 2 from the `--text-styles-caption2-*` variables, and so on) rather than from a style inventory.
4. **Apple's own artwork is deliberately excluded.** The file's 43 first-party app icons and its stock
   wallpapers are Apple-owned bitmaps, not generic UI assets. They are not copied into `assets/`.
   `AppIconTile` is an empty squircle for your artwork, and mock wallpapers use token-derived gradients.
   If you have licensed assets, drop them in `assets/images/` and pass them via `image=`.
5. **Approximated by the extractor, per the mount's own warnings.** Diamond gradients, NOISE effects and
   GRID auto-layout are approximated in the source read; deep nested instance swaps and variable aliases are
   not fully resolved. Where a value looked odd (13.333px, `rgb(0,136,255)`, radius 296) it was copied as-is.
6. **Not shipped as separate components:** the emoji keyboard's key faces, the `/Examples` demo frames, the
   `/Change-log` / `/License` / `/Cover` pages, and the `/Kit-Helpers` mode-label helpers — all authoring
   scaffolding for the Figma file itself rather than product UI.
