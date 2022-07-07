const { ipcRenderer, contextBridge } = require('electron');
const { app, getCurrentWindow, getGlobal, dialog, BrowserWindow, process } = require('@electron/remote');
const fs = require('fs');
const os = require('os');
const path = require('path');
const readChunk = require('read-chunk');
const fileType = require('file-type');
const userPath = app.getPath('userData');

contextBridge.exposeInMainWorld('Electron', {
	version: {
		app: app.getVersion(),
		os: os.release(),
		system: process.getSystemVersion(),
	},
	platform: os.platform(),
	arch: process.arch,

	currentWindow: getCurrentWindow(),

	isPackaged: app.isPackaged,
	userPath,
	tmpPath: path.join(userPath, 'tmp'),
	getPath: (fp, fn) => path.join(fp, fn),

	isMaximized: () => BrowserWindow.getFocusedWindow()?.isMaximized(),
	getGlobal: (key) => getGlobal(key),
	showOpenDialog: dialog.showOpenDialog,

	fs,
	readChunk,
	fileType,

	on: (event, callBack) => ipcRenderer.on(event, callBack),
	removeAllListeners: (event) => ipcRenderer.removeAllListeners(event),
	Api: (cmd, args) => ipcRenderer.invoke('Api', cmd, args),
});