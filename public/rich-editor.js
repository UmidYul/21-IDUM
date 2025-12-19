// Simple Rich Text Editor with formatting buttons (no external dependencies)
(function () {
    window.initializeRichEditor = function (elementId, placeholder = 'Введите текст...') {
        const textarea = document.getElementById(elementId);
        if (!textarea) {
            console.error(`Element with id ${elementId} not found`);
            return null;
        }

        // Create wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'rich-editor-wrapper';
        wrapper.style.marginTop = '8px';

        // Create toolbar
        const toolbar = document.createElement('div');
        toolbar.className = 'editor-toolbar';
        toolbar.style.cssText = `
            display: flex;
            gap: 4px;
            padding: 8px;
            background: #2a2a2a;
            border: 1px solid #444;
            border-bottom: none;
            border-radius: 4px 4px 0 0;
            flex-wrap: wrap;
            align-items: center;
        `;

        const buttons = [
            { cmd: 'bold', label: 'Ж', title: 'Жирный (Ctrl+B)' },
            { cmd: 'italic', label: 'К', title: 'Курсив (Ctrl+I)' },
            { cmd: 'underline', label: 'П', title: 'Подчеркивание (Ctrl+U)' },
            { cmd: 'formatBlock', value: 'h2', label: 'H2', title: 'Заголовок 2' },
            { cmd: 'formatBlock', value: 'h3', label: 'H3', title: 'Заголовок 3' },
            { cmd: 'insertUnorderedList', label: '•', title: 'Маркированный список' },
            { cmd: 'insertOrderedList', label: '1', title: 'Нумерованный список' },
            { cmd: 'createLink', label: '∞', title: 'Ссылка' },
            { cmd: 'insertImage', label: '🖼', title: 'Изображение' },
            { cmd: 'removeFormat', label: 'Очистить', title: 'Очистить форматирование' }
        ];

        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = btn.label;
            button.title = btn.title;
            button.style.cssText = `
                padding: 5px 8px;
                background: #3a3a3a;
                color: #fff;
                border: 1px solid #555;
                border-radius: 3px;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s;
                font-weight: 600;
                white-space: nowrap;
                min-height: 28px;
                display: flex;
                align-items: center;
                justify-content: center;
            `;

            button.addEventListener('mouseover', () => {
                button.style.background = '#4a4a4a';
            });
            button.addEventListener('mouseout', () => {
                button.style.background = '#3a3a3a';
            });

            button.addEventListener('click', (e) => {
                e.preventDefault();
                editor.focus();

                if (btn.cmd === 'createLink') {
                    const url = prompt('Введите URL:', 'https://');
                    if (url) {
                        document.execCommand(btn.cmd, false, url);
                    }
                } else if (btn.cmd === 'insertImage') {
                    const url = prompt('Введите URL изображения:', 'https://');
                    if (url) {
                        document.execCommand(btn.cmd, false, url);
                    }
                } else if (btn.cmd === 'formatBlock') {
                    document.execCommand(btn.cmd, false, btn.value);
                } else {
                    document.execCommand(btn.cmd, false, null);
                }

                // Update textarea
                textarea.value = editor.innerHTML;
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
            });

            toolbar.appendChild(button);
        });

        // Create editor div
        const editor = document.createElement('div');
        editor.id = `${elementId}-editor`;
        editor.className = 'editor-content';
        editor.contentEditable = true;
        editor.style.cssText = `
            min-height: 300px;
            padding: 12px;
            background: #1e1e1e;
            color: #e0e0e0;
            border: 1px solid #444;
            border-top: none;
            border-radius: 0 0 4px 4px;
            font-size: 14px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            outline: none;
            overflow-wrap: break-word;
            word-wrap: break-word;
            word-break: break-word;
            box-sizing: border-box;
        `;

        // Add styles for lists
        const style = document.createElement('style');
        if (!document.getElementById('rich-editor-styles')) {
            style.id = 'rich-editor-styles';
            style.textContent = `
                #${elementId}-editor ul,
                #${elementId}-editor ol {
                    margin: 10px 0 10px 20px;
                    color: #e0e0e0;
                }
                #${elementId}-editor li {
                    margin: 5px 0;
                    color: #e0e0e0;
                }
                #${elementId}-editor blockquote {
                    margin: 10px 0 10px 20px;
                    padding-left: 10px;
                    border-left: 3px solid #555;
                    color: #b0b0b0;
                }
                #${elementId}-editor code {
                    background: #2a2a2a;
                    padding: 2px 6px;
                    border-radius: 3px;
                    color: #90ee90;
                    font-family: 'Courier New', monospace;
                }
                #${elementId}-editor a {
                    color: #64b5f6;
                    text-decoration: underline;
                }
            `;
            document.head.appendChild(style);
        }

        // Placeholder
        if (!textarea.value) {
            editor.textContent = placeholder;
            editor.style.color = '#666';
        }

        editor.addEventListener('focus', () => {
            if (editor.textContent === placeholder) {
                editor.innerHTML = '';
                editor.style.color = '#e0e0e0';
            }
        });

        editor.addEventListener('blur', () => {
            if (!editor.innerHTML.trim()) {
                editor.textContent = placeholder;
                editor.style.color = '#666';
            }
            // Sync with textarea
            textarea.value = editor.innerHTML;
        });

        editor.addEventListener('input', () => {
            // Sync with textarea
            textarea.value = editor.innerHTML;
        });

        // Load initial content
        if (textarea.value && textarea.value !== placeholder) {
            try {
                editor.innerHTML = textarea.value;
            } catch (e) {
                editor.textContent = textarea.value;
            }
            editor.style.color = '#e0e0e0';
        }

        // Hide textarea
        textarea.style.display = 'none';

        // Insert into DOM
        wrapper.appendChild(toolbar);
        wrapper.appendChild(editor);
        textarea.parentNode.insertBefore(wrapper, textarea);

        // Store reference
        textarea.editor = editor;
        textarea.richEditor = true;

        return editor;
    };

    window.getEditorHTML = function (elementId) {
        const textarea = document.getElementById(elementId);
        if (!textarea || !textarea.editor) {
            return textarea?.value || '';
        }
        let html = textarea.editor.innerHTML;
        // Remove placeholder
        if (html === 'Введите текст...' || html === 'O\'zbek tilida xabar yozing...' || html === 'Напишите содержание новости на русском...' || html === 'Напишите текст объявления...') {
            return '';
        }
        return html;
    };

    window.setEditorContent = function (elementId, content) {
        const textarea = document.getElementById(elementId);
        if (!textarea) {
            textarea.value = content;
            return;
        }

        if (textarea.editor) {
            textarea.editor.innerHTML = content;
            textarea.editor.style.color = '#333';
        } else {
            textarea.value = content;
        }
    };

    window.clearEditor = function (elementId) {
        const textarea = document.getElementById(elementId);
        if (!textarea) return;

        if (textarea.editor) {
            textarea.editor.innerHTML = '';
            textarea.editor.textContent = 'Введите текст...';
            textarea.editor.style.color = '#999';
        } else {
            textarea.value = '';
        }
    };
})();
