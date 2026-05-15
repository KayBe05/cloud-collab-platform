(function (window) {
  'use strict';

  const CLOUDX_THEME = {
    background: 'transparent',
    foreground: '#dbeaff',
    cursor: '#00ccff',
    cursorAccent: '#060b12',
    selectionBackground: 'rgba(0, 204, 255, 0.18)',
    selectionForeground: '#dbeaff',

    black: '#0d1117',
    red: '#ef4444',
    green: '#00e87a',
    yellow: '#f59e0b',
    blue: '#3b82f6',
    magenta: '#8b5cf6',
    cyan: '#00ccff',
    white: '#dbeaff',

    brightBlack: '#4b5563',
    brightRed: '#f87171',
    brightGreen: '#34d399',
    brightYellow: '#fbbf24',
    brightBlue: '#60a5fa',
    brightMagenta: '#a78bfa',
    brightCyan: '#67e8f9',
    brightWhite: '#f0f9ff',
  };

  let _term = null;
  let _fitAddon = null;
  let _socket = null;
  let _containerId = null;
  let _resizeObserver = null;
  let _connected = false;
  let _outputListener = null;


  let _writeBuffer = [];
  let _writeRafId = null;

  function _flushWriteBuffer() {
    if (!_term || _writeBuffer.length === 0) { _writeRafId = null; return; }
    const payload = _writeBuffer.join('');
    _writeBuffer = [];
    _writeRafId = null;
    _term.write(payload);
  }

  function _bufferWrite(data) {
    _writeBuffer.push(data);
    if (!_writeRafId) {
      _writeRafId = requestAnimationFrame(_flushWriteBuffer);
    }
  }

  const XTERM_VERSION = '5.3.0';
  const CDN_BASE = `https://unpkg.com/@xterm/xterm@${XTERM_VERSION}/`;
  const XTERM_FIT_CDN = `https://unpkg.com/@xterm/addon-fit@0.8.0/lib/addon-fit.min.js`;
  const XTERM_WEB_CDN = `https://unpkg.com/@xterm/addon-web-links@0.9.0/lib/addon-web-links.min.js`;

  function ensureXterm() {
    return new Promise((resolve, reject) => {
      if (typeof Terminal !== 'undefined') { resolve(); return; }

      if (!document.getElementById('xterm-css')) {
        const link = document.createElement('link');
        link.id = 'xterm-css';
        link.rel = 'stylesheet';
        link.href = CDN_BASE + 'css/xterm.css';
        document.head.appendChild(link);
      }

      const load = (src, next) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = next;
        s.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(s);
      };

      load(CDN_BASE + 'lib/xterm.min.js', () => {
        load(XTERM_FIT_CDN, () => {
          load(XTERM_WEB_CDN, resolve);
        });
      });
    });
  }

  async function init(options = {}) {
    const {
      containerId,
      mountEl,
      socket: externalSocket,
    } = options;

    if (!mountEl) {
      console.error('[Terminal] mountEl is required');
      return null;
    }

    _containerId = containerId || null;
    _socket = externalSocket || (typeof socket !== 'undefined' ? socket : null);

    try {
      await ensureXterm();
    } catch (e) {
      mountEl.innerHTML =
        `<div style="padding:1rem;color:#ef4444;font-family:'JetBrains Mono',monospace">
           ⚠ Failed to load Xterm.js: ${e}
         </div>`;
      return null;
    }

    _term = new Terminal({
      theme: CLOUDX_THEME,
      fontFamily: '"JetBrains Mono", "DM Mono", "Cascadia Code", "Fira Code", monospace',
      fontSize: 13,
      fontWeight: '400',
      fontWeightBold: '600',
      lineHeight: 1.45,
      letterSpacing: 0.3,
      cursorBlink: true,
      cursorStyle: 'bar',
      scrollback: 8000,
      tabStopWidth: 4,
      allowProposedApi: true,
      convertEol: true,
      cols: 120,
      rows: 30,
      smoothScrollDuration: 125,
    });

    _fitAddon = new FitAddon.FitAddon();
    _term.loadAddon(_fitAddon);

    if (typeof WebLinksAddon !== 'undefined') {
      try {
        _term.loadAddon(new WebLinksAddon.WebLinksAddon());
      } catch (_) { }
    }

    _term.open(mountEl);
    setTimeout(() => { try { _fitAddon.fit(); } catch (_) { } }, 50);

    if (window.ResizeObserver) {
      _resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(() => {
          try { _fitAddon?.fit(); } catch (_) { }
        });
      });
      _resizeObserver.observe(mountEl);
    }

    _banner();

    _term.onData(data => {
      if (_connected && _socket) {
        _socket.emit('terminal_input', { input: data });
      }
    });

    _term.attachCustomKeyEventHandler(event => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
        navigator.clipboard?.readText().then(text => {
          if (text && _connected && _socket) {
            _socket.emit('terminal_input', { input: text });
          }
        }).catch(() => { });
        return false;
      }
      return true;
    });

    if (_containerId && _socket) {
      connectToContainer(_containerId);
    }

    return _term;
  }

  function _banner() {
    if (!_term) return;
    _term.writeln('\x1b[1;36m ██████╗██╗      ██████╗ ██╗   ██╗██████╗  \x1b[0m');
    _term.writeln('\x1b[1;36m██╔════╝██║     ██╔═══██╗██║   ██║██╔══██╗ \x1b[0m');
    _term.writeln('\x1b[1;36m██║     ██║     ██║   ██║██║   ██║██║  ██║ \x1b[0m');
    _term.writeln('\x1b[1;36m██║     ██║     ██║   ██║██║   ██║██║  ██║ \x1b[0m');
    _term.writeln('\x1b[1;36m╚██████╗███████╗╚██████╔╝╚██████╔╝██████╔╝ \x1b[0m');
    _term.writeln('\x1b[1;36m ╚═════╝╚══════╝ ╚═════╝  ╚═════╝ ╚═════╝ \x1b[0m');
    _term.writeln('');
    _term.writeln('\x1b[2mCloudX Workspace Terminal  ·  Glassmorphism Theme\x1b[0m');
    _term.writeln(`\x1b[2m${new Date().toLocaleString()}\x1b[0m`);
    _term.writeln('');
  }

  function connectToContainer(containerId) {
    if (!_socket) {
      console.warn('[Terminal] No Socket.IO instance available');
      return;
    }

    _containerId = containerId;
    _connected = false;

    if (_term) {
      _term.writeln(`\x1b[33m⟳ Connecting to container \x1b[1m${containerId}\x1b[0m\x1b[33m…\x1b[0m`);
    }

    _socket.emit('terminal_join', { container_id: containerId });
    _connected = true;

    if (_outputListener) {
      _socket.off('terminal_output', _outputListener);
    }

    _outputListener = (data) => {
      if (!_term) return;
      const text = typeof data === 'string' ? data : (data.output ?? '');
      if (text) _bufferWrite(text);
    };

    _socket.on('terminal_output', _outputListener);

    if (_term) {
      _term.writeln('\x1b[32m✓ Terminal attached — type to interact\x1b[0m\r\n');
    }
  }

  function disconnect() {
    _connected = false;
    if (_socket && _outputListener) {
      _socket.off('terminal_output', _outputListener);
      _outputListener = null;
    }
    if (_term) _term.writeln('\r\n\x1b[33m⟳ Disconnected.\x1b[0m');
  }

  function clear() {
    if (_term) _term.clear();
  }

  function writeLine(text, color) {
    if (!_term) return;
    const COLORS = {
      cyan: '\x1b[36m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      red: '\x1b[31m',
      magenta: '\x1b[35m',
      reset: '\x1b[0m',
    };
    const c = color ? (COLORS[color] || '') : '';
    _term.writeln(c + text + COLORS.reset);
  }

  function fit() {
    try { _fitAddon?.fit(); } catch (_) { }
  }

  function destroy() {
    disconnect();
    if (_writeRafId) { cancelAnimationFrame(_writeRafId); _writeRafId = null; }
    if (_resizeObserver) { _resizeObserver.disconnect(); _resizeObserver = null; }
    if (_term) { _term.dispose(); _term = null; }
    _fitAddon = null;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const mountEl = document.getElementById('terminalMount');
    if (!mountEl) return;

    const containerId = mountEl.dataset.containerId ||
      new URLSearchParams(location.search).get('container') || null;

    const sock = typeof socket !== 'undefined' ? socket : null;

    CloudXTerminal.init({ containerId, mountEl, socket: sock }).then(term => {
      if (!term) return;

      window._term = term;

      ['termClearBtn', 'termClearBtnInner'].forEach(id => {
        document.getElementById(id)?.addEventListener('click', clear);
      });

      ['termFitBtn'].forEach(id => {
        document.getElementById(id)?.addEventListener('click', fit);
      });

      document.querySelectorAll('[data-terminal-connect]').forEach(btn => {
        btn.addEventListener('click', () => {
          const cid = btn.dataset.terminalConnect;
          if (cid) connectToContainer(cid);
        });
      });
    });
  });

  window.CloudXTerminal = {
    init,
    connectToContainer,
    disconnect,
    clear,
    writeLine,
    fit,
    destroy,
    getTerminal: () => _term,
  };

}(window));