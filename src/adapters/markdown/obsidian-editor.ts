/** Opaque handle to an Obsidian MarkdownView.editor */
export interface ObsidianEditor {
  getCursor(): { line: number; ch: number };
  setCursor(pos: { line: number; ch: number }): void;
  focus(): void;
  getValue(): string;
  replaceRange(
    text: string,
    from: { line: number; ch: number },
    to?: { line: number; ch: number },
  ): void;
  getSelection(): string;
  setSelection(
    anchor: { line: number; ch: number },
    head: { line: number; ch: number },
  ): void;
  scrollIntoView(
    range: {
      from: { line: number; ch: number };
      to: { line: number; ch: number };
    },
    center?: boolean,
  ): void;
}
