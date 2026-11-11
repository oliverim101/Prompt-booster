# Prompt-booster: Prompt Master

A Claude Code mod that turns your rough prompt into a clear, specific one **before** you send it.

## Use it

- **Button**: type a rough prompt, then click **✨ Prompt Master** in the band just above the prompt box (or focus the band with `ctrl+x tab` and press `p`). Your draft is replaced with the improved version. Review it and press Enter to send.
- **Undo**: not happy? Click **Undo** (`u`) to get your original draft back.
- **Slash command**: `/prompt-master` rewrites whatever is in your prompt box. It works on every surface, including mobile, where the band isn't shown.

Nothing is sent automatically. You always see the rewrite first. If the rewrite fails, your draft is left untouched.

## What the rewrite does

It keeps your intent and every concrete detail (names, paths, code, numbers), puts the goal first, adds the context, constraints and what a good result looks like, fixes grammar, and stays short when your ask is short. It never invents requirements. The rewrite is a single completion on the `sonnet` model, billed to your session's credentials like any other request.

## Install

```
/plugin install prompt-master --marketplace oliverim101/Prompt-booster
```

## Layout

- `.claude-plugin/plugin.json`: manifest
- `hooks/register.tsx`: the hooks module (band button, `/prompt-master`, rewrite logic)
- `types/index.d.ts`: the mod's state contract
- `tests/`: `claude plugin test .`
