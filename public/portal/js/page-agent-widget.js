// page-agent-widget.js — khởi tạo PageAgent (trợ lý AI điều khiển trang bằng ngôn ngữ tự nhiên)
// Yêu cầu: vendor/page-agent.js đã load trước (với ?autoInit=false).
// apiKey = JWT của user trong localStorage → proxy /llm xác thực rồi mới forward sang Gemini.
(function () {
  const token = localStorage.getItem('token');
  if (!token) return; // chưa đăng nhập thì không bật trợ lý

  function init() {
    if (!window.PageAgent) {
      console.warn('[page-agent] vendor script chưa load');
      return;
    }
    if (window.pageAgent) return; // tránh khởi tạo trùng

    window.pageAgent = new window.PageAgent({
      model: 'gemini-2.5-flash', // proxy sẽ ép model phía server
      baseURL: window.location.origin + '/llm/v1',
      apiKey: token,
      language: 'en-US',
    });
    window.pageAgent.panel.show();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
