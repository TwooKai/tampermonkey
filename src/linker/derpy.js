// ==UserScript==
// @name         Derpy Linker
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Automatically adds previous/next links to derpy submissions
// @author       Hsd
// @match        https://derpibooru.org/*
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
		idPrefix: 'yeen-derp-linker',
		// get ids from user input
		parseItemsList: text => text.trim().split("\n")
			.map(v => v.trim())
			.filter(Boolean)
			.filter(str => str.toLowerCase().includes('derpibooru.org'))
			.map(link => {
				const match = link.match(/derpibooru\.org\/images\/(\d+)/)
				if(!match) return false;
				return parseInt(match[1]);
			})
			.filter(Boolean),
		getItemUrl: id => `https://derpibooru.org/images/${id}`,
		performItemEdit: async (list, index) => {
			const btn = await elementLoaded('#edit-description');
			if(!btn) return false;
			btn.click();
			const textarea = await elementLoaded('#description');
			if(!textarea) return false;
			let text = textarea.value;
			const newNav = list.map((id, i) => `>>${id}${i === index ? ' - this' : ''}`).join("\n")
			text = text.replace(/==nav==.*==\/nav==/su, ''); // remove old nav
			text = `${text.trim()}\n\n==nav==\n${newNav}\n==/nav==`;
			if(textarea.value !== text)
			{
				textarea.value = text;
				return true;
			}
			return false;
		},
		submitChanges: async () => {
			(await elementLoaded('#description-form [type=submit]')).click();
			await bwait(100);
			document.location.reload();
		},
	});
	
})();