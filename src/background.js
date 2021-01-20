import {action} from './messaging';

const messageHandlers = new Map();

browser.runtime.onMessage.addListener(async message => {
	const handler = messageHandlers.get(message.action);
	if (!handler) return;

	try {
		const result = await handler(message.data);
		return {
			error: false,
			data: result,
		};
	} catch (error) {
		return {
			error: true,
			name: error.name,
			message: error.message,
			data: error.data,
		};
	}
});

const stylesheets = new Map();

messageHandlers.set(action.getSubredditStylesheet, async subreddit => {
	// Used the cached content, if we have it
	let styleText = stylesheets.get(subreddit);
	if (styleText != null) {
		return styleText;
	}

	// Fetch the old Reddit page for this subreddit
	const oldRedditPageText = await fetch(`https://old.reddit.com/r/${subreddit}`).then(response => response.text());
	// Parse the document
	const parser = new DOMParser();
	const oldRedditDoc = parser.parseFromString(oldRedditPageText, 'text/html');
	// Get the stylesheets
	const links = oldRedditDoc.querySelectorAll('link[rel="stylesheet"]');
	// The stylesheet text just imports all those stylesheets
	// NOTE: Reddit specifies most of its stylesheets as //... rather than
	//       https://..., meaning that the protocol used to load them is the
	//       same as the protocol of the current page. On a background page,
	//       that protocol is not http(s), but the browser's extension page
	//       protocol (moz-extension:, chrome-extension:, etc). If we just used
	//       link.href here, it would fill in the protocol with the protocol of
	//       the current page (i.e. the background page) resulting in links that
	//       don't point anywhere. Instead, we read the `href` attribute, which
	//       returns the string you see in HTML, which can be passed back to the
	//       content script and interpreted in the correct context.
	styleText = [...links].map(link => `@import "${link.getAttribute('href').replace(/"/g, '\\"')}";`).join('');

	// Set cache and return
	stylesheets.set(subreddit, styleText);
	return styleText;
});
