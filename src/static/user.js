/**
 * modified from:
 * author: https://github.com/Long0x0
 * source: https://github.com/microsoft/vscode/issues/75930#issuecomment-2310690013
 */

(function() {
  console.log("Hello from custom_context_menu.js~");
  const showGoTos = %showGoTos%;
  const showClipboardItems = %showClipboardItems%;

  const selectors = [
    /// original selectors
    /// '^"Go to"', // start with "Go to"
    /// '"Change All Occurrences"', // exact match
    /// '"Share"',
    /// '"Share" + "_"', // separator after "Share"
    /// '"_":has( + "Share")', // separator before "Share"
    /// '"Command Palette..."',
    /// '"_":has( + "Command Palette...")',
    /// '"Layout Controls"',

    '"Change All Occurrences"', // exact match

    '^"Find All"', '^"查找所有"',
    '^"Find All" + "_"', '^"查找所有" + "_"', // separator after "Share"
    '"_":has( + ^"Find All")', '"_":has( + ^"查找所有")', // separator before "Share"

    '"Share"', '"共享"',
    '"Share" + "_"', '"共享" + "_"', // separator after "Share"
    '"_":has( + "Share")', '"_":has( + "共享")', // separator before "Share"

    '"Command Palette..."', '"命令面板..."',
    '"_":has( + "Command Palette...")', '"_":has( + "命令面板...")',

    '"Layout Controls"',
    '^"Git"', '"_":has( + ^"Git")',
  ];
  if (showGoTos) {
    // start with "Go to"
    selectors.push('^"Go to"', '^"转到"')
  }
  if (showClipboardItems) {
    selectors.push(
      '"Cut"', '"Copy"', '"Paste"',
      '"剪切"', '"复制"', '"粘贴"',
    )
  }

  const css_selectors = selectors
    .join(",\n")
    .replaceAll(/([*^|])?"(.+?)"/g, '[aria-label\x241="\x242"]');
  console.log(css_selectors);

  function wait_for(root) {
    const selector = ".monaco-menu-container > .monaco-scrollable-element";
    new MutationObserver((mutations) => {
      for (let mutation of mutations) {
        for (let node of mutation.addedNodes) {
          if (node.matches?.(selector)) {
            console.log(">>", node);
            modify(node);
          }
        }
      }
    }).observe(root, { subtree: true, childList: true });
  }

  // context menu in editor
  Element.prototype._attachShadow = Element.prototype.attachShadow;
  Element.prototype.attachShadow = function () {
    const shadow = this._attachShadow({ mode: "open" });
    wait_for(shadow);
    return shadow;
  };
  // context menu in other places
  wait_for(document);

  // get mouse position
  let mouse_y = 0;
  document.addEventListener("mouseup", (e) => {
    // bug: not working in titlebar
    if (e.button === 2) {
      mouse_y = e.clientY;
    }
  });

  function modify(container) {
    if (container.matches('.titlebar-container *')) {
      // skip titlebar
      return;
    }
    for (let item of container.querySelectorAll(".action-item")) {
      const label = item.querySelector(".action-label");
      const aria_label = label?.getAttribute("aria-label") || "_";
      item.setAttribute("aria-label", aria_label);
    }

    const menu = container.parentNode;
    const style = document.createElement("style");
    menu.appendChild(style);
    style.innerText = `
      :host > .monaco-menu-container, :not(.menubar-menu-button) > .monaco-menu-container {
        ${css_selectors},
        .visible.scrollbar.vertical, .shadow {
          display: none !important;
        }
      }
      `.replaceAll(/\s+/g, " ");

    // fix context menu position
    if (menu.matches(".monaco-submenu")) {
      return;
    }
    let menu_top = parseInt(menu.style.top);
    const menu_height = menu.clientHeight;
    // console.log("menu_top", menu_top, "menu_height", menu_height);
    const titlebar_height = 40;
    const window_height = window.innerHeight;
    if (menu_top < titlebar_height && menu_height < 90) {
      mouse_y = menu_top;
    } else {
      if (mouse_y < window_height / 2) {
        menu_top = mouse_y;
        if (menu_top + menu_height > window_height) {
          menu_top = window_height - menu_height;
        }
      } else {
        menu_top = mouse_y - menu_height;
        if (menu_top < titlebar_height) {
          menu_top = titlebar_height;
        }
      }
      menu.style.top = menu_top + "px";
    }
  }
})();
