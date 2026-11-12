# Prompt-booster: Prompt Master

A Claude Code mod that turns your rough prompt into a clear, specific one **before** you send it.

## Use it

- **One step, any app**: start your message with `pm:` and send it, for example `pm: fix login its broken`. Prompt Master rewrites it into a better prompt, and the improved version is what Claude receives. If the rewrite fails, your message goes as typed (minus `pm:`).
- **Prompt Master pane** (every surface, including the web and mobile apps, where it lives in the **Mods** sheet): type your rough prompt in the box and press **✨ Prompt Master**. Then **Send it**, or **Put in prompt box** to edit first.
- **Button above the prompt** (terminal and desktop app only): type a rough prompt, then click **✨ Prompt Master** in the band just above the prompt box (or focus the band with `ctrl+x tab` and press `p`). Your draft is replaced with the improved version. Review it and press Enter to send.
- **Undo**: not happy? Click **Undo** (`u`) to get your original draft back.
- **Slash command**: `/prompt-master <rough prompt>` rewrites the text you give it; plain `/prompt-master` rewrites what's in your prompt box.

With the button, pane and `/prompt-master`, nothing is sent automatically: you see the rewrite first. If the rewrite fails, your draft is left untouched.

## What the rewrite does

It keeps your intent and every concrete detail (names, paths, code, numbers), puts the goal first, adds the context, constraints and what a good result looks like, fixes grammar, and stays short when your ask is short. It never invents requirements. The rewrite is a single completion on the `sonnet` model, billed to your session's credentials like any other request.

## Install

```
/plugin install prompt-master --marketplace oliverim101/Prompt-booster
```

## Layout

- `.claude-plugin/plugin.json`: manifest
- `hooks/register.tsx`: the hooks module (pane, band button, `/prompt-master`, rewrite logic)
- `types/index.d.ts`: the mod's state contract
- `tests/`: `claude plugin test .`
