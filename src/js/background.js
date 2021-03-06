/**
 * background.js
 */
"use strict";
{
  /* api */
  const {
    browserAction, contextMenus, extension, i18n, runtime, storage, tabs,
  } = browser;

  /* constants */
  const COPY_ALL_TABS = "copyAllTabsURL";
  const COPY_LINK = "copyLinkURL";
  const COPY_PAGE = "copyPageURL";
  const COPY_TAB = "copyTabURL";
  const EXEC_COPY = "executeCopy";
  const EXEC_COPY_POPUP = "executeCopyPopup";
  const EXEC_COPY_TABS = "executeCopyAllTabs";
  const EXEC_COPY_TABS_POPUP = "executeCopyAllTabsPopup";
  const EXT_NAME = "extensionName";
  const ICON = "img/icon.svg";
  const ICON_BLACK = "buttonIconBlack";
  const ICON_COLOR = "buttonIconColor";
  const ICON_GRAY = "buttonIconGray";
  const ICON_WHITE = "buttonIconWhite";
  const KEY = "Alt+Shift+C";
  const PROMPT = "promptContent";

  const BBCODE = "BBCode";
  const BBCODE_TEXT = "BBCodeText";
  const BBCODE_URL = "BBCodeURL";
  const HTML = "HTML";
  const MARKDOWN = "Markdown";
  const TEXT = "Text";

  /* variables */
  const vars = {
    enabled: false,
    iconId: "#gray",
    promptContent: true,
  };

  /**
   * log error
   * @param {!Object} e - Error
   * @returns {boolean} - false
   */
  const logError = e => {
    console.error(e);
    return false;
  };

  /**
   * is string
   * @param {*} o - object to check
   * @returns {boolean} - result
   */
  const isString = o => typeof o === "string" || o instanceof String;

  /**
   * stringify positive integer
   * @param {number} i - integer
   * @param {boolean} zero - treat 0 as a positive integer
   * @returns {?string} - stringified integer
   */
  const stringifyPositiveInt = (i, zero = false) =>
    Number.isSafeInteger(i) && (zero && i >= 0 || i > 0) && `${i}` || null;

  /**
   * is tab
   * @param {*} tabId - tab ID
   * @returns {boolean} - result
   */
  const isTab = async tabId => {
    let tab;
    if (Number.isInteger(tabId) && tabId !== tabs.TAB_ID_NONE) {
      tab = await tabs.get(tabId).catch(logError);
    }
    return !!tab;
  };

  /**
   * get active tab
   * @returns {Object} - tabs.Tab
   */
  const getActiveTab = async () => {
    const arr = await tabs.query({active: true});
    let tab;
    if (arr.length) {
      [tab] = arr;
    }
    return tab || null;
  };

  /**
   * get all tabs info
   * @param {string} menuItemId - menu item ID
   * @returns {Array} - tabs info
   */
  const getAllTabsInfo = async menuItemId => {
    const tabsInfo = [];
    const arr = await tabs.query({currentWindow: true});
    arr.length && arr.forEach(tab => {
      const {id, title, url} = tab;
      tabsInfo.push({
        id, menuItemId, title, url,
        content: title,
      });
    });
    return tabsInfo;
  };

  /* enabled tabs collection */
  const enabledTabs = {};

  /* context menu items */
  const menuItems = {
    [COPY_PAGE]: {
      id: COPY_PAGE,
      contexts: ["all"],
      title: i18n.getMessage(COPY_PAGE),
      subItems: {
        [HTML]: {
          id: `${COPY_PAGE}${HTML}`,
          title: HTML,
        },
        [MARKDOWN]: {
          id: `${COPY_PAGE}${MARKDOWN}`,
          title: MARKDOWN,
        },
        [BBCODE_TEXT]: {
          id: `${COPY_PAGE}${BBCODE_TEXT}`,
          title: `${BBCODE} (${TEXT})`,
        },
        [BBCODE_URL]: {
          id: `${COPY_PAGE}${BBCODE_URL}`,
          title: `${BBCODE} (URL)`,
        },
        [TEXT]: {
          id: `${COPY_PAGE}${TEXT}`,
          title: TEXT,
        },
      },
    },
    [COPY_LINK]: {
      id: COPY_LINK,
      contexts: ["link"],
      title: i18n.getMessage(COPY_LINK),
      subItems: {
        [HTML]: {
          id: `${COPY_LINK}${HTML}`,
          title: HTML,
        },
        [MARKDOWN]: {
          id: `${COPY_LINK}${MARKDOWN}`,
          title: MARKDOWN,
        },
        [BBCODE_TEXT]: {
          id: `${COPY_LINK}${BBCODE_TEXT}`,
          title: `${BBCODE} (${TEXT})`,
        },
        [BBCODE_URL]: {
          id: `${COPY_LINK}${BBCODE_URL}`,
          title: `${BBCODE} (URL)`,
        },
        [TEXT]: {
          id: `${COPY_LINK}${TEXT}`,
          title: TEXT,
        },
      },
    },
    [COPY_TAB]: {
      id: COPY_TAB,
      contexts: ["tab"],
      title: i18n.getMessage(COPY_TAB),
      subItems: {
        [HTML]: {
          id: `${COPY_TAB}${HTML}`,
          title: HTML,
        },
        [MARKDOWN]: {
          id: `${COPY_TAB}${MARKDOWN}`,
          title: MARKDOWN,
        },
        [BBCODE_TEXT]: {
          id: `${COPY_TAB}${BBCODE_TEXT}`,
          title: `${BBCODE} (${TEXT})`,
        },
        [BBCODE_URL]: {
          id: `${COPY_TAB}${BBCODE_URL}`,
          title: `${BBCODE} (URL)`,
        },
        [TEXT]: {
          id: `${COPY_TAB}${TEXT}`,
          title: TEXT,
        },
      },
    },
    [COPY_ALL_TABS]: {
      id: COPY_ALL_TABS,
      contexts: ["tab"],
      title: i18n.getMessage(COPY_ALL_TABS),
      subItems: {
        [HTML]: {
          id: `${COPY_ALL_TABS}${HTML}`,
          title: HTML,
        },
        [MARKDOWN]: {
          id: `${COPY_ALL_TABS}${MARKDOWN}`,
          title: MARKDOWN,
        },
        [BBCODE_TEXT]: {
          id: `${COPY_ALL_TABS}${BBCODE_TEXT}`,
          title: `${BBCODE} (${TEXT})`,
        },
        [BBCODE_URL]: {
          id: `${COPY_ALL_TABS}${BBCODE_URL}`,
          title: `${BBCODE} (URL)`,
        },
        [TEXT]: {
          id: `${COPY_ALL_TABS}${TEXT}`,
          title: TEXT,
        },
      },
    },
  };

  /**
   * create context menu item
   * @param {string} id - menu item ID
   * @param {string} title - menu item title
   * @param {Object} data - context data
   * @returns {void}
   */
  const createMenuItem = async (id, title, data = {}) => {
    const {contexts, enabled, parentId} = data;
    if (isString(id) && isString(title) && Array.isArray(contexts)) {
      const opt = {
        id, contexts, title,
        enabled: !!enabled,
      };
      parentId && (opt.parentId = parentId);
      contextMenus.create(opt);
    }
  };

  /**
   * create context menu items
   * @returns {Promise.<Array>} - results of each handler
   */
  const createContextMenu = async () => {
    const func = [];
    const items = Object.keys(menuItems);
    for (const item of items) {
      const {contexts, id, subItems, title} = menuItems[item];
      const enabled = false;
      const itemData = {contexts, enabled};
      const subMenuItems = Object.keys(subItems);
      func.push(createMenuItem(id, title, itemData));
      for (const subItem of subMenuItems) {
        const {id: subItemId, title: subItemTitle} = subItems[subItem];
        const subItemData = {
          contexts, enabled,
          parentId: id,
        };
        func.push(createMenuItem(subItemId, subItemTitle, subItemData));
      }
    }
    return Promise.all(func);
  };

  /**
   * update context menu
   * @param {number} tabId - tab ID
   * @returns {Promise.<Array>} - results of each handler
   */
  const updateContextMenu = async tabId => {
    const enabled = Number.isInteger(tabId) &&
      enabledTabs[stringifyPositiveInt(tabId)] || false;
    const items = Object.keys(menuItems);
    const func = [];
    for (const item of items) {
      const {id, subItems} = menuItems[item];
      const subMenuItems = Object.keys(subItems);
      func.push(contextMenus.update(id, {enabled: !!enabled}));
      for (const subItem of subMenuItems) {
        const {id: subItemId} = subItems[subItem];
        func.push(contextMenus.update(subItemId, {enabled: !!enabled}));
      }
    }
    return Promise.all(func);
  };

  /**
   * set icon
   * @returns {Promise.<Array>} - results of each handler
   */
  const setIcon = async () => {
    const {enabled, iconId} = vars;
    const name = await i18n.getMessage(EXT_NAME);
    const icon = await extension.getURL(ICON);
    const path = enabled && `${icon}${iconId}` || `${icon}#off`;
    const title = `${name} (${KEY})`;
    return Promise.all([
      browserAction.setIcon({path}),
      browserAction.setTitle({title}),
    ]);
  };

  /**
   * toggle enabled
   * @param {boolean} enabled - enabled
   * @returns {void}
   */
  const toggleEnabled = async (enabled = false) => {
    enabled && (vars.enabled = !!enabled);
    if (!vars.enabled) {
      const items = Object.keys(enabledTabs);
      for (const item of items) {
        const obj = enabledTabs[item];
        obj && (vars.enabled = !!obj);
        if (vars.enabled) {
          break;
        }
      }
    }
  };

  /**
   * set enabled tab
   * @param {number} tabId - tab ID
   * @param {Object} tab - tabs.Tab
   * @param {Object} data - context info
   * @returns {Object} - tab ID info
   */
  const setEnabledTab = async (tabId, tab, data = {}) => {
    const {enabled} = data;
    const info = {tabId, enabled};
    if (tab || await isTab(tabId)) {
      const id = stringifyPositiveInt(tabId);
      id && (enabledTabs[id] = !!enabled);
      await toggleEnabled(!!enabled);
    }
    return info;
  };

  /**
   * remove enabled tab
   * @param {number} tabId - tab ID
   * @returns {Promise.<Array>} - results of each handler
   */
  const removeEnabledTab = async tabId => {
    const func = [];
    if ((tabId = stringifyPositiveInt(tabId)) && enabledTabs[tabId]) {
      const bool = delete enabledTabs[tabId];
      if (bool) {
        const tab = await getActiveTab();
        const {id} = tab;
        vars.enabled = false;
        await toggleEnabled();
        func.push(setIcon(), updateContextMenu(id));
      }
    }
    return Promise.all(func);
  };

  /* context info */
  const contextInfo = {
    isLink: false,
    content: null,
    title: null,
    url: null,
  };

  /**
   * init context info
   * @returns {Object} - context info
   */
  const initContextInfo = async () => {
    contextInfo.isLink = false;
    contextInfo.content = null;
    contextInfo.title = null;
    contextInfo.url = null;
    return contextInfo;
  };

  /**
   * update context info
   * @param {Object} data - context info data
   * @returns {Object} - context info
   */
  const updateContextInfo = async (data = {}) => {
    await initContextInfo();
    const {contextInfo: info} = data;
    const items = Object.keys(info);
    if (items && items.length) {
      for (const item of items) {
        const obj = info[item];
        contextInfo[item] = obj;
      }
    }
    return contextInfo;
  };

  /**
   * extract clicked data
   * @param {Object} data - clicked data
   * @returns {Promise.<Array>} - results of each handler
   */
  const extractClickedData = async (data = {}) => {
    const {info, tab} = data;
    const {id: tabId, title: tabTitle, url: tabUrl} = tab;
    const func = [];
    if (Number.isInteger(tabId) && tabId !== tabs.TAB_ID_NONE) {
      const {menuItemId, selectionText} = info;
      const {promptContent} = vars;
      const {
        content: contextContent, title: contextTitle, url: contextUrl,
      } = contextInfo;
      let allTabs, content, title, url;
      switch (menuItemId) {
        case `${COPY_LINK}${BBCODE_TEXT}`:
        case `${COPY_LINK}${HTML}`:
        case `${COPY_LINK}${MARKDOWN}`:
        case `${COPY_LINK}${TEXT}`:
          content = selectionText || contextContent || contextTitle;
          title = contextTitle;
          url = contextUrl;
          break;
        case `${COPY_PAGE}${BBCODE_TEXT}`:
        case `${COPY_PAGE}${HTML}`:
        case `${COPY_PAGE}${MARKDOWN}`:
        case `${COPY_PAGE}${TEXT}`:
        case `${COPY_TAB}${BBCODE_TEXT}`:
        case `${COPY_TAB}${HTML}`:
        case `${COPY_TAB}${MARKDOWN}`:
        case `${COPY_TAB}${TEXT}`:
          content = selectionText || tabTitle;
          title = tabTitle;
          url = tabUrl;
          break;
        case `${COPY_LINK}${BBCODE_URL}`:
          content = contextUrl;
          url = contextUrl;
          break;
        case `${COPY_PAGE}${BBCODE_URL}`:
        case `${COPY_TAB}${BBCODE_URL}`:
          content = tabUrl;
          url = tabUrl;
          break;
        case `${COPY_ALL_TABS}${BBCODE_TEXT}`:
        case `${COPY_ALL_TABS}${BBCODE_URL}`:
        case `${COPY_ALL_TABS}${HTML}`:
        case `${COPY_ALL_TABS}${MARKDOWN}`:
        case `${COPY_ALL_TABS}${TEXT}`:
          allTabs = await getAllTabsInfo(menuItemId);
          break;
        default:
      }
      if (allTabs) {
        func.push(tabs.sendMessage(tabId, {
          [EXEC_COPY_TABS]: {allTabs},
        }));
      } else {
        func.push(tabs.sendMessage(tabId, {
          [EXEC_COPY]: {
            content, menuItemId, title, url, promptContent,
          },
        }));
      }
      func.push(initContextInfo());
    }
    return Promise.all(func);
  };

  /**
   * handle active tab
   * @param {Object} info - active tab info
   * @returns {Promise.<Array>} - results of each handler
   */
  const handleActiveTab = async (info = {}) => {
    const {tabId} = info;
    const func = [];
    if (await isTab(tabId)) {
      const {enabled} = vars;
      enabled ?
        func.push(browserAction.enable(tabId)) :
        func.push(browserAction.disable(tabId));
      func.push(setIcon(), updateContextMenu(tabId));
    }
    return Promise.all(func);
  };

  /**
   * handle updated tab
   * @param {number} tabId - tab ID
   * @param {Object} tab - tab.Tab
   * @returns {?AsyncFunction} - handle active tab
   */
  const handleUpdatedTab = async (tabId, tab = {}) => {
    const {active} = tab;
    const func = active && handleActiveTab({tabId});
    return func || null;
  };

  /**
   * handle message
   * @param {*} msg - message
   * @param {Object} sender - sender
   * @returns {Promise.<Array>} - results of each handler
   */
  const handleMsg = async (msg, sender = {}) => {
    const func = [];
    const items = msg && Object.keys(msg);
    const tab = sender && sender.tab;
    const tabId = tab && tab.id;
    if (items && items.length) {
      for (const item of items) {
        const obj = msg[item];
        switch (item) {
          case EXEC_COPY:
            func.push(runtime.sendMessage({
              [EXEC_COPY_POPUP]: obj,
            }));
            break;
          case EXEC_COPY_TABS:
            func.push(runtime.sendMessage({
              [EXEC_COPY_TABS_POPUP]: obj,
            }));
            break;
          case "keydown":
          case "mousedown":
            func.push(updateContextInfo(obj));
            break;
          case "load":
            func.push(
              setEnabledTab(tabId, tab, obj).then(handleActiveTab),
              updateContextInfo(obj)
            );
            break;
          default:
        }
      }
    }
    return Promise.all(func);
  };

  /**
   * set variable
   * @param {string} item - item
   * @param {Object} obj - value object
   * @param {boolean} changed - changed
   * @returns {Promise.<Array>} - results of each handler
   */
  const setVar = async (item, obj, changed = false) => {
    const func = [];
    if (item && obj) {
      const {checked, value} = obj;
      switch (item) {
        case ICON_BLACK:
        case ICON_COLOR:
        case ICON_GRAY:
        case ICON_WHITE:
          if (obj.checked) {
            vars.iconId = value;
            changed && func.push(setIcon());
          }
          break;
        case PROMPT:
          vars[item] = !!checked;
          break;
        default:
      }
    }
    return Promise.all(func);
  };

  /**
   * set variables
   * @param {Object} data - storage data
   * @returns {Promise.<Array>} - results of each handler
   */
  const setVars = async (data = {}) => {
    const func = [];
    const items = Object.keys(data);
    if (items.length) {
      for (const item of items) {
        const obj = data[item];
        const {newValue} = obj;
        func.push(setVar(item, newValue || obj, !!newValue));
      }
    }
    return Promise.all(func);
  };

  /* listeners */
  storage.onChanged.addListener(data =>
    setVars(data).then(setIcon).catch(logError)
  );
  contextMenus.onClicked.addListener((info, tab) =>
    extractClickedData({info, tab}).catch(logError)
  );
  runtime.onMessage.addListener((msg, sender) =>
    handleMsg(msg, sender).catch(logError)
  );
  tabs.onActivated.addListener(info =>
    handleActiveTab(info).catch(logError)
  );
  tabs.onRemoved.addListener(tabId =>
    removeEnabledTab(tabId).catch(logError)
  );
  tabs.onUpdated.addListener((tabId, info, tab) =>
    handleUpdatedTab(tabId, tab).catch(logError)
  );

  /* startup */
  Promise.all([
    storage.local.get().then(setVars).then(setIcon),
    createContextMenu(),
  ]).catch(logError);
}
