---
title: Formatting Guide (Draft — Not Published)
date: 2026-01-01
summary: Internal reference only.
tags: []
---

This file starts with an underscore, so `npm run build` skips it — it's a
personal cheatsheet, not a real post. Delete it whenever you don't need it
anymore, or keep it around for reference.

### Frontmatter fields

```
---
title: My Post Title
tabTitle: Short Tab Title
date: 2026-07-29
summary: Shown on the blog index card. Keep it to 1-2 sentences.
metaDescription: Optional — falls back to summary if you skip it.
tags: [PCB Design, Firmware]
cover: /assets/images/blog/my-cover.jpg
---
```

Only `title` is required — everything else has a sensible fallback.

`title` is what shows as the big `<h1>` on the post and in link previews —
go long/descriptive there. `tabTitle` is what shows in the browser tab and
history — keep that short. If you skip `tabTitle`, it just uses `title`.

### Plain image

    ![A hand-soldered PCB](/assets/images/blog/pcb.jpg)

### Captioned image

    ![A hand-soldered PCB](/assets/images/blog/pcb.jpg "The board after the second reflow pass")

### Image that text wraps around

    ![A hand-soldered PCB](/assets/images/blog/pcb.jpg){.wrap-left}

or `{.wrap-right}`. You can combine a caption and a wrap class — put the
caption first, then the class:

    ![A hand-soldered PCB](/assets/images/blog/pcb.jpg "Caption text"){.wrap-left}

Wrapped images automatically go full-width and un-float on small screens,
so you don't need to think about mobile separately.

### Two-column layout

    :::cols-2
    Left column markdown — can be a full paragraph, a list, anything.
    +++
    Right column markdown.
    :::

Swap `cols-2` for `cols-3` for a three-column layout. The `+++` line by
itself is what separates the columns.

### Callout box

    :::callout
    A note worth calling out from the surrounding text.
    :::

Also available: `:::callout-tip` (green accent) and `:::callout-warning`
(red accent) — same syntax, just swap the type name.

### Everything else

Standard markdown works as usual: `# Headings`, **bold**, *italic*,
`inline code`, fenced code blocks, ordered/unordered lists, `> blockquotes`,
and [links](https://example.com).