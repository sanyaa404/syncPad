export class CursorManager {
  constructor(editor, monacoInstance) {
    this.editor = editor;
    this.monaco = monacoInstance;
    this.cursors = {}; // { userId: { decorationIds, styleEl } }
  }

  updateCursor(userId, username, color, line, column) {
    this.removeCursor(userId);

    // Inject style for this user
    const styleId = `cursor-style-${userId}`;
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `
      .cursor-line-${userId} {
        background: ${color}22 !important;
        border-left: 3px solid ${color} !important;
      }
      .cursor-label-${userId}::after {
        content: "${username}";
        background: ${color};
        color: #000;
        font-size: 11px;
        font-weight: 700;
        padding: 1px 5px;
        border-radius: 3px;
        position: absolute;
        top: -18px;
        left: 0;
        white-space: nowrap;
        pointer-events: none;
        z-index: 999;
      }
      .cursor-label-${userId} {
        position: relative;
        border-left: 2px solid ${color};
        margin-left: -1px;
      }
    `;

    const decorationIds = this.editor.deltaDecorations([], [
      // Whole line background
      {
        range: new this.monaco.Range(line, 1, line, 1),
        options: {
          isWholeLine: true,
          className: `cursor-line-${userId}`,
        }
      },
      // Cursor caret with name label
      {
        range: new this.monaco.Range(line, column, line, column),
        options: {
          beforeContentClassName: `cursor-label-${userId}`,
        }
      }
    ]);

    this.cursors[userId] = { decorationIds, styleEl };
  }

  removeCursor(userId) {
    if (this.cursors[userId]) {
      this.editor.deltaDecorations(this.cursors[userId].decorationIds, []);
      delete this.cursors[userId];
    }
  }

  removeAll() {
    Object.keys(this.cursors).forEach(userId => this.removeCursor(userId));
  }
}