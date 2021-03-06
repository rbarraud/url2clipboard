/**
 * content.js
 */
"use strict";
{
  /* api */
  const {runtime} = browser;

  /* constants */
  const CONTEXT_INFO = "contextInfo";
  const CONTEXT_INFO_GET = "getContextInfo";
  const MOUSE_BUTTON_RIGHT = 2;
  const NS_HTML = "http://www.w3.org/1999/xhtml";

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
   * send message
   * @param {*} msg - message
   * @returns {?AsyncFunction} - send message to runtime
   */
  const sendMsg = async msg => {
    const func = msg && runtime.sendMessage(msg);
    return func || null;
  };

  /**
   * get anchor element
   * @param {Object} node - element
   * @returns {Object} - anchor element
   */
  const getAnchorElm = async node => {
    const root = document.documentElement;
    let elm;
    if (root) {
      while (node && node.parentNode && node.parentNode !== root) {
        if (node.localName === "a") {
          elm = node;
          break;
        }
        node = node.parentNode;
      }
    }
    return elm || null;
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
   * create context info
   * @param {Object} node - element
   * @returns {Object} - context info
   */
  const createContextInfo = async node => {
    await initContextInfo();
    if (node.nodeType === Node.ELEMENT_NODE) {
      const anchor = await getAnchorElm(node);
      if (anchor) {
        const {textContent, href, title} = anchor;
        if (href) {
          const content = textContent.replace(/\s+/g, " ").trim();
          const url = href instanceof SVGAnimatedString && href.baseVal || href;
          contextInfo.isLink = true;
          contextInfo.content = content;
          contextInfo.title = title || content;
          contextInfo.url = url;
        }
      }
    }
    return contextInfo;
  };

  /**
   * send status
   * @param {!Object} evt - Event
   * @returns {AsyncFunction} - send message
   */
  const sendStatus = async evt => {
    const {target, type} = evt;
    const enabled = document.documentElement.namespaceURI === NS_HTML;
    const info = await createContextInfo(target);
    const msg = {
      [type]: {
        enabled,
        contextInfo: info,
      },
    };
    return sendMsg(msg);
  };

  /**
   * handle message
   * @param {*} msg - message
   * @returns {Promise.<Array>} - results of each handler
   */
  const handleMsg = async (msg = {}) => {
    const items = msg && Object.keys(msg);
    const func = [];
    if (items && items.length) {
      for (const item of items) {
        switch (item) {
          case CONTEXT_INFO_GET:
            func.push(sendMsg({
              [CONTEXT_INFO]: {
                contextInfo,
              },
            }));
            break;
          default:
        }
      }
    }
    return Promise.all(func);
  };

  /* listeners */
  runtime.onMessage.addListener(msg => handleMsg(msg).catch(logError));

  window.addEventListener(
    "load",
    evt => sendStatus(evt).catch(logError),
    false
  );
  window.addEventListener(
    "keydown",
    evt => (evt.altKey && evt.shiftKey && evt.key === "C" ||
            evt.shiftKey && evt.key === "F10" ||
            evt.key === "ContextMenu") && sendStatus(evt).catch(logError),
    true
  );
  window.addEventListener(
    "mousedown",
    evt => evt.button === MOUSE_BUTTON_RIGHT && sendStatus(evt).catch(logError),
    true
  );
}
