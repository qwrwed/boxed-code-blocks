# boxed-code-blocks

A Claude Code plugin that draws fenced code blocks in assistant replies inside a bordered box, in the terminal only. Code blocks inside quotes are boxed too. Each box has a `copy` button on its top border that puts the block's code on the clipboard exactly as written. Other surfaces, such as VS Code, are left unchanged.

## Install

Clone the repo and pass it to Claude Code with `--plugin-dir`:

```bash
git clone https://github.com/qwrwed/boxed-code-blocks
claude --plugin-dir ./boxed-code-blocks
```

`--plugin-dir` loads the plugin for that session only, so pass it each time you launch `claude`.
