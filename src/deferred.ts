
/* eslint-disable no-underscore-dangle */
function deferred<T = unknown, TError = unknown>() {
  let _rejector: ((reason?: TError) => void) | undefined;
  let _resolver: ((value: T) => void) | undefined;
  let _isPending = true;

  const promise = new Promise<T>((resolve, reject) => {
    _rejector = reject;
    _resolver = resolve;
  });

  const reject = (reason: TError) => {
    if (_isPending) {
      if (_rejector) {
        _isPending = false;
        _rejector(reason);
        _rejector = undefined;
        _resolver = undefined;
      } else {
        setImmediate(() => reject(reason));
      }
    } else {
      console.warn('Promise is already resolved', reason);
    }
  };

  const resolve = (value: T) => {
    if (_isPending) {
      if (_resolver) {
        _isPending = false;
        _resolver(value);
        _rejector = undefined;
        _resolver = undefined;
      } else {
        setImmediate(() => resolve(value));
      }
    } else {
      console.warn('Promise is already resolved', value);
    }
  };

  return {
    reject,
    resolve,
    promise,
    isPending: () => _isPending,
  };
}
/* eslint-enable no-underscore-dangle */

export default deferred;
