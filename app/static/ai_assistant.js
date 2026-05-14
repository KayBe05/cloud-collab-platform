(function (window) {
  'use strict';

  let _isOpen = false;
  let _isSending = false;
  let _messageCount = 0;
  let _sessionStart = Date.now();

  const $ = id => document.getElementById(id);

  const _contextProviders = [];

  function registerContextProvider(fn) {
    _contextProviders.push(fn);
  }

  function _collectContext() {
    if (window._monacoEditor) {
      const model = window._monacoEditor.getModel();
      const lang = model ? model.getModeId?.() || model.getLanguageId?.() || 'unknown' : 'unknown';
      const value = window._monacoEditor.getValue();
      return `// Language: ${lang}\n${value}`;
    }
    if (window.__ideContext) return window.__ideContext;
    for (const fn of _contextProviders) {
      try { const r = fn(); if (r) return r; } catch (_) { }
    }
    return '';
  }

  function toggle() {
    _isOpen = !_isOpen;
    const sidebar = $('aiSidebar');
    const overlay = $('aiOverlay');
    const fab = $('aiFab');

    if (!sidebar) return;

    sidebar.classList.toggle('open', _isOpen);
    if (overlay) overlay.classList.toggle('visible', _isOpen);
    if (fab) fab.setAttribute('aria-expanded', _isOpen);

    if (_isOpen) {
      setTimeout(() => {
        const ta = $('aiQuery');
        if (ta) ta.focus();
      }, 350);
    }
  }

  function open() { if (!_isOpen) toggle(); }
  function close() { if (_isOpen) toggle(); }

  function _now() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function _sanitise(html) {
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/javascript:/gi, '');
  }

  function _renderContent(text, isMarkdown) {
    if (isMarkdown && typeof marked !== 'undefined') {
      marked.setOptions({
        breaks: true,
        gfm: true,
        highlight: (code, lang) => {
          if (window.hljs && lang && window.hljs.getLanguage(lang)) {
            return window.hljs.highlight(code, { language: lang }).value;
          }
          return code;
        }
      });
      return _sanitise(marked.parse(text));
    }
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
  }

  function appendMessage(containerId, role, text, isMarkdown = false) {
    const container = $(containerId);
    if (!container) return;

    const id = `msg-${++_messageCount}`;
    const content = _renderContent(text, isMarkdown);
    const time = _now();

    const div = document.createElement('div');
    div.className = `ai-msg ${role}`;
    div.id = id;
    div.innerHTML = `
      <div class="ai-msg-bubble">${content}</div>
      <span class="ai-msg-time">${time}</span>`;

    container.appendChild(div);
    _scrollToBottom(container);
    return id;
  }

  function appendTypingIndicator(containerId) {
    const container = $(containerId);
    if (!container) return null;
    const id = `typing-${Date.now()}`;
    container.insertAdjacentHTML('beforeend', `
      <div class="ai-msg assistant" id="${id}">
        <div class="ai-typing">
          <div class="ai-typing-dots">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>`);
    _scrollToBottom(container);
    return id;
  }

  function removeTypingIndicator(id) {
    if (id) $(id)?.remove();
  }

  function _scrollToBottom(el) {
    requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
  }

  async function sendQuery(options = {}) {
    const {
      query,
      useContext = false,
      messagesId = 'aiMessages',
      sendBtnId = 'aiSendBtn',
      modelBadgeId = 'aiModelBadge',
      onSuccess,
      onError,
    } = options;

    if (!query || !query.trim()) return;
    if (_isSending) return;
    _isSending = true;

    const sendBtn = $(sendBtnId);
    if (sendBtn) sendBtn.disabled = true;

    appendMessage(messagesId, 'user', query.trim());

    const typingId = appendTypingIndicator(messagesId);

    const codeContext = useContext ? _collectContext() : '';

    try {
      const resp = await fetch('/api/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_query: query.trim(),
          code_context: codeContext,
        }),
      });

      removeTypingIndicator(typingId);

      if (!resp.ok) {
        const errText = `HTTP ${resp.status}: ${resp.statusText}`;
        appendMessage(messagesId, 'assistant', `⚠️ **Request failed:** ${errText}`, true);
        onError?.(errText);
        return;
      }

      const data = await resp.json();

      if (data.success) {
        appendMessage(messagesId, 'assistant', data.suggestion, true);

        if (modelBadgeId && data.model) {
          const badge = $(modelBadgeId);
          if (badge) badge.textContent = data.model;
        }

        if (data.usage?.prompt_tokens) {
          _appendUsageHint(messagesId, data.usage);
        }

        onSuccess?.(data);
      } else {
        const errMsg = data.error || 'Unknown error occurred.';
        appendMessage(messagesId, 'assistant', `⚠️ **Error:** ${errMsg}`, true);
        onError?.(errMsg);
      }
    } catch (err) {
      removeTypingIndicator(typingId);
      appendMessage(
        messagesId,
        'assistant',
        `⚠️ **Network error:** ${err.message || 'Could not reach the AI service.'}`,
        true
      );
      onError?.(err.message);
    } finally {
      _isSending = false;
      if (sendBtn) sendBtn.disabled = false;
    }
  }

  function _appendUsageHint(containerId, usage) {
    const container = $(containerId);
    if (!container) return;
    const hint = document.createElement('div');
    hint.style.cssText = `
      font-family: var(--cx-mono);
      font-size: 0.62rem;
      color: var(--cx-t3);
      text-align: right;
      padding: 0 0.25rem 0.25rem;
    `;
    hint.textContent = `${usage.prompt_tokens ?? '?'} prompt · ${usage.candidates_tokens ?? '?'} response tokens`;
    container.appendChild(hint);
  }

  function _wireDashboardSidebar() {
    const queryEl = $('aiQuery');
    const sendBtn = $('aiSendBtn');
    const clearBtn = $('aiClearBtn');
    const overlay = $('aiOverlay');

    if (!queryEl) return;

    queryEl.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        _triggerDashboardSend();
      }
    });

    queryEl.addEventListener('input', () => {
      queryEl.style.height = 'auto';
      queryEl.style.height = Math.min(queryEl.scrollHeight, 180) + 'px';
    });

    if (sendBtn) sendBtn.addEventListener('click', _triggerDashboardSend);

    if (clearBtn) clearBtn.addEventListener('click', _clearConversation);

    if (overlay) overlay.addEventListener('click', close);

    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        toggle();
      }
    });
  }

  function _triggerDashboardSend() {
    const queryEl = $('aiQuery');
    const contextToggle = $('aiContextToggle');
    if (!queryEl) return;

    const query = queryEl.value.trim();
    if (!query) return;

    queryEl.value = '';
    queryEl.style.height = '';

    sendQuery({
      query,
      useContext: contextToggle?.checked ?? false,
      messagesId: 'aiMessages',
      sendBtnId: 'aiSendBtn',
      modelBadgeId: 'aiModelBadge',
    });
  }

  function _clearConversation() {
    const container = $('aiMessages');
    if (!container) return;
    while (container.children.length > 1) {
      container.removeChild(container.lastChild);
    }
  }

  const SUGGESTED_PROMPTS = [
    'Review this code for security vulnerabilities',
  ];

  function _renderSuggestedPrompts() {
    const container = $('aiSuggestedPrompts');
    if (!container) return;
    container.innerHTML = SUGGESTED_PROMPTS.map(p => `
      <button class="ai-prompt-chip" onclick="CloudXAI._injectPrompt(${JSON.stringify(p)})">
        ${p}
      </button>`).join('');
  }

  function _injectPrompt(text) {
    const ta = $('aiQuery');
    if (ta) {
      ta.value = text;
      ta.focus();
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 180) + 'px';
    }
  }

  function _attachCodeCopyButtons() {
    ['aiMessages', 'wsAiMessages'].forEach(containerId => {
      const el = $(containerId);
      if (!el) return;
      el.addEventListener('click', e => {
        const btn = e.target.closest('.ai-copy-btn');
        if (!btn) return;
        const pre = btn.closest('pre');
        const code = pre?.querySelector('code')?.textContent || '';
        navigator.clipboard?.writeText(code).then(() => {
          btn.textContent = '✓ Copied';
          btn.classList.add('copied');
          setTimeout(() => {
            btn.textContent = 'Copy';
            btn.classList.remove('copied');
          }, 2000);
        });
      });
    });
  }

  function _enhanceMarkdownOutput() {
    ['aiMessages', 'wsAiMessages'].forEach(containerId => {
      const el = $(containerId);
      if (!el) return;

      const observer = new MutationObserver(mutations => {
        mutations.forEach(m => {
          m.addedNodes.forEach(node => {
            if (node.nodeType !== 1) return;
            node.querySelectorAll('pre').forEach(pre => {
              if (pre.querySelector('.ai-copy-btn')) return;
              const btn = document.createElement('button');
              btn.className = 'ai-copy-btn';
              btn.textContent = 'Copy';
              pre.style.position = 'relative';
              pre.appendChild(btn);
            });
          });
        });
      });

      observer.observe(el, { childList: true, subtree: true });
    });
  }

  function init() {
    _wireDashboardSidebar();
    _renderSuggestedPrompts();
    _enhanceMarkdownOutput();
    _attachCodeCopyButtons();
  }

  window.CloudXAI = {
    init,
    toggle,
    open,
    close,
    sendQuery,
    appendMessage,
    registerContextProvider,
    _injectPrompt,  
  };

  window.toggleAI = toggle;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

}(window));