(function () {
    function initFileDrop(inputId) {
        const input = document.getElementById(inputId);
        if (!input) return;
        const area = document.querySelector(`[data-filedrop="${inputId}"]`);
        const nameEl = document.querySelector(`[data-filedrop-name="${inputId}"]`);
        const browseBtn = document.querySelector(`[data-filedrop-browse="${inputId}"]`);

        function setName(file) {
            if (nameEl) {
                nameEl.textContent = file ? file.name : 'Файл не выбран';
            }
        }

        if (browseBtn) {
            browseBtn.addEventListener('click', () => {
                if (input) input.click();
            });
        }

        if (area) {
            ['dragenter', 'dragover'].forEach(evt => area.addEventListener(evt, (e) => {
                e.preventDefault();
                e.stopPropagation();
                area.classList.add('dragover');
            }));

            ['dragleave', 'drop'].forEach(evt => area.addEventListener(evt, (e) => {
                e.preventDefault();
                e.stopPropagation();
                area.classList.remove('dragover');
            }));

            area.addEventListener('drop', (e) => {
                try {
                    const files = e.dataTransfer?.files;
                    if (!files || !files.length || !input) return;
                    input.files = files;
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                    setName(files[0]);
                } catch (err) {
                    }
            });

            area.addEventListener('click', () => {
                if (input) input.click();
            });
        }

        input.addEventListener('change', () => {
            try {
                setName(input?.files?.[0] || null);
            } catch (err) {
                }
        });

        setName(null);
    }

    // expose globally
    window.initFileDrop = initFileDrop;
})();

