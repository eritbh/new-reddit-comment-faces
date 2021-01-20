/**
 * Sends a message to the background page.
 * @param {action} action
 * @param {...any[]} data
 */
export async function send (action, ...data) {
	const result = await browser.runtime.sendMessage({action, data});
	if (result.error) {
		const error = new Error(result.message);
		error.name = result.name;
		error.data = result.data;
		throw error;
	} else {
		return result.data;
	}
}

/**
 * Enumeration of the actions recognized by the background page.
 * @enum
 */
export const action = Object.freeze({
	getSubredditStylesheet: 'getSubredditStylesheet',
});
