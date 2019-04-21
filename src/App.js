import React, { Component } from 'react';
import sanitizeHtml from 'sanitize-html';
import { filter, forEach } from 'underscore';
import { EOL } from 'os';
import './App.scss';

class App extends Component {
  static sanitize(dirty) {
    return sanitizeHtml(dirty, { allowedTags: [], allowedAttributes: [] });
  }

  constructor(props) {
    super(props);

    this.state = {
      file: null,
      counter: 0,
      word: '',
      lines: [],
      matchedLines: [],
      editing: false,
    }

    // ref
    this.domNode = React.createRef();

    // Bind functions
    this.handleUpdate = this.handleUpdate.bind(this);
    this.focus = this.focus.bind(this);
    this.blur = this.blur.bind(this);
    this.paste = this.paste.bind(this);
    this.import = this.import.bind(this);
    this.export = this.export.bind(this);
    this.match = this.match.bind(this);
    this.delete = this.delete.bind(this);
  }

  shouldComponentUpdate(nextState) {
    const { editing } = this.state;
    // re-render only if we are not editing or are changing our editing state
    return !(editing && nextState.editing);
  }

  blur() {
    const { lines } = this.state;
    // Force an editing transition to color matched lines
    this.setState({
      lines: lines.map(l => l.trim()),
      editing: false,
    });
  }

  focus() {
    // Force an editing transition to not color invalid proxies
    this.setState({
      editing: true,
    });
  }

  paste(e) {
    // Prevent default and event propagation
    e.preventDefault();
    e.stopPropagation();

    // Get the clipboard data and sanitize the text
    const data = e.clipboardData || window.clipboardData;

    const text = App.sanitize(data.getData('text'));

    // Perform the insert using the plain text to mimic the paste
    if (document.queryCommandSupported('insertText')) {
      document.execCommand('insertText', false, text);
    } else {
      document.execCommand('paste', false, text);
    }

    // Force an update
    this.handleUpdate(null);
  }

  handleUpdate() {
    // If we don't have the dom node, there's nothing to do here.
    if (!this.domNode.current) return;

    const newLines = this.domNode.current.innerText
      .trim()
      .split(EOL)
      .map(l => App.sanitize(l.trim()))
      .filter(l => l.length > 0);

    // Update the component state with newProxies and set the reduxUpdate flag
    this.setState({
      editing: false,
      lines: newLines,
    });
  }

  async import() {
    if (window.Bridge) {
      const file = await window.Bridge.openDialog({
        buttonLabel: 'Choose File',
        message: 'Select a file to import contents',
        title: 'Import File',
      });
      if (file) {
        const contents = await window.Bridge.readFile(file[0]);
        this.setState({
          lines: contents.split(EOL),
          file: file[0],
          matchedLines: [],
          counter: 0,
          editing: false,
        });
      }
    }
  }

  async export() {
    const { lines } = this.state;
    if (window.Bridge) {
      const file = await window.Bridge.saveDialog({
        title: 'Export File',
        buttonLabel: 'Save File',
        message: 'Choose a location to export contents',
      });

      if (file) {
        await window.Bridge.writeFile(file, lines.join(EOL));
        this.setState({
          file: null,
          counter: 0,
          lines: [],
          matchedLines: [],
          editing: false,
        });
      }
    }
  }

  async save() {
    let { counter } = this.state;
    const { lines, file } = this.state;
    if (file) {
      const [name, ext] = file.split('.');
      if (window.Bridge) {
        await window.Bridge.writeFile(`${name}-${counter}.${ext}`, lines.join(EOL));
        this.setState({ counter: counter += 1 });
      }
    }
  }

  async match() {
    let { word, lines, matchedLines } = this.state;
    if (!word) {
      this.setState({ matchedLines: [], editing: false });
      return;
    }
    this.setState({ matchedLines: [] });
    await forEach(lines, (l, idx) => {
      if (l.toUpperCase().indexOf(word.toUpperCase()) > -1) {
        matchedLines.push(idx);
      }
    });
    this.setState({ editing: false, matchedLines });
  }

  async delete() {
    let { matchedLines, lines } = this.state;
    lines = await filter(lines, (l, idx) => {
      if (!matchedLines.includes(idx)) {
        return l;
      }
    });
    this.setState({ lines, matchedLines: [] });
    this.save();
  }

  async onChangeHandler(e, field) {
    e.preventDefault();

    switch(field) {
      case 'word': {
        await this.setState({ word: e.target.value });
        break;
      }
      default: break;
    }
  }

  renderLines() {
    const { editing, lines, matchedLines } = this.state;
    // If we don't have any lines, return an empty list
    if (lines.length === 0) {
      return '<div><br /></div>';
    }

    // If we are in editing mode, don't apply any styling
    if (editing) {
      return lines.map(l => `<div>${App.sanitize(l)}</div>`).join('');
    }
    // Return lines, styled in red if that line is matched
    return lines
      .map(
        (l, idx) =>
          `<div ${matchedLines.includes(idx) ? 'class="App--matched"' : ''}>${App.sanitize(
            l,
          )}</div>`,
      )
      .join('');
  }

  renderInputDiv() {
    return React.createElement('div', {
      ref: this.domNode,
      className: 'App--text-area',
      onInput: this.handleUpdate,
      onFocus: this.focus,
      onBlur: this.blur,
      onPaste: this.paste,
      dangerouslySetInnerHTML: { __html: this.renderLines() },
      contentEditable: true,
    });
  }

  render() {
    const { word } = this.state;
    return (
      <div className="App">
        <header className="App--header">
          <button
            type="button"
            className="btn btn-primary App--button"
            onClick={this.import}
          >
            Import
          </button>
          <button
            type="button"
            className="btn btn-secondary App--button"
            onClick={this.export}
          >
            Export
          </button>
          <input
            onChange={e => this.onChangeHandler(e, 'word')}
            className="App--input"
            value={word}
          />
          <button
            type="button"
            className="btn btn-warning App--button"
            onClick={this.match}
          >
            Check
          </button>
          <button
            type="button"
            className="btn btn-danger App--button"
            onClick={this.delete}
          >
            Remove
          </button>
        </header>
        {this.renderInputDiv()}
      </div>
    );
  }
}

export default App;
