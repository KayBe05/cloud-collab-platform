/* ================================================================
   terminal.js — CloudX Xterm.js Terminal
   Dracula dark theme · Socket.IO buffered stream · FitAddon
   ================================================================ */

(function (window) {
  'use strict';

  /* ── Dracula colour palette ────────────────────────────────────── */
  const DRACULA = {
    background: '#0d1117',
    foreground: '#f8f8f2',
    cursor: '#f8f8f2',
    cursorAccent: '#282a36',
    selectionBackground: 'rgba(68,71,90,0.5)',
    black: '#21222c',
    brightBlack: '#6272a4',
    red: '#ff5555',
    brightRed: '#ff6e6e',
    green: '#50fa7b',
    brightGreen: '#69ff94',
    yellow: '#f1fa8c',
    brightYellow: '#ffffa5',
    blue: '#bd93f9',
    brightBlue: '#d6acff',
    magenta: '#ff79c6',
    brightMagenta: '#ff92df',
    cyan: '#8be9fd',
    brightCyan: '#a4ffff',
    white: '#f8f8f2',
    brightWhite: '#ffffff',
  };

  /* ── Internal state ────────────────────────────────────────────── */
  let _term = null;
  let _fitAddon = null;
  let _socket = null;
  let _containerId = null;
  let _resizeObserver = null;
  let _connected = false;

  /* ── Load Xterm.js + addons lazily if not already present ──────── */
  const XTERM_VERSION = '5.3.0';
  const CDN_BASE = `https://unpkg.com/@xterm/xterm@${XTERM_VERSION}/`;
  const XTERM_FIT_CDN = `https://unpkg.com/@xterm/addon-fit@0.8.0/lib/addon-fit.min.js`;

  function ensureXterm() {
    return new Promise((resolve, reject) => {
      if (typeof Terminal !== 'undefined') { resolve(); return; }

      /* CSS */
      if (!document.getElementById('xterm-css')) {
        const link = document.createElement('link');
        link.id = 'xterm-css';
        link.rel = 'stylesheet';
        link.href = CDN_BASE + 'css/xterm.css';
        document.head.appendChild(link);
      }

      /* xterm.js */
      const s = document.createElement('script');
      s.src = CDN_BASE + 'lib/xterm.min.js';
      s.onload = () => {
        /* FitAddon */
        const f = document.createElement('script');
        f.src = XTERM_FIT_CDN;
        f.onload = resolve;
        f.onerror = reject;
        document.head.appendChild(f);
      };
      s.onerror = reject;
      document.head.appendChild(s);
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

    /* Ensure Xterm loaded */
    try {
      await ensureXterm();
    } catch (e) {
      mountEl.innerHTML = '<div style="padding:1rem;color:#ff5555;font-family:monospace">⚠ Failed to load Xterm.js: ' + e + '</div>';
      return null;
    }

    /* Create terminal */
    _term = new Terminal({
      theme: DRACULA,
      fontFamily: '"JetBrains Mono", "DM Mono", "Cascadia Code", monospace',
      fontSize: 13,
      fontWeight: '400',
      fontWeightBold: '600',
      lineHeight: 1.45,
      letterSpacing: 0.3,
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 5000,
      tabStopWidth: 4,
      allowProposedApi: true,
      convertEol: true,
      cols: 120,
      rows: 30,
    });

    /* FitAddon */
    _fitAddon = new FitAddon.FitAddon();
    _term.loadAddon(_fitAddon);

    /* Mount */
    _term.open(mountEl);
    _fitAddon.fit();

    /* Resize observer – re-fit on container size change */
    if (window.ResizeObserver) {
      _resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(() => {
          if (_fitAddon) {
            try { _fitAddon.fit(); } catch (_) { }
          }
        });
      });
      _resizeObserver.observe(mountEl);
    }

    /* Welcome banner */
    _term.writeln('\x1b[1;36m ██████╗██╗      ██████╗ ██╗   ██╗██████╗  \x1b[0m');
    _term.writeln('\x1b[1;36m██╔════╝██║     ██╔═══██╗██║   ██║██╔══██╗ \x1b[0m');
    _term.writeln('\x1b[1;36m██║     ██║     ██║   ██║██║   ██║██║  ██║ \x1b[0m');
    _term.writeln('\x1b[1;36m██║     ██║     ██║   ██║██║   ██║██║  ██║ \x1b[0m');
    _term.writeln('\x1b[1;36m╚██████╗███████╗╚██████╔╝╚██████╔╝██████╔╝ \x1b[0m');
    _term.writeln('\x1b[1;36m ╚═════╝╚══════╝ ╚═════╝  ╚═════╝ ╚═════╝ \x1b[0m');
    _term.writeln('');
    _term.writeln('\x1b[2mCloudX Workspace Terminal  ·  Dracula Theme\x1b[0m');
    _term.writeln('\x1b[2m' + new Date().toLocaleString() + '\x1b[0m');
    _term.writeln('');

    /* Key input → Socket */
    _term.onData(data => {
      if (_connected && _socket) {
        _socket.emit('terminal_input', { input: data });
      }
    });

    /* Paste support */
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

  function connectToContainer(containerId) {
    if (!_socket) {
      console.warn('[Terminal] No Socket.IO instance available');
      return;
    }

    _containerId = containerId;
    _connected = false;

    if (_term) {
      _term.writeln('\x1b[33m⟳ Connecting to container ' + containerId + '…\x1b[0m');
    }

    _socket.emit('terminal_join', { container_id: containerId });
    _connected = true;

    _socket.off('terminal_output'); 
    _socket.on('terminal_output', data => {
      if (_term) {
        _term.write(data.output);
      }
    });

    if (_term) {
      _term.writeln('\x1b[32m✓ Terminal attached\x1b[0m\r\n');
    }
  }

  function disconnect() {
    _connected = false;
    if (_socket) _socket.off('terminal_output');
    if (_term) _term.writeln('\r\n\x1b[33m⟳ Disconnected.\x1b[0m');
  }


  function clear() {
    if (_term) _term.clear();
  }

  function writeLine(text, color) {
    if (!_term) return;
    const COLORS = { cyan: '\x1b[36m', green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m', reset: '\x1b[0m' };
    const c = color ? (COLORS[color] || '') : '';
    _term.writeln(c + text + COLORS.reset);
  }

  function fit() {
    if (_fitAddon) {
      try { _fitAddon.fit(); } catch (_) { }
    }
  }

  function destroy() {
    disconnect();
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
      if (term) {
        window._term = term;

        document.getElementById('termClearBtn')?.addEventListener('click', clear);
        document.getElementById('termFitBtn')?.addEventListener('click', fit);

        document.querySelectorAll('[data-terminal-connect]').forEach(btn => {
          btn.addEventListener('click', () => {
            const cid = btn.dataset.terminalConnect;
            if (cid) connectToContainer(cid);
          });
        });
      }
    });
  });

  /* ======== PUBLIC  API ================== */

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