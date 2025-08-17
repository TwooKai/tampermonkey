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

import processLinks, {elementLoaded, bwait} from './_common';

(function() {
	'use strict';
	processLinks({
		idPrefix: 'yeen-fa-linker',
		parseItemsList: text => text.trim().split("\n")
			.map(v => v.trim())
			.filter(Boolean)
			.filter(str => str.toLowerCase().includes('furaffinity.net'))
			.map(link => {
				const parts = link.split('?').shift().split('#').shift().split('/');
				let p = parts.pop();
				if(!p || isNaN(p)) p = parts.pop();
				return parseInt(p);
			})
			.filter(Boolean),
		getItemUrl: id => `https://www.furaffinity.net/controls/submissions/changeinfo/${id}/`,
		performItemEdit: async (list, index) => {
			const nav = [
				index === 0 ? '-' : list[index-1],
				list[0],
				(index === list.length - 1) ? '-' : list[index+1],
			];
			const textarea = await elementLoaded('#JSMessage');
			if(!textarea) return false;
			
			let text = textarea.value;
			text = text.replace(/\[(?:\d+|-)\,(?:\d+|-)\,(?:\d+|-)\]/, ''); // remove old small nav
			text = `${text.trim()}\n\n[${nav.join(',')}]`;
			
			const newNav = list.map((id, i) => `[url=/view/${id}/]page ${i+1}[/url]${i === index ? ' - this' : ''}`).join("\n")
			text = text.replace(/==nav==.*==\/nav==/su, ''); // remove old big nav
			text = `${text.trim()}\n\n==nav==\n${newNav}\n==/nav==`;
			
			if(textarea.value !== text)
			{
				textarea.value = text;
				return true;
			}
			return false;
		},
		// click "finalize"
		submitChanges: async () => (await elementLoaded('#btn-update')).click(),
	});
	
})();