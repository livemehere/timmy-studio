import { app, BrowserWindow, WebContents, Input } from 'electron';
import isAccelerator from '../shared/is-accelerator';
import { eventsAreEqual } from '../shared/keyboardevents-areequal';
import { toKeyEvent } from '../shared/keyboardevent-from-electron-accelerator';

// A placeholder to register shortcuts on any window of the app.
const ANY_WINDOW = {} as WebContents;

interface Shortcut {
	eventStamp: any;
	callback: () => void;
	enabled: boolean;
}

interface ShortcutsCollection extends Array<Shortcut> {
	removeListener?: () => void;
}

const windowsWithShortcuts = new WeakMap<WebContents, ShortcutsCollection>();

const title = (win?: BrowserWindow): string => {
	if (win) {
		try {
			return win.getTitle();
		} catch (error) {
			return 'A destroyed window';
		}
	}
	return 'An falsy value';
};

function _checkAccelerator(accelerator: string): void {
	if (!isAccelerator(accelerator)) {
		const w: any = {};
		Error.captureStackTrace(w);
		const stack = w.stack ? w.stack.split('\n').slice(4).join('\n') : w.message;
		const msg = `
WARNING: ${accelerator} is not a valid accelerator.

${stack}
`;
		console.error(msg);
	}
}

/**
 * Disable all of the shortcuts registered on the BrowserWindow instance.
 * Registered shortcuts no more works on the window instance, but the module
 * keep a reference on them. You can reactivate them later by calling enableAll
 * method on the same window instance.
 */
export function disableAll(win: BrowserWindow): void {
	console.log(`Disabling all shortcuts on window ${title(win)}`);
	const wc = win.webContents;
	const shortcutsOfWindow = windowsWithShortcuts.get(wc);

	if (shortcutsOfWindow) {
		for (const shortcut of shortcutsOfWindow) {
			shortcut.enabled = false;
		}
	}
}

/**
 * Enable all of the shortcuts registered on the BrowserWindow instance that
 * you had previously disabled calling disableAll method.
 */
export function enableAll(win: BrowserWindow): void {
	console.log(`Enabling all shortcuts on window ${title(win)}`);
	const wc = win.webContents;
	const shortcutsOfWindow = windowsWithShortcuts.get(wc);

	if (shortcutsOfWindow) {
		for (const shortcut of shortcutsOfWindow) {
			shortcut.enabled = true;
		}
	}
}

/**
 * Unregisters all of the shortcuts registered on any focused BrowserWindow
 * instance. This method does not unregister any shortcut you registered on
 * a particular window instance.
 */
export function unregisterAll(win: BrowserWindow): void {
	console.log(`Unregistering all shortcuts on window ${title(win)}`);
	const wc = win.webContents;
	const shortcutsOfWindow = windowsWithShortcuts.get(wc);
	if (shortcutsOfWindow && shortcutsOfWindow.removeListener) {
		// Remove listener from window
		shortcutsOfWindow.removeListener();
		windowsWithShortcuts.delete(wc);
	}
}

function _normalizeEvent(input: Input): any {
	const normalizedEvent: any = {
		code: input.code,
		key: input.key
	};

	(['alt', 'shift', 'meta'] as const).forEach(prop => {
		if (typeof input[prop] !== 'undefined') {
			normalizedEvent[`${prop}Key`] = input[prop];
		}
	});

	if (typeof input.control !== 'undefined') {
		normalizedEvent.ctrlKey = input.control;
	}

	return normalizedEvent;
}

function _findShortcut(event: any, shortcutsOfWindow: ShortcutsCollection): number {
	let i = 0;
	for (const shortcut of shortcutsOfWindow) {
		if (eventsAreEqual(shortcut.eventStamp, event)) {
			return i;
		}
		i++;
	}
	return -1;
}

const _onBeforeInput = (shortcutsOfWindow: ShortcutsCollection) => (e: any, input: Input) => {
	if (input.type === 'keyUp') {
		return;
	}

	const event = _normalizeEvent(input);

	console.log(`before-input-event: ${JSON.stringify(input)} is translated to: ${JSON.stringify(event)}`);
	for (const { eventStamp, callback, enabled } of shortcutsOfWindow) {
		if (!enabled) {
			continue;
		}
		
		if (eventsAreEqual(eventStamp, event)) {
			console.log(`eventStamp: ${JSON.stringify(eventStamp)} match`);
			callback();
			return;
		}

		console.log(`eventStamp: ${JSON.stringify(eventStamp)} no match`);
	}
};

/**
 * Registers the shortcut accelerator on the BrowserWindow instance.
 */
export function register(win: BrowserWindow, accelerator: string | string[], callback: () => void): void;
export function register(accelerator: string | string[], callback: () => void): void;
export function register(
	winOrAccelerator: BrowserWindow | string | string[],
	acceleratorOrCallback: string | string[] | (() => void),
	maybeCallback?: () => void
): void {
	let wc: WebContents;
	let win: BrowserWindow | undefined;
	let accelerator: string | string[];
	let callback: () => void;

	if (typeof acceleratorOrCallback === 'function') {
		// register(accelerator, callback)
		wc = ANY_WINDOW;
		accelerator = winOrAccelerator as string | string[];
		callback = acceleratorOrCallback;
	} else {
		// register(win, accelerator, callback)
		win = winOrAccelerator as BrowserWindow;
		wc = win.webContents;
		accelerator = acceleratorOrCallback as string | string[];
		callback = maybeCallback!;
	}

	if (Array.isArray(accelerator)) {
		accelerator.forEach(acc => {
			if (typeof acc === 'string') {
				register(win as any, acc, callback);
			}
		});
		return;
	}

	console.log(`Registering callback for ${accelerator} on window ${title(win)}`);
	_checkAccelerator(accelerator);

	console.log(`${accelerator} seems a valid shortcut sequence.`);

	let shortcutsOfWindow: ShortcutsCollection;
	if (windowsWithShortcuts.has(wc)) {
		console.log('Window has others shortcuts registered.');
		shortcutsOfWindow = windowsWithShortcuts.get(wc)!;
	} else {
		console.log('This is the first shortcut of the window.');
		shortcutsOfWindow = [] as ShortcutsCollection;
		windowsWithShortcuts.set(wc, shortcutsOfWindow);

		if (wc === ANY_WINDOW) {
			const keyHandler = _onBeforeInput(shortcutsOfWindow);
			const enableAppShortcuts = (e: any, win: BrowserWindow) => {
				const wc = win.webContents;
				wc.on('before-input-event', keyHandler);
				win.once('closed', () =>
					wc.removeListener('before-input-event', keyHandler)
				);
			};

			// Enable shortcut on current windows
			const windows = BrowserWindow.getAllWindows();
			windows.forEach(win => enableAppShortcuts(null, win));

			// Enable shortcut on future windows
			app.on('browser-window-created', enableAppShortcuts);

			shortcutsOfWindow.removeListener = () => {
				const windows = BrowserWindow.getAllWindows();
				windows.forEach(win =>
					win.webContents.removeListener('before-input-event', keyHandler)
				);
				app.removeListener('browser-window-created', enableAppShortcuts);
			};
		} else {
			const keyHandler = _onBeforeInput(shortcutsOfWindow);
			wc.on('before-input-event', keyHandler);

			// Save a reference to allow remove of listener from elsewhere
			shortcutsOfWindow.removeListener = () =>
				wc.removeListener('before-input-event', keyHandler);
			win!.once('closed', shortcutsOfWindow.removeListener);
		}
	}

	console.log('Adding shortcut to window set.');

	const eventStamp = toKeyEvent(accelerator);

	shortcutsOfWindow.push({
		eventStamp,
		callback,
		enabled: true
	});

	console.log('Shortcut registered.');
}

/**
 * Unregisters the shortcut of accelerator registered on the BrowserWindow instance.
 */
export function unregister(win: BrowserWindow, accelerator: string | string[]): void;
export function unregister(accelerator: string | string[]): void;
export function unregister(
	winOrAccelerator: BrowserWindow | string | string[],
	maybeAccelerator?: string | string[]
): void {
	let wc: WebContents;
	let win: BrowserWindow | undefined;
	let accelerator: string | string[];

	if (typeof maybeAccelerator === 'undefined') {
		wc = ANY_WINDOW;
		accelerator = winOrAccelerator as string | string[];
	} else {
		win = winOrAccelerator as BrowserWindow;
		if (win.isDestroyed()) {
			console.log('Early return because window is destroyed.');
			return;
		}
		wc = win.webContents;
		accelerator = maybeAccelerator;
	}

	if (Array.isArray(accelerator)) {
		accelerator.forEach(acc => {
			if (typeof acc === 'string') {
				unregister(win as any, acc);
			}
		});
		return;
	}

	console.log(`Unregistering callback for ${accelerator} on window ${title(win)}`);

	_checkAccelerator(accelerator);

	console.log(`${accelerator} seems a valid shortcut sequence.`);

	if (!windowsWithShortcuts.has(wc)) {
		console.log('Early return because window has never had shortcuts registered.');
		return;
	}

	const shortcutsOfWindow = windowsWithShortcuts.get(wc)!;

	const eventStamp = toKeyEvent(accelerator);
	const shortcutIdx = _findShortcut(eventStamp, shortcutsOfWindow);
	if (shortcutIdx === -1) {
		return;
	}

	shortcutsOfWindow.splice(shortcutIdx, 1);

	// If the window has no more shortcuts,
	// we remove it early from the WeakMap
	// and unregistering the event listener
	if (shortcutsOfWindow.length === 0) {
		// Remove listener from window
		shortcutsOfWindow.removeListener?.();

		// Remove window from shortcuts catalog
		windowsWithShortcuts.delete(wc);
	}
}

/**
 * Returns true or false depending on whether the shortcut accelerator
 * is registered on window.
 */
export function isRegistered(win: BrowserWindow, accelerator: string): boolean {
	_checkAccelerator(accelerator);
	const wc = win.webContents;
	const shortcutsOfWindow = windowsWithShortcuts.get(wc);
	
	if (!shortcutsOfWindow) {
		return false;
	}
	
	const eventStamp = toKeyEvent(accelerator);
	return _findShortcut(eventStamp, shortcutsOfWindow) !== -1;
}
