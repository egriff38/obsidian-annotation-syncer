import {
  type Extension,
  StateEffect,
  StateField,
} from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView } from "@codemirror/view";
import type { LineRange } from "./model.js";

/** Effects for controlling highlight decorations */
export const addHighlight = StateEffect.define<LineRange>();
export const removeHighlight = StateEffect.define<LineRange>();
export const clearHighlights = StateEffect.define<void>();

const highlightDecoration = Decoration.mark({
  class: "annotation-syncer-highlight",
});

/** StateField that stores active highlight decorations */
export const highlightField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },

  update(decorations, tr) {
    decorations = decorations.map(tr.changes);

    for (const effect of tr.effects) {
      if (effect.is(clearHighlights)) {
        decorations = Decoration.none;
      } else if (effect.is(addHighlight)) {
        const range = effect.value;
        const from = tr.state.doc.line(range.fromLine + 1).from + range.fromCh;
        const to = tr.state.doc.line(range.toLine + 1).from + range.toCh;
        decorations = decorations.update({
          add: [highlightDecoration.range(from, to)],
        });
      } else if (effect.is(removeHighlight)) {
        const range = effect.value;
        const from = tr.state.doc.line(range.fromLine + 1).from + range.fromCh;
        const to = tr.state.doc.line(range.toLine + 1).from + range.toCh;
        decorations = decorations.update({
          filter: (f, t) => !(f === from && t === to),
        });
      }
    }

    return decorations;
  },

  provide(field) {
    return EditorView.decorations.from(field);
  },
});

/** CSS for the highlight decoration */
export const highlightTheme = EditorView.baseTheme({
  ".annotation-syncer-highlight": {
    backgroundColor: "var(--text-highlight-bg, rgba(255, 208, 0, 0.4))",
    borderRadius: "2px",
  },
});

/** Bundle the StateField and theme into a single Extension */
export function highlightExtension(): Extension {
  return [highlightField, highlightTheme];
}
