import process from 'node:process';
import { app, BrowserWindow, OpenDevToolsOptions } from 'electron';
import * as localShortcut from './local-shortcuts';
import { isDev, isPreview } from './is';

const isMacOS = process.platform === 'darwin';

// A Map allows each window to have its own options
const developmentToolsOptions = new Map<BrowserWindow, OpenDevToolsOptions>();

interface DebugOptions {
	isEnabled?: boolean | null;
	showDevTools?: boolean;
	devToolsMode?: 'left' | 'right' | 'bottom' | 'undocked' | 'detach' | 'previous';
	windowSelector?: (win: BrowserWindow) => boolean | Partial<DebugOptions>;
}

function toggleDevelopmentTools(win: BrowserWindow | null = BrowserWindow.getFocusedWindow()): void {
	if (win) {
		const { webContents } = win;
		if (webContents.isDevToolsOpened()) {
			webContents.closeDevTools();
		} else {
			webContents.openDevTools(developmentToolsOptions.get(win));
		}
	}
}

function shouldRun(options: DebugOptions): boolean {
	return  (options.isEnabled === true || (options.isEnabled === null && (isDev() || isPreview())));
}

function getOptionsForWindow(win: BrowserWindow, options: DebugOptions): DebugOptions {
	if (!options.windowSelector) {
		return options;
	}

	const newOptions = options.windowSelector(win);

	return newOptions === true
		? options
		: (newOptions === false
			? { isEnabled: false }
			: { ...options, ...newOptions });
}

async function registerAccelerators(win?: BrowserWindow): Promise<void> {
	await app.whenReady();

	if (win) {
		localShortcut.register(win, 'CommandOrControl+Shift+C', inspectElements);
		localShortcut.register(win, isMacOS ? 'Command+Alt+I' : 'Control+Shift+I', devTools);
		localShortcut.register(win, 'F12', devTools);
		localShortcut.register(win, 'CommandOrControl+R', refresh);
		localShortcut.register(win, 'F5', refresh);
	} else {
		localShortcut.register('CommandOrControl+Shift+C', inspectElements);
		localShortcut.register(isMacOS ? 'Command+Alt+I' : 'Control+Shift+I', devTools);
		localShortcut.register('F12', devTools);
		localShortcut.register('CommandOrControl+R', refresh);
		localShortcut.register('F5', refresh);
	}
}

// eslint-disable-next-line unicorn/prevent-abbreviations
export function devTools(win: BrowserWindow | null = BrowserWindow.getFocusedWindow()): void {
	if (win) {
		toggleDevelopmentTools(win);
	}
}

// eslint-disable-next-line unicorn/prevent-abbreviations
export function openDevTools(win: BrowserWindow | null = BrowserWindow.getFocusedWindow()): void {
	if (win) {
		win.webContents.openDevTools(developmentToolsOptions.get(win));
	}
}

export function refresh(win: BrowserWindow | null = BrowserWindow.getFocusedWindow()): void {
	if (win) {
		win.webContents.reloadIgnoringCache();
	}
}

function inspectElements(): void {
	const win = BrowserWindow.getFocusedWindow();
	const inspect = (): void => {
		(win as any)?.devToolsWebContents?.executeJavaScript('DevToolsAPI.enterInspectElementMode()');
	};

	if (win) {
		if (win.webContents.isDevToolsOpened()) {
			inspect();
		} else {
			win.webContents.once('devtools-opened', inspect);
			win.webContents.openDevTools();
		}
	}
}

export function debug(options: DebugOptions = {}): void {
	options = {
		isEnabled: null,
		showDevTools: true,
		devToolsMode: 'previous',
		...options,
	};

	if (!options.windowSelector) {
		if (!shouldRun(options)) {
			return;
		}

		// When there's no filter, accelerators are defined globally
		registerAccelerators();
	}

	app.on('browser-window-created', (event, win) => {
		/// Workaround for https://github.com/electron/electron/issues/12438
		win.webContents.once('dom-ready', () => {
			const winOptions = getOptionsForWindow(win, options);

			if (winOptions.devToolsMode && winOptions.devToolsMode !== 'previous') {
				developmentToolsOptions.set(win, {
					...developmentToolsOptions.get(win),
					mode: winOptions.devToolsMode,
				});
			}

			if (!shouldRun(winOptions)) {
				return;
			}

			if (winOptions.windowSelector) {
				// With filters, accelerators are defined for each window depending on their provided options
				registerAccelerators(win);
			}

			if (winOptions.showDevTools) {
				openDevTools(win);
			}
		});
	});
}
