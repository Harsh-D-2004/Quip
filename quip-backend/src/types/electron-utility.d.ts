/**
 * When Electron starts this service with utilityProcess.fork() it injects a
 * MessagePort as process.parentPort. It is absent when the service is run
 * standalone with plain node, hence the optional type.
 *
 * Declared here rather than depending on `electron` so the service keeps no
 * Electron dependency and stays runnable on its own.
 */
declare namespace NodeJS {
  interface ParentPortMessageEvent {
    data: any;
  }

  interface ParentPort {
    postMessage(message: unknown): void;
    on(event: "message", listener: (event: ParentPortMessageEvent) => void): this;
    once(event: "message", listener: (event: ParentPortMessageEvent) => void): this;
    start?(): void;
  }

  interface Process {
    parentPort?: ParentPort;
  }
}
