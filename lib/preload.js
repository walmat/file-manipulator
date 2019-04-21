// eslint-disable-next-line import/no-extraneous-dependencies
const { remote: { dialog, app }, ipcRenderer, webFrame } = require('electron');
const fs = require('fs');
const util = require('util');

// disable zoom
webFrame.setVisualZoomLevelLimits(1, 1);
webFrame.setLayoutZoomLevelLimits(0, 0);

/**
 * Sends IPCMain an event trigger
 *
 * @param {String} channel definition for which trigger to look for
 * @param {*} msg any object to send along with the event || null
 */
const _sendEvent = (channel, ...params) => {
  ipcRenderer.send(channel, ...params);
};

/**
 * Remove an Event Listener from an IPC event
 *
 * @param {String} channel the channel where this handler should be removed from
 * @param {Function} handler the same function reference that was used when attaching
 */
const _removeEvent = (channel, handler) => {
  ipcRenderer.removeListener(channel, handler);
};

/**
 * Sets up a listener for an IPC event
 *
 * @param {String} channel the channel to attach this handler to
 * @param {Function} handler the handler to call when a channel event is sent
 */
const _handleEvent = (channel, handler) => {
  ipcRenderer.on(channel, handler);
};

const defaultOpts = {
  defaultPath: app.getPath('documents'),
  properties: [ 'openFile', 'createDirectory' ],
};

const _openDialog = async({
  buttonLabel,
  message,
  title
  }) =>
  new Promise(resolve => {
    dialog.showOpenDialog({
      ...defaultOpts,
      buttonLabel,
      message,
      properties: defaultOpts.properties,
      title,
    },
    filePath => resolve(filePath),
  );
});

const read = util.promisify(fs.readFile);
const write = util.promisify(fs.writeFile);

const _readFile = async filePath => await read(filePath, 'utf8');
const _writeFile = async (filePath, content) => await write(filePath, content);

const _saveDialog = async ({
  title,
  buttonLabel,
  message,
}) =>
  new Promise(resolve => {
    dialog.showSaveDialog({
      defaultPath: app.getPath('documents'),
      title,
      buttonLabel,
      message,
    },
    filePath => resolve(filePath),
  );
});

/**
 * On process load, create the Bridge
 */
process.once('loaded', () => {
  window.Bridge = window.Bridge || {
    readFile: _readFile,
    writeFile: _writeFile,
    openDialog: _openDialog,
    saveDialog: _saveDialog,
    handleEvent: _handleEvent,
    removeEvent: _removeEvent,
    sendEvent: _sendEvent,
  };
});