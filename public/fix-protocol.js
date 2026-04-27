// Fix all relative links to use current protocol
document.querySelectorAll('a[href^="/"]').forEach(link => {
  const href = link.getAttribute('href');
  if (href && href.startsWith('/') && !href.startsWith('//')) {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = window.location.protocol + '//' + window.location.host + href;
    });
  }
});
