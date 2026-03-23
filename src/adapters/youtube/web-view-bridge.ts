import { Effect, Layer, Schema, ServiceMap } from "effect";
import { WebViewBridgeError } from "./model.js";

/** Minimal typing for the Electron webview element */
export interface WebViewElement {
  executeJavaScript(code: string): Promise<unknown>;
  getURL(): string;
  addEventListener(event: string, handler: (e: unknown) => void): void;
  removeEventListener(event: string, handler: (e: unknown) => void): void;
}

export class WebViewBridge extends ServiceMap.Service<
  WebViewBridge,
  {
    eval<A>(
      code: string,
      schema: Schema.Schema<A> & { readonly DecodingServices: never },
    ): Effect.Effect<A, WebViewBridgeError | Schema.SchemaError>;
    getURL: Effect.Effect<string, WebViewBridgeError>;
  }
>()("annotation-syncer/WebViewBridge") {
  static layer(
    resolve: Effect.Effect<WebViewElement, WebViewBridgeError>,
  ): Layer.Layer<WebViewBridge> {
    return Layer.succeed(WebViewBridge)({
      eval: <A,>(
        code: string,
        schema: Schema.Schema<A> & { readonly DecodingServices: never },
      ) =>
        Effect.gen(function* () {
          const el = yield* resolve;
          const raw = yield* Effect.tryPromise({
            try: () => el.executeJavaScript(code),
            catch: (cause) =>
              new WebViewBridgeError({
                message: "executeJavaScript failed",
                cause,
              }),
          });
          return yield* Schema.decodeUnknownEffect(schema)(raw);
        }),
      getURL: resolve.pipe(Effect.map((el) => el.getURL())),
    });
  }
}
