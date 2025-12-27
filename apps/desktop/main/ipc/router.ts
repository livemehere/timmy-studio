import type { IpcInvokeChannels } from '@timmy-studio/electron-utils/ipc';
import type { IpcMainInvokeEvent } from 'electron';

type ExtractPayload<T> = T extends { payload: infer P } ? P : never;

export type IpcHandlerWithCtx<Ctx, K extends keyof IpcInvokeChannels> = (
  ctx: Ctx,
  event: IpcMainInvokeEvent,
  ...args: ExtractPayload<IpcInvokeChannels[K]> extends readonly [...infer P]
    ? P
    : never
) =>
  | IpcInvokeChannels[K]['response']
  | Promise<IpcInvokeChannels[K]['response']>;

type IpcMainApi = typeof import('@timmy-studio/electron-utils/ipc/main').ipc;

type RegisterFn<Ctx> = (ipc: IpcMainApi, ctx: Ctx) => void;

export interface IpcRouter<Ctx> {
  handle<K extends keyof IpcInvokeChannels>(
    channel: K,
    handler: IpcHandlerWithCtx<Ctx, K>
  ): IpcRouter<Ctx>;
  use(child: IpcRouter<Ctx>): IpcRouter<Ctx>;
  register(ipc: IpcMainApi, ctx: Ctx): void;
}

export function createIpcRouter<Ctx>(): IpcRouter<Ctx> {
  const registerFns: RegisterFn<Ctx>[] = [];

  const router: IpcRouter<Ctx> = {
    handle(channel, handler) {
      registerFns.push((ipc, ctx) => {
        ipc.handle(channel, (event, ...args) =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (handler as any)(ctx, event, ...args)
        );
      });
      return router;
    },

    use(child) {
      registerFns.push((ipc, ctx) => child.register(ipc, ctx));
      return router;
    },

    register(ipc, ctx) {
      for (const fn of registerFns) fn(ipc, ctx);
    },
  };

  return router;
}
