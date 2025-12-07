import Store from 'electron-store';

interface IUserConfigStore {
  bounds?: Electron.Rectangle;
}

export const userConfigStore = new Store<IUserConfigStore>({
  name: 'user-config',
});
