/**
 * @template T
 * @typedef PromiseManager
 * @property {?ResolvingState<T>} resolver Null on async function
 * @property {function():EPromiseState} state
 */

/**
 * @typedef PromiseManagerAsync
 * @property {function():EPromiseState} state
 */

/**
 * @template T
 * @callback PromiseCallback
 * @param {PromiseManager<T>} manager
 * @param {...any} args
 * @return {T}
 */

/**
 * @async
 * @template T
 * @callback PromiseCallbackAsync
 * @param {PromiseManager<T>} manager
 * @param {...any} args
 * @return {Promise<T> | RotomecaPromise<T>}
 */

/**
 * @class
 * @classdesc
 * @template {Object} T
 */
class RotomecaPromise {
  #_callback;
  /**
   * @type {EPromiseState}
   */
  #_state;
  #_promise;
  #_cancel_completed;
  #_args;
  /**
   *
   * @param {PromiseCallback<T> | PromiseCallbackAsync<T>} callback
   * @param  {...any} args
   */
  constructor(callback, ...args) {
    this.#_callback = callback;
    this.#_state = EPromiseState.pending;
    this.#_cancel_completed = false;
    this.#_args = args;

    this.onAbort = new RotomecaPromise.#_JsEvent();
  }

  /**
   * @type {EPromiseState}
   * @readonly
   */
  get state() {
    return this.#_state;
  }

  /**
   * @type {boolean}
   * @readonly
   */
  get isStarted() {
    return !!this.#_promise;
  }

  isPending() {
    return this.state === EPromiseState.pending;
  }

  isResolved() {
    return this.state === EPromiseState.resolved;
  }

  isRejected() {
    return this.state === EPromiseState.rejected;
  }

  isCancelled() {
    return this.state === EPromiseState.cancelled;
  }

  /**
   * Arrète la promesse.
   * @returns {RotomecaPromise<boolean>}
   * @async
   */
  abort() {
    this.#_state = EPromiseState.cancelled;

    return new RotomecaPromise(async () => {
      await new Promise((r, j) => {
        let it = 0;
        const interval = setInterval(() => {
          if (this.#_cancel_completed) {
            clearInterval(interval);
            r(it);
          } else if (it++ > 100) {
            clearInterval(interval);
            j(new Error('Wainting infinite'));
          }
        }, 100);
      });

      return this.#_cancel_completed;
    });
  }

  async #_startPromise() {
    return await new Promise((ok, nok) => {
      const callback = this.#_callback;
      const isAbortablePromise = !!callback.then && !!callback.abort;

      let waiting_promise;

      //Stop la fonction si elle à besoin d'être stoppée
      const check_stop = setInterval(() => {
        if (this.isCancelled() === true) {
          console.info(
            'i[RotomecaPromise]cancelled !',
            waiting_promise,
            callback,
          );
          clearInterval(check_stop);

          if (isAbortablePromise) callback.abort();
          if (waiting_promise?.abort) waiting_promise.abort();

          new Promise((r, j) => {
            try {
              this.onAbort.call();
              this.#_cancel_completed = true;
              r();
            } catch (error) {
              this.#_cancel_completed = true;
              j(error);
            }
          });
          rej('Cancelled');
        }
      }, 100);

      try {
        if (isAbortablePromise) {
          //Si c'est une promesse
          waiting_promise = callback;
        } else {
          //Si la fonction est asynchrone
          if (callback.constructor.name === 'AsyncFunction')
            waiting_promise = callback(
              { state: () => this.state },
              ...this.#_args,
            );
          else {
            let resolver = new ResolvingState(ok, nok, check_stop);
            //Si c'est une fonction + classique
            const val = callback(
              { resolver, state: () => this.state },
              ...this.#_args,
            );

            if (val?.then) waiting_promise = val;
            else {
              if (!resolver.resolving) {
                clearInterval(check_stop);
                ok(val);
              }
            }
          }
        }

        if (waiting_promise) {
          waiting_promise.then(
            (datas) => {
              clearInterval(check_stop);
              ok(datas);
            },
            (error) => {
              clearInterval(check_stop);
              nok(error);
            },
          );
        }
      } catch (error) {
        console.error('###[RotomecaPromise]', error);
        nok(error);
      }
    }).then(
      (d) => {
        this.#_state = EPromiseState.resolved;
        return d;
      },
      (r) => {
        this.#_state = EPromiseState.rejected;
        return r;
      },
    );
  }

  start() {
    if (!this.isStarted) this.#_promise = this.#_startPromise();
    else console.warn('/!\\[RotomecaPromise] Already started !');

    return this;
  }

  async executor() {
    if (!this.isStarted) this.start();

    return await this.#_promise;
  }

  /**
   * @param {(data:T) => Y} onfullfiled
   * @param {(error:any) => Z} onerror
   * @returns {RotomecaPromise<Y | Z>}
   * @template Y
   * @template Z
   * @async
   */
  then(onfullfiled, onerror = (data) => data) {
    const promise = this.executor();
    const value = promise.then.apply(promise, [onfullfiled, onerror]);
    return new RotomecaPromise(() => value).start();
  }

  /**
   * @param {(data:T) => Y} onrejected
   * @returns {RotomecaPromise<Y>}
   * @template Y
   * @async
   */
  catch(onrejected = (data) => data) {
    const promise = this.executor();
    const catched = promise.catch.apply(promise, [onrejected]);
    return new RotomecaPromise(() => catched).start();
  }

  /**
   *
   * @param {(data:T) => Y} onSuccess
   * @returns {RotomecaPromise<Y>}
   * @template Y
   * @async
   */
  success(onSuccess) {
    return this.then(onSuccess);
  }

  /**
   *
   * @param {(data:T) => Y} onSuccess
   * @returns {RotomecaPromise<Y>}
   * @template Y
   * @async
   */
  fail(onFailed) {
    return this.then(() => {}, onFailed);
  }

  /**
   *
   * @param {(data:T) => Y} onSuccess
   * @returns {RotomecaPromise<Y>}
   * @template Y
   * @async
   */
  always(onAlways) {
    return this.then(onAlways, onAlways);
  }

  /**
   *
   * @param {number} ms
   * @returns {RotomecaPromise<void>}
   * @static
   * @async
   */
  static Sleep(ms) {
    return new RotomecaStartedPromise((manager, ms) => {
      manager.resolver.start();
      setTimeout(() => {
        manager.resolver.resolve();
      }, ms);
    }, ms);
  }

  /**
   *
   * @returns {RotomecaResolvedPromise}
   * @async
   * @static
   */
  static Resolved() {
    return new RotomecaResolvedPromise();
  }

  /**
   *
   * @param  {...(RotomecaPromise | Promise)} promises
   * @returns {RotomecaPromise<Array<any>>}
   */
  static All(...promises) {
    return new RotomecaStartedPromise(async () => await Promise.all(promises));
  }

  /**
   *
   * @param  {...(RotomecaPromise | Promise)} promises
   * @returns {RotomecaPromise<Array<PromiseSettledResult<any>>>}
   */
  static AllSettled(...promises) {
    return new RotomecaStartedPromise(
      async () => await Promise.allSettled(promises),
    );
  }

  /**
   *
   * @param {PromiseCallback<Y> | PromiseCallbackAsync<Y>} callback
   * @param  {...any} args
   * @returns {RotomecaPromise<Y>}
   * @template {Object} Y
   */
  static Start(callback, ...args) {
    return new RotomecaStartedPromise(callback, ...args);
  }

  /**
   * @type {typeof import('@rotomeca/event')}
   */
  static get #_JsEvent() {
    return require('@rotomeca/event');
  }

  /**
   * @type {typeof EPromiseState}
   * @readonly
   * @static
   */
  static get PromiseStates() {
    return EPromiseState;
  }
}

/**
 * @class
 * @classdesc
 * @extends RotomecaPromise<T>
 * @template {Object} T
 */
class RotomecaStartedPromise extends RotomecaPromise {
  constructor(callback, ...args) {
    super(callback, ...args);
    this.start();
  }
}

/**
 * @class
 * @classdesc
 * @extends RotomecaStartedPromise<void>
 */
class RotomecaResolvedPromise extends RotomecaStartedPromise {
  constructor() {
    super(() => {});
  }
}

/**
 * @class
 * @classdesc
 * @template {any} T
 */
class ResolvingState {
  #_resolving = false;

  #_ok = null;
  #_nok = null;
  #_timeout = null;
  constructor(ok, nok, timeout) {
    this.#_ok = ok;
    this.#_nok = nok;
    this.#_timeout = timeout;
  }

  start() {
    this.#_resolving = true;
    return this;
  }

  /**
   * @type {boolean}
   * @readonly
   */
  get resolving() {
    return this.#_resolving;
  }

  /**
   *
   * @param {T} data
   */
  resolve(data = null) {
    clearInterval(this.#_timeout);
    this.#_ok(data);
  }

  reject(why = null) {
    clearInterval(this.#_timeout);
    this.#_nok(why);
  }
}

/**
 * @enum {Symbol}
 */
const EPromiseState = Object.freeze({
  pending: Symbol(),
  rejected: Symbol(),
  resolved: Symbol(),
  cancelled: Symbol(),
});

module.exports = { RotomecaPromise };
