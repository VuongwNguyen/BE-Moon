// Fix all relative links to use current protocol
(function() {
  const fixLinks = () => {
    document.querySelectorAll('a[href^="/"]').forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('/') && !href.startsWith('//')) {
        const fullUrl = window.location.protocol + '//' + window.location.host + href;
        link.setAttribute('href', fullUrl);
      }
    });
  };
  
  // Fix on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixLinks);
  } else {
    fixLinks();
  }
  
  // Fix dynamically added links
  const observer = new MutationObserver(fixLinks);
  observer.observe(document.body, { childList: true, subtree: true });
})();
