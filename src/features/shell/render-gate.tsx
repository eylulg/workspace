const GATE_ID = "page-rendered";

/**
 * Holds the first paint until the page content is in the document. Without it the shell paints on its own first and
 * the content a moment later, and Lighthouse then counts the app's scripts towards Largest Contentful Paint.
 * Browsers without support ignore the link.
 */
export const RenderGateLink = () => <link rel="expect" href={`#${GATE_ID}`} {...{ blocking: "render" }} />;

/** Goes at the end of a page's content. Pages without one are not held for more than the load of the document. */
export const RenderGate = () => <div id={GATE_ID} />;
