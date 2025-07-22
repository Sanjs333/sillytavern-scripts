(function () {
    'use-strict';
    const SETTINGS_KEY = 'AI指引助手8.2变量';
    const SUGGESTION_CONTAINER_ID = 'ai-reply-suggestion-container';
    const SUGGESTION_MODAL_ID = 'ai-reply-suggestion-modal';
    const LOG_PREFIX = '[回复建议插件 v8.2]';
    // 版本更新：直接在prompt中使用SillyTavern原生宏 {{persona}}
    const DEFAULT_PROMPTS = [
        {
            name: '策略型 (默认)',
            content: `
# 任务
根据最新的对话上下文，为用户生成三条富有创意、推动剧情发展的回复建议。

# 核心指令

## 1. 情境分析
- 深入理解[AI的回复]、[用户的回复]以及[用户人设]中的：
  - 当前场景氛围
  - 角色关系动态
  - 潜在的剧情走向和转折点
  - 用户角色的性格特征和说话习惯

## 2. 建议生成策略
生成三条不同类型的建议，每条都应该：
- **有画面感**：能让人想象出具体场景
- **有情绪张力**：体现角色的内心状态
- **有推进作用**：不是简单应付，而是创造新的可能

### 三种建议类型：
**[动作型]**：具体的行为描写+简短对话
- 包含肢体动作、表情变化或环境互动
- 示例：*向后退了一步*"你确定要这么做？"

**[情感型]**：内心活动+情绪化表达
- 展现角色的真实感受、矛盾或冲动
- 示例：*心跳漏了一拍*"别...别突然这样..."

**[策略型]**：试探、引导或改变局面
- 通过言语技巧达到某种目的
- 示例：*挑眉一笑*"那你敢打个赌吗？"

## 3. 风格要求
- **长度**：每条建议30-50字（可包含动作描写）
- **语言**：使用第一人称，完全模仿用户的说话风格
  - 如果用户偏口语化→保持口语化
  - 如果用户喜欢省略号→适当使用
  - 如果用户语气强硬→保持相应力度
- **多样性**：三条建议的情绪基调应有所区别
- **避免总结或升华**： 三条建议应该在推动剧情上有所帮助，而非总结或升华

# 输出格式
你必须只响应一个不换行的单行文本。每条建议都必须用【】符号包裹。不要包含任何序号、JSON或其他多余字符。

# 正确输出示例
【[动作型]内容】【[情感型]内容】【[策略型]内容】

# 特别提醒
- 不要生成过于安全、中庸的建议
- 要有"意外感"，给剧情创造转折的可能
- 可以适当"搞事"，让互动更有趣

# 对话上下文
[用户人设]:
{{persona}}

[用户的回复]：
{{user_last_reply}}

[AI的回复]：
{{ai_last_reply}}

# 开始生成建议：
`.trim(),
        },
        {
            name: '电影感长回复',
            content: `
# 任务
你的任务是根据最新的对话上下文，为“用户”生成三条生动、富有描述性、且符合其角色风格的回复建议。你要帮助用户更好地推动剧情和塑造角色。

# 核心指令
1.  深入分析下方提供的[AI的回复]、[用户的回复]以及[用户人设]，理解当前的情境、气氛以及用户的角色性格和说话风格。
2.  从以下三个不同角度生成建议，每个建议都应包含动作、对话、心理活动或环境描写中的至少一种元素：
    -   **一条行动建议**：描述角色接下来可以做的具体动作，这个动作应该能直接推动剧情发展。
    -   **一条对话建议**：提出一个问题或说一句话，用来探索更多信息、表达关心、进行试探或展现角色的态度。
    -   **一条反应/内心戏建议**：描述角色的情绪变化、内心想法或对当前状况的感受。这能极大地丰富角色的立体感。
3.  严格遵守以下要求：
    -   放开字数限制：每条建议应有足够的长度（建议在30-80字之间），以确保内容的丰富性和沉浸感。
    -   模仿并深化：使用第一人称回复时，不仅要模仿[用户的回复]中的语气和风格，还要在此基础上进行深化，让角色的形象更加鲜明。
    -   展现而非告知 (Show, don't tell)：尽量用具体的行为和感受来代替简单的形容词。

# 输出格式
你必须只响应一个不换行的单行文本。每条建议都必须用【】符号包裹。不要包含任何序号、JSON或其他多余字符。

# 对话上下文
[用户人设]:
{{persona}}

[用户的回复]：
{{user_last_reply}}

[AI的回复]：
{{ai_last_reply}}

# 开始生成建议：
`.trim(),
        },
    ];
    let settings = {
        apiProvider: 'openai_compatible',
        apiKey: '',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
        activePromptIndex: 0,
        characterBindings: {},
        prompts: JSON.parse(JSON.stringify(DEFAULT_PROMPTS))
    };
    const SCRIPT_VERSION = '8.2.0';
    const BUTTON_ID = 'suggestion-generator-ext-button';
    const PANEL_ID = 'suggestion-generator-settings-panel';
    const OVERLAY_ID = 'suggestion-generator-settings-overlay';
    const STYLE_ID = 'suggestion-generator-styles';
    const LOG_PANEL_ID = 'suggestion-generator-log-panel';
    const parentDoc = window.parent.document;
    const parent$ = window.parent.jQuery || window.parent.$;

    function logMessage(message, type = 'info') { const logPanel = parent$(`#${LOG_PANEL_ID}`); const now = new Date(); const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`; const logEntry = parent$(`<div class="log-entry log-${type}"><span class="log-timestamp">[${timestamp}]</span> <span class="log-message">${message}</span></div>`); if (logPanel.length > 0) { logPanel.prepend(logEntry); } const consoleMessage = message.replace(/<[^>]*>/g, ''); switch (type) { case 'error': console.error(`${LOG_PREFIX} ${consoleMessage}`); break; case 'warn': console.warn(`${LOG_PREFIX} ${consoleMessage}`); break; case 'success': console.log(`${LOG_PREFIX} %c${consoleMessage}`, 'color: #28a745;'); break; default: console.log(`${LOG_PREFIX} ${consoleMessage}`); } }
    async function loadSettings() { if (typeof TavernHelper === 'undefined' || !TavernHelper.getVariables) { settings.prompts = JSON.parse(JSON.stringify(DEFAULT_PROMPTS)); return; } try { const globalVars = await TavernHelper.getVariables({ type: 'global' }) || {}; const existingSettings = globalVars[SETTINGS_KEY]; if (existingSettings && typeof existingSettings === 'object') { settings = { ...settings, ...existingSettings, prompts: (existingSettings.prompts && existingSettings.prompts.length > 0) ? existingSettings.prompts : JSON.parse(JSON.stringify(DEFAULT_PROMPTS)), characterBindings: existingSettings.characterBindings || {} }; } else { await saveSettings(); } } catch (error) { logMessage(`加载设置时发生错误: ${error.message}`, 'error'); settings.prompts = JSON.parse(JSON.stringify(DEFAULT_PROMPTS)); } }
    async function saveSettings() { if (typeof TavernHelper === 'undefined' || typeof TavernHelper.updateVariablesWith !== 'function') { return; } try { await TavernHelper.updateVariablesWith(variables => { variables[SETTINGS_KEY] = settings; return variables; }, { type: 'global' }); } catch (error) { logMessage(`保存设置时出错: ${error.message}`, 'error'); } }
    function extractTextFromMessage(messageObj) { if (!messageObj || !messageObj.message) return ''; return parent$('<div>').html(messageObj.message.replace(/<br\s*\/?>/gi, '\n')).text().trim(); }
    async function callOpenAICompatibleAPI(promptText) { logMessage(`<b>[API 调用]</b> 正在使用 OpenAI 兼容模式...`); const body = { model: settings.model, messages: [{ role: 'user', content: promptText }], temperature: 0.8 }; const response = await fetch(`${settings.baseUrl}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.apiKey}` }, body: JSON.stringify(body) }); if (!response.ok) { const errorData = await response.json().catch(() => ({ error: { message: response.statusText } })); throw new Error(errorData.error.message); } const data = await response.json(); return data.choices[0].message.content; }
    async function callGoogleGeminiAPI(promptText) { logMessage(`<b>[API 调用]</b> 正在使用 Google AI (Gemini) 直连模式...`); const url = `https://generativelanguage.googleapis.com/v1beta/models/${settings.model}:generateContent?key=${settings.apiKey}`; const body = { contents: [{ parts: [{ text: promptText }] }], generationConfig: { temperature: 0.8, maxOutputTokens: 8192, }, }; const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const data = await response.json(); if (!response.ok) { const errorDetails = data.error ? data.error.message : await response.text(); throw new Error(errorDetails); } if (!data.candidates || data.candidates.length === 0) { const blockReason = data.promptFeedback ? data.promptFeedback.blockReason : '未知原因'; throw new Error(`请求被 Google 安全设置拦截。原因: ${blockReason}`); } return data.candidates[0].content.parts[0].text; }
    
    async function callSuggestionAI(aiReply, userReply) {
        cleanupSuggestions();
        const activePrompt = settings.prompts[settings.activePromptIndex];
        if (!activePrompt) {
            logMessage('<b>[API调用]</b> 没有可用的活动提示词。', 'error');
            return null;
        }

        let promptTemplate = activePrompt.content
            .replace('{{ai_last_reply}}', aiReply)
            .replace('{{user_last_reply}}', userReply);

        const finalPromptText = await SillyTavern.substituteParams(promptTemplate);
        
        const sanitizedPrompt = parent$('<div>').text(finalPromptText).html();
        logMessage(`<b>[最终提示词]</b> <pre class="final-prompt">${sanitizedPrompt}</pre>`, 'info');
        
        try {
            let content;
            if (settings.apiProvider === 'google_gemini') {
                content = await callGoogleGeminiAPI(finalPromptText);
            } else {
                content = await callOpenAICompatibleAPI(finalPromptText);
            }
            logMessage(`<b>[AI原始返回]</b> <pre class="ai-raw-return">${parent$('<div>').text(content || '').html()}</pre>`, 'info');
            const filteredContent = (content && typeof content === 'string') ? content.replace(/<think>.*?<\/think>/gs, '').trim() : '';
            if (filteredContent) {
                const matches = filteredContent.match(/【(.*?)】/g) || [];
                const suggestions = matches.map(match => match.replace(/[【】]/g, '').trim()).filter(text => text.length > 0);
                if (suggestions.length > 0) {
                    logMessage(`<b>[文本解析]</b> 成功解析 ${suggestions.length} 条建议。`, 'success');
                    return suggestions;
                }
            }
            logMessage(`<b>[文本解析]</b> <b>AI返回的内容为空或格式不正确 (未找到【】)。</b>`, 'error');
            return null;
        } catch (error) {
            logMessage(`<b>[API调用]</b> 发生错误: ${error.message}`, 'error');
            return null;
        }
    }

    function renderSuggestions(suggestions) { cleanupSuggestions(); const $sendForm = parent$('#send_form'); if ($sendForm.length === 0) return; const $container = parent$(`<div id="${SUGGESTION_CONTAINER_ID}"></div>`); const buttonLabels = ['行动建议', '对话建议', '反应建议']; suggestions.forEach((text, index) => { const buttonLabel = buttonLabels[index] || `建议 ${index + 1}`; const $capsule = parent$(`<button class="sg-button secondary suggestion-capsule">${buttonLabel}</button>`); $capsule.data('full-text', text); $capsule.on('click', function() { const fullText = parent$(this).data('full-text'); showSuggestionModal(fullText); }); $container.append($capsule); }); $sendForm.prepend($container); logMessage(`已在界面上渲染 ${suggestions.length} 个建议按钮。`, 'success'); if (typeof eventOnce !== 'undefined' && typeof tavern_events !== 'undefined') { eventOnce(tavern_events.MESSAGE_SENT, cleanupSuggestions); eventOnce(tavern_events.MESSAGE_DELETED, cleanupSuggestions); eventOnce(tavern_events.MESSAGE_SWIPED, cleanupSuggestions); eventOnce(tavern_events.CHAT_CHANGED, cleanupSuggestions); } }
    function centerElement(element) { if (!element) return; const parentWindow = window.parent; const winWidth = parentWindow.innerWidth; const winHeight = parentWindow.innerHeight; const elWidth = element.offsetWidth; const elHeight = element.offsetHeight; element.style.top = `${Math.max(0, (winHeight - elHeight) / 2)}px`; element.style.left = `${Math.max(0, (winWidth - elWidth) / 2)}px`; }
    function showSuggestionModal(text) { parent$(`#${SUGGESTION_MODAL_ID}`).remove(); const $modal = parent$(`<div id="${SUGGESTION_MODAL_ID}"><div class="sg-modal-content"><p class="sg-modal-text">${parent$('<div>').text(text).html()}</p><div class="sg-modal-actions"><button class="sg-button secondary sg-modal-button-close">关闭</button><button class="sg-button primary sg-modal-button-use">使用此建议</button></div></div></div>`); $modal.on('click', function(e) { if (e.target.id === SUGGESTION_MODAL_ID || parent$(e.target).hasClass('sg-modal-button-close')) { $modal.remove(); } }); $modal.find('.sg-modal-button-use').on('click', () => { fillInputBoxAndCleanup(text); }); parent$('body').append($modal); centerElement($modal.find('.sg-modal-content')[0]); }
    function fillInputBoxAndCleanup(text) { const $textarea = parent$('#send_textarea'); if ($textarea.length > 0) { $textarea.val(text); $textarea.trigger('input'); } cleanupSuggestions(); }
    function cleanupSuggestions() { parent$(`#${SUGGESTION_CONTAINER_ID}`).remove(); parent$(`#${SUGGESTION_MODAL_ID}`).remove(); }
    
    async function triggerSuggestionGeneration() {
        try {
            parent$(`#${LOG_PANEL_ID}`).empty();
            logMessage("---- 开始新一轮建议生成 ----", 'info');
            if (typeof getChatMessages !== 'function' || typeof getLastMessageId !== 'function') {
                logMessage('<b>[错误]</b> 核心消息函数缺失，无法生成建议。', 'error');
                return;
            }

            const lastMessageId = getLastMessageId();
            if (lastMessageId < 1) { return; }
            
            const range = `${lastMessageId - 1}-${lastMessageId}`;
            const lastTwoMessages = getChatMessages(range);
            if (!lastTwoMessages || lastTwoMessages.length < 2) { return; }
            
            const [userMessage, aiMessage] = lastTwoMessages;
            if (!userMessage || userMessage.role !== 'user' || !aiMessage || aiMessage.role !== 'assistant') { return; }
            
            const userText = extractTextFromMessage(userMessage);
            const aiText = extractTextFromMessage(aiMessage);
            if (!userText || !aiText) { return; }
            
            const suggestions = await callSuggestionAI(aiText, userText);
            
            if (suggestions && suggestions.length > 0) {
                renderSuggestions(suggestions);
            }
        } catch (error) {
            logMessage(`生成建议时发生未知错误: ${error.message}`, 'error');
        }
    }

    async function applyCharacterBinding() { const currentChar = TavernHelper.getCharData(); if (!currentChar) return; const charId = currentChar.avatar; const charName = currentChar.name; let targetIndex = 0; let isBound = false; if (settings.characterBindings && settings.characterBindings.hasOwnProperty(charId)) { const boundIndex = settings.characterBindings[charId]; if (boundIndex >= 0 && boundIndex < settings.prompts.length) { targetIndex = boundIndex; isBound = true; } else { delete settings.characterBindings[charId]; } } if (settings.activePromptIndex !== targetIndex) { settings.activePromptIndex = targetIndex; if (isBound) { logMessage(`切换角色: "<b>${charName}</b>"。已自动应用绑定预设: "<b>${settings.prompts[targetIndex].name}</b>"。`, 'success'); } else { logMessage(`切换角色: "<b>${charName}</b>"。无有效绑定，使用默认预设: "<b>${settings.prompts[targetIndex].name}</b>"。`, 'info'); } await saveSettings(); } updateUIPanel(); }
    function cleanupOldUI() { parent$(`#${BUTTON_ID}, #${OVERLAY_ID}, #${STYLE_ID}`).remove(); }
    function injectStyles() { if (parent$(`#${STYLE_ID}`).length > 0) return; const styles = `<style id="${STYLE_ID}">
            :root { --sg-text: #EAEAEA; --sg-text-muted: #A0A0A0; --sg-accent-glow: rgba(128, 90, 213, 0.6); --sg-radius: 12px; --sg-border: 1px solid rgba(255, 255, 255, 0.1); }
            @keyframes sgFadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
            #${OVERLAY_ID} { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 10000; background-color: rgba(0,0,0,0.5); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); display: none; }
            #${PANEL_ID} { position: fixed; display: flex; flex-direction: column; width: 90%; max-width: 800px; height: 85vh; max-height: 850px; background: rgba(25, 26, 31, 0.75); color: var(--sg-text); border: var(--sg-border); border-radius: var(--sg-radius); box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); animation: sgFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); overflow: hidden; }
            #${PANEL_ID} .panel-header { padding: 16px 24px; border-bottom: var(--sg-border); display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; background: rgba(25, 26, 31, 0.5); }
            #${PANEL_ID} .panel-header h4 { margin: 0; font-size: 16px; font-weight: 600; color: #fff; text-shadow: 0 0 5px rgba(255,255,255,0.2); }
            #${PANEL_ID} .panel-close-btn { background: none; border: none; color: var(--sg-text-muted); font-size: 24px; cursor: pointer; transition: all 0.2s ease; }
            #${PANEL_ID} .panel-close-btn:hover { color: #fff; transform: rotate(90deg); }
            #${PANEL_ID} .panel-nav { display: flex; padding: 0 16px; border-bottom: var(--sg-border); flex-shrink: 0; }
            #${PANEL_ID} .panel-nav-item { padding: 14px 16px; cursor: pointer; color: var(--sg-text-muted); position: relative; transition: all .2s ease; font-weight: 500; font-size: 14px; }
            #${PANEL_ID} .panel-nav-item:hover { color: #fff; }
            #${PANEL_ID} .panel-nav-item::after { content: ''; position: absolute; bottom: -1px; left: 50%; width: 0; height: 2px; background: linear-gradient(90deg, #805AD5 0%, #3182CE 100%); transition: all .3s ease; transform: translateX(-50%); }
            #${PANEL_ID} .panel-nav-item.active { color: #fff; }
            #${PANEL_ID} .panel-nav-item.active::after { width: 100%; }
            #${PANEL_ID} .panel-content-wrapper { flex: 1; min-height: 0; display: flex; flex-direction: column; }
            #${PANEL_ID} .panel-content { display: none; flex: 1; min-height: 0; overflow-y: auto; padding: 32px; }
            #${PANEL_ID} .panel-content.active { display: block; }
            #${PANEL_ID} .form-group { margin-bottom: 24px; }
            #${PANEL_ID} label { display: block; margin-bottom: 10px; color: var(--sg-text-muted); font-weight: 500; font-size: 13px; }
            .input-with-button { display: flex; align-items: center; gap: 10px; }
            .input-with-button input { flex-grow: 1; margin: 0; }
            #${PANEL_ID} input[type=text], #${PANEL_ID} input[type=password], #${PANEL_ID} textarea, .sg-select-wrapper select { width: 100%; background: rgba(0, 0, 0, 0.2); color: var(--sg-text); border: var(--sg-border); border-radius: var(--sg-radius); padding: 14px; box-sizing: border-box; font-size: 14px; transition: all 0.2s ease; }
            #${PANEL_ID} textarea { min-height: 200px; resize: vertical; line-height: 1.7; }
            #${PANEL_ID} input:focus, #${PANEL_ID} textarea:focus, .sg-select-wrapper select:focus { outline: none; border-color: rgba(128, 90, 213, 0.8); box-shadow: 0 0 0 3px var(--sg-accent-glow); }
            .sg-select-wrapper { position: relative; } .sg-select-wrapper select { appearance: none; -webkit-appearance: none; }
            .sg-select-wrapper::after { content: '▾'; position: absolute; right: 15px; top: 50%; transform: translateY(-50%); pointer-events: none; color: var(--sg-text-muted); }
            .sg-button { display: inline-flex; align-items: center; justify-content: center; padding: 14px 22px; border: none; border-radius: var(--sg-radius); cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.2s ease; text-decoration: none; }
            .sg-button.primary { background: linear-gradient(90deg, #805AD5 0%, #3182CE 100%); color: #fff; } .sg-button.primary:hover { transform: scale(1.05); box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
            .sg-button.secondary { background: rgba(255, 255, 255, 0.1); color: var(--sg-text); } .sg-button.secondary:hover { background: rgba(255, 255, 255, 0.2); }
            .sg-button.danger { background: #E53E3E; color: #fff; }
            .sg-button.success { background: #48BB78; color: #fff; }
            #${LOG_PANEL_ID} { font-family: 'Fira Code', 'Consolas', monospace; font-size: 13px; }
            .log-entry { margin-bottom: 8px; padding: 8px 12px; border-left: 3px solid rgba(255,255,255,0.2); border-radius: 8px; background: rgba(0,0,0,0.2); }
            #${SUGGESTION_CONTAINER_ID} { display: flex; justify-content: center; gap: 8px; padding: 5px 0; width: 100%; }
            #${SUGGESTION_CONTAINER_ID} .suggestion-capsule { padding: 8px 16px; }
            #${SUGGESTION_MODAL_ID} { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 20000; animation: sgFadeIn 0.2s ease-out; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); }
            .sg-modal-content { position: fixed; background: rgba(35, 36, 41, 0.85); border: var(--sg-border); border-radius: var(--sg-radius); box-shadow: 0 8px 32px rgba(0,0,0,0.5); width: 90%; max-width: 500px; padding: 32px; display: flex; flex-direction: column; gap: 24px; backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); }
            .sg-modal-text { margin: 0; padding: 0; font-size: 15px; line-height: 1.7; color: var(--sg-text); max-height: 60vh; overflow-y: auto; }
            .sg-modal-actions { display: flex; gap: 12px; justify-content: flex-end; }
        </style>`; parent$(parentDoc.head).append(styles); }
    async function testConnectionAndFetchModels() { const $btn = parent$('#sg-test-connection-btn'); const $modelSelect = parent$('#sg-model-select'); $btn.text('测试中...').prop('disabled', true); $modelSelect.html('<option>正在加载模型...</option>').prop('disabled', true); try { let models = []; if (settings.apiProvider === 'google_gemini') { if (!settings.apiKey) throw new Error("需要提供 Google API Key。"); const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${settings.apiKey}`); const data = await response.json(); if (!response.ok) throw new Error(data.error ? data.error.message : '未知Google API错误'); models = data.models.filter(m => m.supportedGenerationMethods.includes('generateContent')).map(m => m.name.replace('models/', '')); } else { if (!settings.baseUrl) throw new Error("需要提供 Base URL。"); const response = await fetch(`${settings.baseUrl}/models`, { headers: { 'Authorization': `Bearer ${settings.apiKey}` } }); if (!response.ok) { const errorData = await response.json().catch(() => ({ error: { message: `服务器返回状态 ${response.status}` } })); throw new Error(errorData.error.message); } const data = await response.json(); models = data.data.map(m => m.id); } populateModelDropdown(models.sort()); logMessage(`连接成功，获取到 ${models.length} 个可用模型。`, 'success'); $btn.html('✓').addClass('success').removeClass('danger'); } catch (error) { logMessage(`连接测试失败: ${error.message}`, 'error'); $modelSelect.html('<option>加载失败，请检查设置</option>'); $btn.html('✗').addClass('danger').removeClass('success'); } finally { setTimeout(() => { $btn.text('连接测试').removeClass('success danger').prop('disabled', false); }, 2000); $modelSelect.prop('disabled', false); } }
    function populateModelDropdown(models) { const $modelSelect = parent$('#sg-model-select'); $modelSelect.empty(); if (models.length === 0) { $modelSelect.append('<option>无可用模型</option>'); return; } models.forEach(modelId => { $modelSelect.append(`<option value="${modelId}">${modelId}</option>`); }); if (settings.model && models.includes(settings.model)) { $modelSelect.val(settings.model); } else if (models.length > 0) { settings.model = models[0]; $modelSelect.val(settings.model); saveSettings(); } }
    function createAndInjectUI() { if (parent$(`#extensionsMenu`).length > 0 && parent$(`#${BUTTON_ID}`).length === 0) { parent$('<div/>', { id: BUTTON_ID, class: 'list-group-item flex-container flexGap5 interactable', html: `<i class="fa-solid fa-lightbulb"></i><span>AI指引助手</span>` }).appendTo(parent$(`#extensionsMenu`)); } if (parent$(`#${OVERLAY_ID}`).length === 0) { const apiPanelHtml = `<div class="form-group"><label for="sg-api-provider">API 服务商</label><div class="sg-select-wrapper"><select id="sg-api-provider"><option value="openai_compatible">OpenAI 兼容接口 (通用)</option><option value="google_gemini">Google AI (Gemini 直连)</option></select></div></div><div class="form-group" id="sg-base-url-group"><label for="sg-base-url">Base URL</label><input type="text" id="sg-base-url"></div><div class="form-group"><label for="sg-api-key">API Key</label><div class="input-with-button"><input type="password" id="sg-api-key"><button id="sg-test-connection-btn" class="sg-button secondary">连接测试</button></div></div><div class="form-group"><label for="sg-model-select">模型 (Model)</label><div class="sg-select-wrapper"><select id="sg-model-select"></select></div></div>`; const $overlay = parent$('<div/>', { id: OVERLAY_ID }); const $panel = parent$(`<div id="${PANEL_ID}"></div>`); $overlay.append($panel).appendTo(parent$('body')); $panel.html(`<div class="panel-header"><h4>AI指引助手 v${SCRIPT_VERSION}</h4><button class="panel-close-btn">×</button></div><div class="panel-nav"><div class="panel-nav-item active" data-tab="api">API</div><div class="panel-nav-item" data-tab="prompts">预设</div><div class="panel-nav-item" data-tab="logs">日志</div></div><div class="panel-content-wrapper"><div id="sg-panel-api" class="panel-content active">${apiPanelHtml}</div><div id="sg-panel-prompts" class="panel-content"><div id="sg-prompt-list"></div><button id="sg-add-prompt-btn" class="sg-button secondary" style="width:100%;margin-top:20px;">添加新预设</button></div><div id="${LOG_PANEL_ID}" class="panel-content" data-tab-name="logs"></div></div>`); } }
    function updateUIPanel() { parent$('#sg-api-provider').val(settings.apiProvider); parent$('#sg-api-key').val(settings.apiKey); parent$('#sg-base-url').val(settings.baseUrl); const isGoogle = settings.apiProvider === 'google_gemini'; parent$('#sg-base-url-group').toggle(!isGoogle); const $promptList = parent$('#sg-prompt-list').empty(); if (settings.prompts && settings.prompts.length > 0) { settings.prompts.forEach((prompt, index) => { const $item = parent$(`<div class="prompt-item-container" style="background: rgba(0,0,0,0.2); border-radius: 12px; margin-bottom: 16px; border: 1px solid rgba(255,255,255,0.1);"><div class="prompt-item" style="padding: 16px; display: flex; align-items: center; gap: 16px;"><input type="text" class="prompt-name-input" value="${prompt.name}" data-index="${index}" style="flex-grow: 1; margin: 0;"><div class="prompt-item-actions" style="display: flex; gap: 8px;"><button class="sg-button secondary prompt-use-btn" data-index="${index}">使用</button><button class="sg-button danger prompt-delete-btn" data-index="${index}">删除</button></div></div><div class="form-group" style="padding: 0 16px 16px 16px; margin-bottom: 0;"><textarea class="prompt-content-textarea" data-index="${index}">${prompt.content}</textarea></div></div>`); $promptList.append($item); }); } testConnectionAndFetchModels(); }
    function bindEvents() { const parentBody = parent$('body'); parentBody.on('click', `#${BUTTON_ID}`, (event) => { event.stopPropagation(); const $overlay = parent$(`#${OVERLAY_ID}`); $overlay.show(); const $panel = $overlay.find(`#${PANEL_ID}`); centerElement($panel[0]); updateUIPanel(); }); parentBody.on('click', `#${OVERLAY_ID}`, async function(e) { if (e.target.id === OVERLAY_ID || parent$(e.target).hasClass('panel-close-btn')) { parent$(`#${OVERLAY_ID}`).hide(); } }); parent$(window.parent).on('resize', () => { if (parent$(`#${OVERLAY_ID}`).is(':visible')) { centerElement(parent$(`#${PANEL_ID}`)[0]); } }); parentBody.on('click', `#${PANEL_ID} .panel-nav-item`, function() { const tab = parent$(this).data('tab'); parent$(`#${PANEL_ID} .panel-nav-item`).removeClass('active'); parent$(this).addClass('active'); parent$(`#${PANEL_ID} .panel-content`).removeClass('active'); parent$(`#sg-panel-${tab}, [data-tab-name='${tab}']`).addClass('active'); }); parentBody.on('change', '#sg-api-provider', async function() { settings.apiProvider = parent$(this).val(); const isGoogle = settings.apiProvider === 'google_gemini'; parent$('#sg-base-url-group').toggle(!isGoogle); await saveSettings(); await testConnectionAndFetchModels(); }); parentBody.on('input', '#sg-api-key, #sg-base-url', async function() { settings.apiKey = parent$('#sg-api-key').val(); settings.baseUrl = parent$('#sg-base-url').val(); await saveSettings(); }); parentBody.on('change', '#sg-model-select', async function() { settings.model = parent$(this).val(); await saveSettings(); }); parentBody.on('click', '#sg-test-connection-btn', testConnectionAndFetchModels); parentBody.on('click', '#sg-add-prompt-btn', async () => { settings.prompts.push({ name: '新预设', content: '在这里输入你的提示词...' }); updateUIPanel(); await saveSettings(); }); parentBody.on('click', `.prompt-use-btn`, async function() { const index = parseInt(parent$(this).data('index')); const currentChar = TavernHelper.getCharData(); if (currentChar) { const charId = currentChar.avatar; const charName = currentChar.name; if (!settings.characterBindings) settings.characterBindings = {}; settings.characterBindings[charId] = index; settings.activePromptIndex = index; await saveSettings(); updateUIPanel(); logMessage(`操作: 已将角色 "<b>${charName}</b>" 绑定到预设 "<b>${settings.prompts[index].name}</b>"。`, 'success'); } }); parentBody.on('click', `.prompt-delete-btn`, async function() { const indexToDelete = parseInt(parent$(this).data('index')); if (settings.prompts.length <= 1) { logMessage('不能删除最后一个预设。', 'warn'); return; } if (confirm(`确定要删除预设 "${settings.prompts[indexToDelete].name}" 吗?`)) { settings.prompts.splice(indexToDelete, 1); if (settings.characterBindings) { const newBindings = {}; for (const charId in settings.characterBindings) { const boundIndex = settings.characterBindings[charId]; if (boundIndex === indexToDelete) continue; else if (boundIndex > indexToDelete) newBindings[charId] = boundIndex - 1; else newBindings[charId] = boundIndex; } settings.characterBindings = newBindings; } await applyCharacterBinding(); } }); parentBody.on('change', `.prompt-name-input, .prompt-content-textarea`, async function() { const index = parseInt(parent$(this).data('index')); const isName = parent$(this).hasClass('prompt-name-input'); if (isName) { settings.prompts[index].name = parent$(this).val(); } else { settings.prompts[index].content = parent$(this).val(); } await saveSettings(); }); if (typeof eventOn !== 'undefined' && typeof tavern_events !== 'undefined') { eventOn(tavern_events.GENERATION_ENDED, triggerSuggestionGeneration); eventOn(tavern_events.CHAT_CHANGED, applyCharacterBinding); } }
    
    function init() { if (!parent$) { return; } cleanupOldUI(); injectStyles(); createAndInjectUI(); loadSettings().then(() => { bindEvents(); if (typeof SillyTavern === 'undefined' || typeof SillyTavern.substituteParams !== 'function') { logMessage(`<b>[错误]</b> 核心组件 SillyTavern 或 substituteParams 函数缺失，插件无法运行。`, 'error'); return; } applyCharacterBinding(); logMessage(`AI指引助手 v${SCRIPT_VERSION} 初始化完成。`, "success"); }); }
    
    if (typeof(window.parent.jQuery || window.parent.$) === 'function' && typeof SillyTavern !== 'undefined') { setTimeout(init, 2000); } else { console.error(`${LOG_PREFIX} 等待核心组件超时，脚本可能无法正常工作。`); }
})();
