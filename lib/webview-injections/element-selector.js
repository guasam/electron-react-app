(function() {
  if (window.__inspectorSelectorActive) return;
  window.__inspectorSelectorActive = true;

  const MESSAGE_SOURCE = '__MESSAGE_SOURCE_PLACEHOLDER__';
  const postToHost = (type, payload) => {
    try {
      window.postMessage({ source: MESSAGE_SOURCE, type, payload }, '*');
    } catch (error) {
      console.error('Failed to post element selector message', error);
    }
  };

  const overlay = document.createElement('div');
  overlay.id = '__inspector_selector_overlay';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.zIndex = '2147483646';
  overlay.style.cursor = 'crosshair';
  overlay.style.pointerEvents = 'auto';
  overlay.style.background = 'rgba(0,0,0,0)';
  document.body.appendChild(overlay);

  const highlight = document.createElement('div');
  highlight.id = '__inspector_selector_highlight';
  highlight.style.position = 'absolute';
  highlight.style.pointerEvents = 'none';
  highlight.style.boxSizing = 'border-box';
  highlight.style.border = '1px solid rgba(37, 99, 235, 0.9)';
  highlight.style.background = 'rgba(37, 99, 235, 0.2)';
  highlight.style.borderRadius = '2px';
  highlight.style.display = 'none';
  overlay.appendChild(highlight);

  const infoBox = document.createElement('div');
  infoBox.id = '__inspector_selector_info';
  infoBox.style.position = 'fixed';
  infoBox.style.pointerEvents = 'none';
  infoBox.style.zIndex = '2147483647';
  infoBox.style.background = 'rgba(17,24,39,0.92)';
  infoBox.style.color = '#f9fafb';
  infoBox.style.fontFamily = 'Menlo, Consolas, Monaco, monospace';
  infoBox.style.fontSize = '11px';
  infoBox.style.padding = '4px 8px';
  infoBox.style.borderRadius = '4px';
  infoBox.style.boxShadow = '0 8px 16px rgba(15, 23, 42, 0.35)';
  infoBox.style.display = 'none';
  document.body.appendChild(infoBox);

  const cleanup = () => {
    overlay.remove();
    infoBox.remove();
    window.__inspectorSelectorActive = false;
    window.removeEventListener('keydown', onKeyDown, true);
  };

  let latestInfo = null;

  const pickTarget = (x, y) => {
    const stack = document.elementsFromPoint(x, y) || [];
    for (const el of stack) {
      if (!el || el === overlay || el.id === '__inspector_selector_highlight') continue;
      return el;
    }
    return null;
  };

  const onMove = (event) => {
    const target = pickTarget(event.clientX, event.clientY);
    if (!target) {
      highlight.style.display = 'none';
      window.__inspectorSelectorPreview = null;
      latestInfo = null;
      infoBox.style.display = 'none';
      return;
    }

    const rect = target.getBoundingClientRect();
    highlight.style.left = rect.left + 'px';
    highlight.style.top = rect.top + 'px';
    highlight.style.width = rect.width + 'px';
    highlight.style.height = rect.height + 'px';
    highlight.style.display = 'block';

    const attributes = {};
    for (const attr of Array.from(target.attributes)) {
      attributes[attr.name] = attr.value;
    }

    latestInfo = {
      tagName: (target.tagName || '').toLowerCase(),
      id: target.id || undefined,
      className: target.className || undefined,
      textContent: (target.textContent || '').trim().slice(0, 160),
      attributes,
    };

    window.__inspectorSelectorPreview = latestInfo;

    const labelParts = [];
    if (latestInfo.tagName) labelParts.push(latestInfo.tagName);
    if (latestInfo.id) labelParts.push('#' + latestInfo.id);
    if (latestInfo.className) labelParts.push('.' + latestInfo.className.replace(/\s+/g, '.'));

    infoBox.textContent = labelParts.join('');
    infoBox.style.display = 'block';

    let infoLeft = event.clientX + 12;
    let infoTop = event.clientY + 12;
    const infoRect = infoBox.getBoundingClientRect();

    if (infoLeft + infoRect.width > window.innerWidth - 8) {
      infoLeft = Math.max(8, window.innerWidth - infoRect.width - 8);
    }
    if (infoTop + infoRect.height > window.innerHeight - 8) {
      infoTop = event.clientY - infoRect.height - 12;
    }

    infoBox.style.left = infoLeft + 'px';
    infoBox.style.top = infoTop + 'px';
  };

  const onClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (latestInfo) {
      postToHost('INSPECTOR_ELEMENT_SELECTED', latestInfo);
      // Legacy fallback for hosts that still poll
      try { window.__inspectorSelectorResult = latestInfo } catch {}
    }
    cleanup();
  };

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      postToHost('INSPECTOR_ELEMENT_SELECTOR_CANCELLED');
      try { window.__inspectorSelectorResult = null } catch {}
      cleanup();
    }
  };

  overlay.addEventListener('mousemove', onMove, true);
  overlay.addEventListener('click', onClick, true);
  window.addEventListener('keydown', onKeyDown, true);
})();

