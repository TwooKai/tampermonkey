// ==UserScript==
// @name         FA Linker
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Automatically adds previous/next links to FA submissions
// @author       Hsd
// @match        https://www.furaffinity.net/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_notification
// ==/UserScript==

(() => {
  // src/linker/_common.js
  function processLinks(cfg) {
    GM_addStyle(`#${cfg.idPrefix}-status {
			position: fixed;
			bottom: 10px;
			right: 10px;
			padding: 8px 16px;
			border-radius: 4px;
			background-color: rgba(240, 240, 240, 0.9);
			color: #000;
			border: 1px solid #ddd;
			font-family: Arial, sans-serif;
			font-size: 14px;
			z-index: 9999;
			box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
			transition: all 0.3s ease;
			cursor: pointer;
			&:hover {
				background-color: #f0f0f0;
			}
			&.processing {
				background-color: rgba(220, 240, 255, 0.9);
				border-color: #0066cc;
			}
			&.error {
				background-color: rgba(255, 220, 220, 0.9);
				border-color: #cc0000;
			}
			&.success {
				background-color: rgba(220, 255, 220, 0.9);
				border-color: #00cc00;
			}
		}
		
		#${cfg.idPrefix}-modal {
			position: fixed;
			display: flex;
			justify-content: center;
			align-items: center;
			z-index: 10000;
			top: 0;
			left: 0;
			width: 100%;
			height: 100vh;
			background-color: rgba(0,0,0,0.5);
			&>div {
				width: 700px;
				background: #353b45;
				position: relative;
				padding: 20px;
				border-radius: 8px;
				box-shadow: 0 4px 20px rgba(0,0,0,0.15);
				display: flex;
				flex-direction: column;
				gap:5px;
				textarea {
					width: 100%;
				}
				.close {
					position: absolute;
					top: -20px;
					right: -20px;
					cursor: pointer;

				}
			}
		}
	`);
    function createUI(remake = false, status2, config) {
      const existingElement = document.getElementById(`${cfg.idPrefix}-status`);
      if (existingElement) {
        if (remake) existingElement.remove();
        else return existingElement;
      }
      const statusElement = document.createElement("div");
      statusElement.id = `${cfg.idPrefix}-status`;
      statusElement.classList.add(status2);
      switch (status2) {
        default:
          statusElement.textContent = "Ready";
          statusElement.addEventListener("click", openModal);
          break;
        case "processing":
          if (config) {
            statusElement.textContent = `${config.index || 0 + 1} / ${config.list.length}`;
          } else {
            statusElement.textContent = "processing...";
          }
          statusElement.addEventListener("click", () => {
            if (!confirm("Stop processing?")) return;
            endProcess("ready");
          });
          break;
        case "success":
          statusElement.textContent = "Done";
          statusElement.addEventListener("click", () => createUI(true, "ready", null));
          break;
      }
      document.body.appendChild(statusElement);
      return statusElement;
    }
    function init() {
      const status2 = GM_getValue("status", "ready");
      const config = GM_getValue("config", null);
      createUI(true, status2, config);
      if (status2 === "processing") process(config);
    }
    window.addEventListener("load", () => setTimeout(init, 500), false);
    function openModal() {
      const existingElement = document.getElementById(`${cfg.idPrefix}-modal`);
      if (existingElement) existingElement.remove();
      const modalWrap = document.createElement("div");
      modalWrap.id = `${cfg.idPrefix}-modal`;
      document.body.appendChild(modalWrap);
      modalWrap.innerHTML = `<div>
				<span class="close">x</span>
				<label><input type="checkbox" name="reverse"> reverse order</label><br>
				<textarea rows="8" placeholder="Ensure you are logged in,
Paste submission urls - one per line"></textarea>
				<button>Process submissions</button>
			</div>`;
      modalWrap.addEventListener("click", (e) => {
        if (e.target === modalWrap) return modalWrap.remove();
        if (e.target.classList.contains("close")) return modalWrap.remove();
        if (e.target.nodeName === "BUTTON")
          startProcess(
            modalWrap.querySelector("textarea").value,
            {
              reverse: modalWrap.querySelector("[name=reverse]").checked
            }
          );
      });
      return modalWrap;
    }
    async function startProcess(text, options) {
      const list = cfg.parseItemsList(text);
      if (options.reverse) list.reverse();
      if (list.length === 0) {
        alert("can't find ids in links");
        return false;
      }
      const config = { list, index: 0 };
      await GM_setValue("status", "processing");
      await GM_setValue("config", config);
      process(config);
    }
    async function process(config) {
      const processing = config.list[config.index];
      if (!processing) {
        await endProcess();
        return;
      }
      const url = cfg.getItemUrl(processing);
      if (document.location.href !== url) {
        document.location.href = url;
        return;
      }
      try {
        const changed = await cfg.performItemEdit(
          config.list,
          config.index
        ).catch((e) => {
          console.log(e);
          return false;
        });
        config.index++;
        GM_setValue("status", "processing");
        GM_setValue("config", config);
        if (changed) {
          await cfg.submitChanges();
        } else {
          process(config);
        }
      } catch (e) {
        console.log(e);
        await GM_setValue("status", "error");
        await GM_setValue("config", null);
        await createUI(true, status, null);
      }
    }
    async function endProcess(status2 = "success") {
      await GM_setValue("status", "ready");
      await GM_setValue("config", null);
      await createUI(true, status2, null);
    }
  }
  async function elementLoaded(selector) {
    const find = () => document.querySelector(selector);
    const node = find();
    if (node) return node;
    return new Promise((resolve, reject) => {
      let timeout = null;
      const interval = setInterval(() => {
        const node2 = find();
        if (node2) {
          clearInterval(interval);
          if (timeout) clearTimeout(timeout);
          resolve(node2);
        }
      }, 100);
      timeout = setTimeout(() => {
        clearInterval(interval);
        clearTimeout(timeout);
        reject("timeout");
      }, 2e3);
    });
  }

  // src/linker/fa.js
  (function() {
    "use strict";
    processLinks({
      idPrefix: "yeen-fa-linker",
      parseItemsList: (text) => text.trim().split("\n").map((v) => v.trim()).filter(Boolean).filter((str) => str.toLowerCase().includes("furaffinity.net")).map((link) => {
        const parts = link.split("?").shift().split("#").shift().split("/");
        let p = parts.pop();
        if (!p || isNaN(p)) p = parts.pop();
        return parseInt(p);
      }).filter(Boolean),
      getItemUrl: (id) => `https://www.furaffinity.net/controls/submissions/changeinfo/${id}/`,
      performItemEdit: async (list, index) => {
        const nav = [
          index === 0 ? "-" : list[index - 1],
          list[0],
          index === list.length - 1 ? "-" : list[index + 1]
        ];
        const textarea = await elementLoaded("#JSMessage");
        if (!textarea) return false;
        let text = textarea.value;
        text = text.replace(/\[(?:\d+|-)\,(?:\d+|-)\,(?:\d+|-)\]/, "");
        text = `${text.trim()}

[${nav.join(",")}]`;
        const newNav = list.map((id, i) => `[url=/view/${id}/]page ${i + 1}[/url]${i === index ? " - this" : ""}`).join("\n");
        text = text.replace(/==nav==.*==\/nav==/su, "");
        text = `${text.trim()}

==nav==
${newNav}
==/nav==`;
        if (textarea.value !== text) {
          textarea.value = text;
          return true;
        }
        return false;
      },
      // click "finalize"
      submitChanges: async () => (await elementLoaded("#btn-update")).click()
    });
  })();
})();
