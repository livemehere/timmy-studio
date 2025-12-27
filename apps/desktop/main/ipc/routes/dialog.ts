import { dialog } from 'electron';
import { createIpcRouter } from '../router';
import type { MainIpcContext } from '../context';

export function createDialogRouter() {
  return createIpcRouter<MainIpcContext>().handle(
    'dialog:open',
    async (_ctx, _event, options) => {
      return await dialog.showOpenDialog(options);
    }
  );
}
