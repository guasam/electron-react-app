import React from 'react'
 

export interface ElementIdentity {
  tagName: string
  id?: string
  className?: string
  textContent?: string
  attributes: Record<string, string>
}

interface ElementSelectorProps {
  webviewRef: React.RefObject<Electron.WebviewTag | null>
  enabled: boolean
  onSelected: (element: ElementIdentity) => void
  onRequestDisable: () => void
}

export function ElementSelector({ webviewRef, enabled, onSelected, onRequestDisable: _onRequestDisable }: ElementSelectorProps) {
  const pollingRef = React.useRef<number | null>(null)
  const injectedRef = React.useRef<boolean>(false)

  const injectSelector = React.useCallback(async () => {
    if (!webviewRef.current || injectedRef.current) return

    injectedRef.current = true

    await webviewRef.current.executeJavaScript(`
      (function() {
        if (window.__inspectorSelectorActive) return;
        window.__inspectorSelectorActive = true;

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
          if (latestInfo.className) labelParts.push('.' + latestInfo.className.replace(/\\s+/g, '.'));

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
            window.__inspectorSelectorResult = latestInfo;
          }
          cleanup();
        };

        const onKeyDown = (event) => {
          if (event.key === 'Escape') {
            window.__inspectorSelectorResult = null;
            cleanup();
          }
        };

        overlay.addEventListener('mousemove', onMove, true);
        overlay.addEventListener('click', onClick, true);
        window.addEventListener('keydown', onKeyDown, true);
      })();
    `).catch((error) => {
      console.error('Failed to inject selector', error)
      injectedRef.current = false
    })
  }, [webviewRef])

  const clearSelector = React.useCallback(async () => {
    if (!webviewRef.current) return

    injectedRef.current = false

    try {
      await webviewRef.current.executeJavaScript(`
        (function() {
          const overlay = document.getElementById('__inspector_selector_overlay');
          const info = document.getElementById('__inspector_selector_info');
          if (overlay) overlay.remove();
          if (info) info.remove();
          window.__inspectorSelectorActive = false;
        })();
      `)
    } catch (error) {
      console.error('Failed to clear selector overlay', error)
    }
  }, [webviewRef])

  React.useEffect(() => {
    if (!enabled) {
      if (injectedRef.current) {
        clearSelector()
      }
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current)
        pollingRef.current = null
      }
      return
    }

    // Only inject if we haven't already injected
    if (!injectedRef.current) {
      injectSelector().catch(console.error)
    }

    // Set up polling interval only once
    if (!pollingRef.current) {
      pollingRef.current = window.setInterval(async () => {
        if (!webviewRef.current) return
        try {
          const result = await webviewRef.current.executeJavaScript('window.__inspectorSelectorResult || null')
          if (result) {
            await webviewRef.current.executeJavaScript('window.__inspectorSelectorResult = null')
            injectedRef.current = false
            onSelected(result)
          }
        } catch (error) {
          console.error('Failed to retrieve selector result', error)
        }
      }, 120)
    }

    return () => {
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current)
        pollingRef.current = null
      }
      if (injectedRef.current) {
        clearSelector().catch(() => {})
      }
    }
  }, [enabled, injectSelector, clearSelector, onSelected, webviewRef])

  

  if (!enabled) return null

  return null
}

