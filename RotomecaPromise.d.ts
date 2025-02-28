import JsEvent from "@rotomeca/event";

declare module "@rotomeca/promise";
declare enum EPromiseState {
  pending,
  rejected,
  resolved,
  cancelled,
}
declare type ValidatorCallback<TResult> = (data: TResult) => void;
declare type NonValidatorCallback = (data: any) => void;
declare class ResolvingState<TResult> {
  constructor(
    ok: ValidatorCallback<TResult>,
    nok: NonValidatorCallback,
    timeout: number,
  );

  readonly resolving: boolean;

  start(): ResolvingState<TResult>;
  resolve(data?: ?TResult): void;
  reject(why?: ?any): void;
}
declare type PromiseManager<TResult> = {
  resolver: ?ResolvingState<TResult>;
  state: () => EPromiseState;
};
declare type PromiseManagerAsync = {
  state: () => EPromiseState;
};
declare type PromiseCallback<TResult> = (
  manager: PromiseManager<TResult>,
  ...args: any[]
) => TResult;
declare type PromiseCallbackAsync<TResult> = (
  manager: PromiseManager<TResult>,
  ...args: any[]
) => Promise<TResult>;
export declare class RotomecaPromise<TResult> {
  constructor(
    callback: PromiseCallback<TResult> | PromiseCallbackAsync<TResult>,
    ...args: any[]
  );

  onabort: JsEvent<() => void>;
  readonly state: EPromiseState;
  readonly isStarted: boolean;
  isPending(): boolean;
  isResolved(): boolean;
  isRejected(): boolean;
  isCancelled(): boolean;
  abort(): RotomecaPromise<boolean>;
  start(): RotomecaPromise<TResult>;
  executor(): Promise<TResult>;
  then<TValidResult, TErrorResult>(
    onfullfiled: (data: TResult) => TValidResult,
    onerror: (error: any) => TErrorResult,
  ): RotomecaPromise<TValidResult | TErrorResult>;
  catch<TErrorResult>(
    onfullfiled: (onrejected: TResult) => TErrorResult,
  ): RotomecaPromise<TErrorResult>;
  success<TValidResult>(
    onSuccess: (data: TResult) => TValidResult,
  ): RotomecaPromise<TValidResult>;
  fail<TErrorResult>(
    onFailed: (data: TResult) => TErrorResult,
  ): RotomecaPromise<TErrorResult>;
  always<TValidResult>(
    onAlways: (data: TResult) => TValidResult,
  ): RotomecaPromise<TValidResult>;

  static #_JsEvent<TCallback>(): typeof JsEvent<TCallback>;
  static Sleep(ms: number): RotomecaPromise<void>;
  static Resolved(): RotomecaResolvedPromise;
  static All(
    ...promises: (RotomecaPromise<any> | Promise<any>)[]
  ): RotomecaPromise<any[]>;
  static AllSettled(
    ...promises: (RotomecaPromise<any> | Promise<any>)[]
  ): RotomecaPromise<PromiseSettledResult<any>[]>;
  static Start<TResult>(
    callback: PromiseCallback<TResult> | PromiseCallbackAsync<TResult>,
    ...args: any[]
  ): RotomecaPromise<TResult>;
  static readonly PromiseStates: typeof EPromiseState;
}

declare class RotomecaStartedPromise<TResult> extends RotomecaPromise<TResult> {
  constructor(
    callback: PromiseCallback<TResult> | PromiseCallbackAsync<TResult>,
    ...args: any[]
  );
}

declare class RotomecaResolvedPromise extends RotomecaStartedPromise<void> {
  constructor();
}
