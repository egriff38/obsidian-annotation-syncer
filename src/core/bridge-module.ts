import type { Effect } from "effect";

export interface CommandHandler<Id extends string, E> {
  readonly id: Id;
  readonly name: string;
  readonly execute: Effect.Effect<void, E>;
}

export type CommandHandlerTop = CommandHandler<string, unknown>;

export interface BridgeInstance<
  Id extends string,
  Commands extends ReadonlyArray<CommandHandlerTop>,
> {
  readonly id: Id;
  readonly commands: Commands;
}

export type BridgeInstanceTop = BridgeInstance<
  string,
  ReadonlyArray<CommandHandlerTop>
>;
