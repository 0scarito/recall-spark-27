// Content script for generic web pages - extracts article content
(function() {
  'use strict';

  // Extract main content from the page
  function extractPageContent() {
    // Try common article selectors
    const selectors = [
      'article',
      '[role="main"]',
      'main',
      '.post-content',
      '.article-content',
      '.entry-content',
      '.content',
      '#content'
    ];

    let mainContent = null;
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim().length > 200) {
        mainContent = element;
        break;
      }
    }

    // Fallback to body
    if (!mainContent) {
      mainContent = document.body;
    }

    // Clone and clean up
    const clone = mainContent.cloneNode(true);
    
    // Remove unwanted elements
    const unwantedSelectors = [
      'script', 'style', 'nav', 'header', 'footer', 'aside',
      '.sidebar', '.comments', '.advertisement', '.ad', '.social-share',
      '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]'
    ];
    
    unwantedSelectors.forEach(selector => {
      clone.querySelectorAll(selector).forEach(el => el.remove());
    });

    return clone.textContent.replace(/\s+/g, ' ').trim();
  }

  // Get page metadata
  function getPageMetadata() {
    const getMeta = (name) => {
      return document.querySelector(`meta[name="${name}"]`)?.content
          || document.querySelector(`meta[property="${name}"]`)?.content
          || document.querySelector(`meta[property="og:${name}"]`)?.content;
    };

    return {
      url: window.location.href,
      title: document.title || getMeta('title'),
      description: getMeta('description'),
      image: getMeta('image') || document.querySelector('meta[property="og:image"]')?.content,
      siteName: getMeta('site_name') || window.location.hostname,
      author: getMeta('author'),
      publishedTime: getMeta('article:published_time'),
      favicon: document.querySelector('link[rel="icon"]')?.href 
            || document.querySelector('link[rel="shortcut icon"]')?.href
    };
  }

  // Extract all page data
  function extractPageData() {
    const metadata = getPageMetadata();
    const content = extractPageContent();

    return {
      url: window.location.href,
      metadata,
      content: content.substring(0, 50000), // Limit content size
      contentLength: content.length,
      extractedAt: new Date().toISOString()
    };
  }

  // Listen for messages
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractPageData') {
      try {
        const data = extractPageData();
        sendResponse(data);
      } catch (error) {
        sendResponse({ error: error.message });
      }
      return true;
    }

    if (request.action === 'ping') {
      sendResponse({ status: 'ok', isYouTube: false });
      return true;
    }
  });

  console.log('[Recap Extension] Generic content script loaded');
})();
