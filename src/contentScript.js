import FrontendAPIClient from './FrontendAPIClient';
import {send, action} from './messaging';
import manifest from './manifest.json';

/**
 * Given a jsAPI element for a post or comment, grabs the wrapper for the thing
 * it represents.
 * @param {Element} element
 * @returns {Element | null}
 */
function findWrappingElement (element) {
	while (!element.id.startsWith('t1_') && !element.id.startsWith('t3_') && element.dataset.testid !== 'subreddit-sidebar') {
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
	// TODO: make generic for more subreddits

	const commentFaceSelector = [];
	if (['anime',
		'awwnime',
		'pantsu',
		'moescape',
		'twodeeart',
		'patchuu',
		'kemonomimi',
		'visualnovels',
		'supersonico',
		'kanmusu',
		'kanmusunights',
		'schoolidolfestival',
		'lovelive',
		'onetrueidol',
		'fatestaynight',
		'saber',
		'karanokyoukai',
		'nisekoi',
		'onetruebiribiri',
		'onetruetohsaka',
		'esdeath',
		'gamindustri',
		'kancolle',
		'leagueoflegends',
		'chibi'].includes(subreddit.toLowerCase())) {
		commentFaceSelector.push('a[href^="#"]');
	}
	if (['manga'].includes(subreddit.toLowerCase())) {
		commentFaceSelector.push('a[href^="//#"]');
	}
	if (['anime', 'madokamagica', 'animenocontext', 'k_on'].includes(subreddit.toLowerCase())) {
		commentFaceSelector.push('a[href="/s"]');
	}
	if (subreddit.toLowerCase() === 'madokamagica') {
		commentFaceSelector.push('a[href="/g"],a[href="/a"],a[href="/m"]');
	}
	if (subreddit.toLowerCase() === 'animesuggest') {
		commentFaceSelector.push('a[href="#s"]');
	}

	if (!commentFaceSelector.length) return;

	const commentFaces = wrapperEl.querySelectorAll(commentFaceSelector.join(','));

	if (!commentFaces.length) return;

	// Grab the stylesheet for this sub from the background page
	const stylesheetText = await send(action.getSubredditStylesheet, subreddit);

	for (const el of commentFaces) {
		// The old reddit stylesheet
		const styleEl = document.createElement('style');
		styleEl.innerText = stylesheetText;

		// We mock some of the markup that stylesheets on old Reddit expect
		const md = document.createElement('div');
		md.classList.add('md');
		const fakeBody = document.createElement('body');
		fakeBody.classList.add('md-container');

		// Avoid white background in Reddit dark mode
		fakeBody.style.backgroundColor = 'inherit';
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
	const commentEl = findWrappingElement(element);
	if (!commentEl) return;
	handleMarkup(commentEl, data.subreddit.name);
});
client.on('post', (element, data) => {
	// Don't try to process CSS stuff on link/media posts
	if (!data.media || data.media.type !== 'rtjson') return;
	const postEl = findWrappingElement(element);
	if (!postEl) return;
	handleMarkup(postEl, data.subreddit.name);
});

client.on('sidebar', (element, data) => {
	const sidebarEl = findWrappingElement(element);
	if (!sidebarEl) return;
	handleMarkup(sidebarEl, data.subreddit.name);
});

client.listen();
