(function () {
    'use strict';
    const scriptUrl = 'https://fastly.jsdelivr.net/gh/Sanjs333/sillytavern-scripts@main/ai-suggestion-helper.js';
    
    const cacheBuster = `?t=${Date.now()}`;
    
    import(scriptUrl + cacheBuster)
        .then(() => {
            console.log(`[AI指引助手 加载器] 最新版脚本 (t=${cacheBuster.substring(3)}) 加载成功！`);
        })
        .catch((error) => {
            console.error('[AI指引助手 加载器] 脚本加载失败:', error);
        });
        
})();
