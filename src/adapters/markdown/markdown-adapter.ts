import { Effect, Layer, Option, ServiceMap, Stream } from "effect";
import type { LeafAdapter } from "../../core/leaf-adapter.js";
import { AdapterError, LinkData } from "../../core/model.js";
import { MarkdownPosition, LineRange, EditorNotFoundError } from "./model.js";
import type { ObsidianEditor } from "./obsidian-editor.js";
import { parseTimestampedLinks, parseLocatedLinks } from "./link-parser.js";
import { formatTimestamp } from "../youtube/url-parser.js";
import { computePlacement } from "./bookmark-placer.js";

const toAdapterError = (context: string) => (e: unknown) =>
  new AdapterError({ message: `${context}: ${e}`, adapter: "markdown" });

export class MarkdownAdapter extends ServiceMap.Service<
  MarkdownAdapter,
  LeafAdapter<MarkdownPosition, LineRange> & {
    readonly insertTimestampLink: (
      link: LinkData,
      position: MarkdownPosition,
    ) => Effect.Effect<
      { readonly from: MarkdownPosition; readonly to: MarkdownPosition },
      AdapterError
    >;
    readonly getTimestampedLinks: Effect.Effect<
      ReadonlyArray<LinkData>,
      AdapterError
    >;
  }
>()("annotation-syncer/MarkdownAdapter") {
  static layer(
    resolve: Effect.Effect<ObsidianEditor, EditorNotFoundError>,
  ): Layer.Layer<MarkdownAdapter> {
    return Layer.succeed(MarkdownAdapter)({
      getLocation: Effect.gen(function* () {
        const editor = yield* resolve;
        const pos = editor.getCursor();
        return Option.some(
          new MarkdownPosition({ line: pos.line, ch: pos.ch }),
        );
      }).pipe(Effect.mapError(toAdapterError("getLocation"))),
      seekTo: (loc: MarkdownPosition) =>
        Effect.gen(function* () {
          const editor = yield* resolve;
          editor.setCursor({ line: loc.line, ch: loc.ch });
          editor.scrollIntoView(
            {
              from: { line: loc.line, ch: 0 },
              to: { line: loc.line, ch: 0 },
            },
            true,
          );
        }).pipe(Effect.mapError(toAdapterError("seekTo"))),
      getContent: resolve.pipe(
        Effect.map((editor) => editor.getValue()),
        Effect.mapError(toAdapterError("getContent")),
      ),
      getMetadata: Effect.succeed({}),
      locationChanges: Stream.empty,
      dispose: Effect.void,

      insertTimestampLink: (link: LinkData, cursorPosition: MarkdownPosition) =>
        Effect.gen(function* () {
          const editor = yield* resolve;
          const ts = Option.getOrElse(link.timestamp, () => 0);
          const label = formatTimestamp(ts);
          const endParam = Option.match(link.endTimestamp, {
            onNone: () => "",
            onSome: (end: number) => `&end=${end}`,
          });
          const urlWithTime = `${link.url}${link.url.includes("?") ? "&" : "?"}t=${Math.floor(ts)}${endParam}`;
          const mdLink = `[${label}](${urlWithTime})`;

          const content = editor.getValue();
          const existingLinks = parseLocatedLinks(content);
          const placement = computePlacement(
            content,
            existingLinks,
            ts,
            mdLink,
            cursorPosition.line,
          );

          const from = { line: placement.line, ch: placement.ch };
          editor.replaceRange(placement.text, from);

          editor.focus();
          editor.setCursor({
            line: placement.cursorLine,
            ch: placement.cursorCh,
          });
          editor.scrollIntoView(
            {
              from: { line: placement.cursorLine, ch: 0 },
              to: { line: placement.cursorLine, ch: 0 },
            },
            true,
          );

          const insertedLinkStart = placement.text.indexOf(mdLink);
          const fromPos = new MarkdownPosition({
            line: placement.line,
            ch: placement.ch + insertedLinkStart,
          });
          const toPos = new MarkdownPosition({
            line: placement.line,
            ch: placement.ch + insertedLinkStart + mdLink.length,
          });
          return { from: fromPos, to: toPos };
        }).pipe(Effect.mapError(toAdapterError("insertTimestampLink"))),

      getTimestampedLinks: resolve.pipe(
        Effect.map((editor) => parseTimestampedLinks(editor.getValue())),
        Effect.mapError(toAdapterError("getTimestampedLinks")),
      ),
    });
  }
}
