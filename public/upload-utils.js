(function () {
    function bytesToSize(bytes) {
        const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
        if (bytes === 0) return '0 Б';
        const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10);
        return Math.round(bytes / Math.pow(1024, i)) + ' ' + sizes[i];
    }

    function validateImageFile(file, opts) {
        const { allowedTypes = ['image/jpeg', 'image/png', 'image/webp'], maxSize = 5 * 1024 * 1024, minWidth = 0, minHeight = 0 } = opts || {};
        if (!allowedTypes.includes(file.type)) {
            return Promise.resolve({ ok: false, error: 'Неверный формат. Разрешены JPEG/PNG/WebP.' });
        }
        if (file.size > maxSize) {
            return Promise.resolve({ ok: false, error: `Файл слишком большой: ${bytesToSize(file.size)} (макс. ${bytesToSize(maxSize)})` });
        }
        if (minWidth === 0 && minHeight === 0) {
            return Promise.resolve({ ok: true });
        }
        return new Promise((resolve) => {
            const doFallback = () => {
                const img = new Image();
                const reader = new FileReader();
                reader.onload = function (ev) {
                    img.onload = function () {
                        if (img.naturalWidth < minWidth || img.naturalHeight < minHeight) {
                            resolve({ ok: false, error: `Низкое разрешение: ${img.naturalWidth}x${img.naturalHeight}. Минимум ${minWidth}x${minHeight}.` });
                        } else {
                            resolve({ ok: true, width: img.naturalWidth, height: img.naturalHeight });
                        }
                    };
                    img.onerror = function () {
                        resolve({ ok: false, error: 'Невозможно прочитать изображение' });
                    };
                    img.src = ev.target.result;
                };
                reader.onerror = function () { resolve({ ok: false, error: 'Ошибка чтения файла' }); };
                reader.readAsDataURL(file);
            };

            if (window.createImageBitmap) {
                // Use createImageBitmap to read dimensions without touching DOM/CSP
                try {
                    Promise.resolve(window.createImageBitmap(file)).then((bmp) => {
                        const w = bmp.width, h = bmp.height;
                        if (typeof bmp.close === 'function') bmp.close();
                        if (w < minWidth || h < minHeight) {
                            resolve({ ok: false, error: `Низкое разрешение: ${w}x${h}. Минимум ${minWidth}x${minHeight}.` });
                        } else {
                            resolve({ ok: true, width: w, height: h });
                        }
                    }).catch(() => doFallback());
                } catch (_) {
                    doFallback();
                }
            } else {
                doFallback();
            }
        });
    }

    function xhrUpload(url, formData, headers, onProgress) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', url, true);
            xhr.withCredentials = true;
            if (headers && typeof headers === 'object') {
                Object.entries(headers).forEach(([k, v]) => {
                    if (typeof v === 'string') xhr.setRequestHeader(k, v);
                });
            }
            xhr.upload.onprogress = function (e) {
                if (e.lengthComputable && typeof onProgress === 'function') {
                    const percent = Math.round((e.loaded / e.total) * 100);
                    onProgress(percent, e.loaded, e.total);
                }
            };
            xhr.onload = function () {
                try {
                    const json = JSON.parse(xhr.responseText || '{}');
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve(json);
                    } else {
                        reject(new Error(json.error || 'Ошибка загрузки'));
                    }
                } catch (err) {
                    reject(new Error('Некорректный ответ сервера'));
                }
            };
            xhr.onerror = function () { reject(new Error('Сеть недоступна')); };
            xhr.send(formData);
        });
    }

    async function uploadImageWithProgress({ url, file, fieldName = 'image', headers = {}, onProgress }) {
        const fd = new FormData();
        fd.append(fieldName, file);
        const res = await xhrUpload(url, fd, headers, onProgress);
        return res;
    }

    window.UploadUtils = { validateImageFile, uploadImageWithProgress };
})();
