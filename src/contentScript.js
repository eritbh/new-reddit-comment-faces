import FrontendAPIClient from './FrontendAPIClient';
import {send, action} from './messaging';
import manifest from './manifest.json';
import selectors from './subreddits/selectors';

/**
 * Given an element, gets the closest ancestor that matches the given selector.
 * @param {Element} element
 * @param {string} selector
 * @returns {Element | null}
 */
function findWrappingElement (element, selector) {
	while (!element.matches(selector)) {
		if (!element.parentElement) {
			return null;
		}
		element = element.parentElement;
	}
	return element;
}

/**
 * Renders the things.
 * @param {Element} wrapperEl
 * @param {string} subreddit
 */
async function handleMarkup (wrapperEl, subreddit) {
	const commentFaceSelectors = selectors[subreddit.toLowerCase()];
	if (!commentFaceSelectors || !commentFaceSelectors.length) return;

	const commentFaces = wrapperEl.querySelectorAll(commentFaceSelectors.join(','));
	if (!commentFaces.length) return;

	// Grab the stylesheet for this sub from the background page
	const stylesheetText = await send(action.getSubredditStylesheet, subreddit);

	for (const el of commentFaces) {
		// The old reddit stylesheet
		const styleEl = document.createElement('style');
		styleEl.innerText = stylesheetText;

		// Add some extra CSS to get rid of pseudo-elements we don't want to see
		// (they get used for page banners and stuff like that sometimes)
		styleEl.innerText += `
			html::before,
			html::after,
			body::before,
			body::after {
				display: none !important;
				content: none !important;
			}
		`;

		// We mock some of the markup that stylesheets on old Reddit expect
		const md = document.createElement('div');
		md.classList.add('md');
		const fakeBody = document.createElement('body');
		fakeBody.classList.add('md-container');

		// Avoid white background in Reddit dark mode
		fakeBody.style.background = 'inherit';

		// Avoid other layout styles that might be set via CSS but we don't want
		// TODO: if we ever move subreddit selectors to a JSON file, we should
		//       also handle these overrides on a subreddit-specific basis there
		fakeBody.style.border = '0';
		fakeBody.style.margin = '0';
		fakeBody.style.padding = '0';
		fakeBody.style.width = 'initial';
		fakeBody.style.minWidth = 'initial';
		fakeBody.style.height = 'initial';
		fakeBody.style.maxHeight = 'initial';
		fakeBody.append(md);

		// Clone the element we're rendering before adding it to the new tree
		md.append(el.cloneNode(true));

		// NOTE: To isolate from new Reddit styles, we use `all: initial` to
		//       reset inherited styles, and put the whole thing in a shadow DOM
		//       tree so new Reddit's selectors don't apply. We also use a
		//       <html> element as our inner wrapper for style compatibility,
		//       though it should be noted that this <html> is *not* :root, so
		//       subreddit styles that rely on :root will break.
		const innerWrapper = document.createElement('html');
		innerWrapper.style.all = 'initial';
		innerWrapper.append(styleEl, fakeBody);
		const outerWrapper = document.createElement('div');
		outerWrapper.attachShadow({mode: 'open'});
		outerWrapper.shadowRoot.append(innerWrapper);

		// Add the fake stuff to the page, then hide the original
		el.after(outerWrapper);
		el.setAttribute('style', 'display:none!important');
	}
}

const client = new FrontendAPIClient({name: manifest.name});

client.on('comment', (element, data) => {
	const commentEl = findWrappingElement(element, 'div[id^="t1"]');
	if (!commentEl) return;
	handleMarkup(commentEl, data.subreddit.name);
});
client.on('post', (element, data) => {
	// Don't try to process CSS stuff on link/media posts
	if (!data.media || data.media.type !== 'rtjson') return;
	const postEl = findWrappingElement(element, 'div[id^="t3"]');
	if (!postEl) return;
	handleMarkup(postEl, data.subreddit.name);
});

client.on('sidebar', (element, data) => {
	const sidebarEl = findWrappingElement(element, 'div[data-testid="subreddit-sidebar"]');
	if (!sidebarEl) return;
	handleMarkup(sidebarEl, data.subreddit.name);
});

client.listen();
