// Quill Rich Text Editor initialization
(function () {
    // Load Quill from CDN dynamically if needed
    const loadQuill = () => {
        if (window.Quill) return Promise.resolve();

        return new Promise((resolve, reject) => {
            const cssLink = document.createElement('link');
            cssLink.href = 'https://cdn.quilljs.com/1.3.6/quill.snow.css';
            cssLink.rel = 'stylesheet';
            cssLink.onload = () => {
                const script = document.createElement('script');
                script.src = 'https://cdn.quilljs.com/1.3.6/quill.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            };
            cssLink.onerror = reject;
            document.head.appendChild(cssLink);
        });
    };

    // Initialize editor for a specific element
    window.initializeQuillEditor = async function (elementId, placeholder = 'Введите текст...') {
        try {
            await loadQuill();

            const container = document.getElementById(elementId);
            if (!container) {
                console.error(`Element with id ${elementId} not found`);
                return null;
            }

            // Create editor container
            const editorContainer = document.createElement('div');
            editorContainer.id = `${elementId}-editor`;
            editorContainer.style.minHeight = '300px';
            editorContainer.style.backgroundColor = '#fff';
            editorContainer.style.borderRadius = '4px';
            editorContainer.style.marginTop = '8px';

            // Hide original textarea
            container.style.display = 'none';

            // Insert editor before textarea
            container.parentNode.insertBefore(editorContainer, container);

            // Initialize Quill
            const quill = new Quill(editorContainer, {
                theme: 'snow',
                placeholder: placeholder,
                modules: {
                    toolbar: [
                        [{ header: [2, 3, false] }],
                        ['bold', 'italic', 'underline'],
                        ['blockquote', 'code-block'],
                        [{ list: 'ordered' }, { list: 'bullet' }],
                        ['link', 'image'],
                        ['clean']
                    ]
                },
                formats: [
                    'header',
                    'bold', 'italic', 'underline',
                    'blockquote', 'code-block',
                    'list',
                    'link', 'image'
                ]
            });

            // Load initial content from textarea if exists
            if (container.value) {
                try {
                    quill.setContents(JSON.parse(container.value));
                } catch (e) {
                    // If not JSON, treat as plain HTML
                    quill.root.innerHTML = container.value;
                }
            }

            // Sync textarea with editor content on change
            quill.on('text-change', () => {
                const html = quill.root.innerHTML;
                const delta = JSON.stringify(quill.getContents());

                // Store both HTML and Delta format
                container.value = html;
                container.dataset.delta = delta;
            });

            // Store reference to quill instance
            container.quill = quill;

            return quill;
        } catch (error) {
            console.error('Error initializing Quill editor:', error);
            return null;
        }
    };

    // Get editor content as HTML
    window.getEditorHTML = function (elementId) {
        const container = document.getElementById(elementId);
        if (!container || !container.quill) {
            return container?.value || '';
        }
        return container.quill.root.innerHTML;
    };

    // Set editor content
    window.setEditorContent = function (elementId, content) {
        const container = document.getElementById(elementId);
        if (!container || !container.quill) {
            container.value = content;
            return;
        }

        try {
            // Try to parse as delta
            container.quill.setContents(JSON.parse(content));
        } catch (e) {
            // Fallback to HTML
            container.quill.root.innerHTML = content;
        }
    };

    // Clear editor
    window.clearEditor = function (elementId) {
        const container = document.getElementById(elementId);
        if (!container || !container.quill) {
            container.value = '';
            return;
        }
        container.quill.setContents([]);
    };
})();
