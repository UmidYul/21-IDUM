(function () {
    // Determine current language (default: Russian)
    const currentLanguage = localStorage.getItem('language') || 'ru';

    // Render teachers from database
    async function renderTeachers() {
        const container = document.querySelector('.leadership-grid');
        if (!container) return;

        // Add loading state
        container.style.opacity = '0';
        container.style.transition = 'opacity 0.4s ease';

        try {
            const response = await fetch('/api/teachers', { credentials: 'same-origin' });
            if (!response.ok) throw new Error('Failed to fetch teachers');

            const data = await response.json();
            const teachers = (data.teachers || []).sort((a, b) => a.order - b.order);

            container.innerHTML = teachers.map(teacher => `
                <div class="leader-card">
                    <div class="leader-img">
                        <img src="${teacher.photo}" alt="${currentLanguage === 'uz' ? teacher.name_uz : teacher.name_ru}" loading="lazy">
                    </div>
                    <div class="leader-info">
                        <h3 class="leader-name">${currentLanguage === 'uz' ? teacher.name_uz : teacher.name_ru}</h3>
                        <p class="leader-position">${currentLanguage === 'uz' ? teacher.position_uz : teacher.position_ru}</p>
                        <div class="leader-contact">
                            ${teacher.telegram ? `<span><a href="${teacher.telegram}" target="_blank"><svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 25 25"><g fill="none"><g clip-path="url(#SVGXv8lpc2Y)"><path fill="currentColor" fill-rule="evenodd" d="M24 12c0 6.627-5.373 12-12 12S0 18.627 0 12S5.373 0 12 0s12 5.373 12 12M12.43 8.859q-1.75.728-6.998 3.014q-.852.339-.893.663c-.046.366.412.51 1.034.705l.263.084c.613.199 1.437.432 1.865.441q.583.012 1.302-.48q4.902-3.31 5.061-3.346c.075-.017.179-.039.249.024c.07.062.063.18.056.212c-.046.193-1.84 1.862-2.77 2.726c-.29.269-.495.46-.537.504q-.143.145-.282.279c-.57.548-.996.96.024 1.632c.49.323.882.59 1.273.856c.427.291.853.581 1.405.943q.21.14.405.28c.497.355.944.673 1.496.623c.32-.03.652-.331.82-1.23c.397-2.126 1.179-6.73 1.36-8.628a2 2 0 0 0-.02-.472a.5.5 0 0 0-.172-.325c-.143-.117-.365-.142-.465-.14c-.451.008-1.143.249-4.476 1.635" clip-rule="evenodd"/></g><defs><clipPath id="SVGXv8lpc2Y"><path fill="#fff" d="M0 0h24v24H0z"/></clipPath></defs></g></svg></a></span>` : ''}
                            ${teacher.instagram ? `<span><a href="${teacher.instagram}" target="_blank"><svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 25 25"><path fill="currentColor" d="M7.03.084c-1.277.06-2.149.264-2.91.563a5.9 5.9 0 0 0-2.124 1.388a5.9 5.9 0 0 0-1.38 2.127C.321 4.926.12 5.8.064 7.076s-.069 1.688-.063 4.947s.021 3.667.083 4.947c.061 1.277.264 2.149.563 2.911c.308.789.72 1.457 1.388 2.123a5.9 5.9 0 0 0 2.129 1.38c.763.295 1.636.496 2.913.552c1.278.056 1.689.069 4.947.063s3.668-.021 4.947-.082c1.28-.06 2.147-.265 2.91-.563a5.9 5.9 0 0 0 2.123-1.388a5.9 5.9 0 0 0 1.38-2.129c.295-.763.496-1.636.551-2.912c.056-1.28.07-1.69.063-4.948c-.006-3.258-.02-3.667-.081-4.947c-.06-1.28-.264-2.148-.564-2.911a5.9 5.9 0 0 0-1.387-2.123a5.9 5.9 0 0 0-2.128-1.38c-.764-.294-1.636-.496-2.914-.55C15.647.009 15.236-.006 11.977 0S8.31.021 7.03.084m.14 21.693c-1.17-.05-1.805-.245-2.228-.408a3.7 3.7 0 0 1-1.382-.895a3.7 3.7 0 0 1-.9-1.378c-.165-.423-.363-1.058-.417-2.228c-.06-1.264-.072-1.644-.08-4.848c-.006-3.204.006-3.583.061-4.848c.05-1.169.246-1.805.408-2.228c.216-.561.477-.96.895-1.382a3.7 3.7 0 0 1 1.379-.9c.423-.165 1.057-.361 2.227-.417c1.265-.06 1.644-.072 4.848-.08c3.203-.006 3.583.006 4.85.062c1.168.05 1.804.244 2.227.408c.56.216.96.475 1.382.895s.681.817.9 1.378c.165.422.362 1.056.417 2.227c.06 1.265.074 1.645.08 4.848c.005 3.203-.006 3.583-.061 4.848c-.051 1.17-.245 1.805-.408 2.23c-.216.56-.477.96-.896 1.38a3.7 3.7 0 0 1-1.378.9c-.422.165-1.058.362-2.226.418c-1.266.06-1.645.072-4.85.079s-3.582-.006-4.848-.06m9.783-16.192a1.44 1.44 0 1 0 1.437-1.442a1.44 1.44 0 0 0-1.437 1.442M5.839 12.012a6.161 6.161 0 1 0 12.323-.024a6.162 6.162 0 0 0-12.323.024M8 12.008A4 4 0 1 1 12.008 16A4 4 0 0 1 8 12.008"/></svg></a></span>` : ''}
                            ${teacher.phone ? `<span><a href="tel:${teacher.phone}"><svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 25 25"><path fill="currentColor" d="M19.5 22a1.5 1.5 0 0 0 1.5-1.5V17a1.5 1.5 0 0 0-1.5-1.5c-1.17 0-2.32-.18-3.42-.55a1.51 1.51 0 0 0-1.52.37l-1.44 1.44a14.77 14.77 0 0 1-5.89-5.89l1.43-1.43c.41-.39.56-.97.38-1.53c-.36-1.09-.54-2.24-.54-3.41A1.5 1.5 0 0 0 7 3H3.5A1.5 1.5 0 0 0 2 4.5C2 14.15 9.85 22 19.5 22M3.5 4H7a.5.5 0 0 1 .5.5c0 1.28.2 2.53.59 3.72c.05.14.04.34-.12.5L6 10.68c1.65 3.23 4.07 5.65 7.31 7.32l1.95-1.97c.14-.14.33-.18.51-.13c1.2.4 2.45.6 3.73.6a.5.5 0 0 1 .5.5v3.5a.5.5 0 0 1-.5.5C10.4 21 3 13.6 3 4.5a.5.5 0 0 1 .5-.5" stroke-width="0.8" stroke="currentColor"/></svg></a></span>` : ''}
                        </div>
                    </div>
                </div>
            `).join('');

            // Smooth fade-in after content is ready
            setTimeout(() => {
                container.style.opacity = '1';
            }, 50);

        } catch (err) {
            console.error('Error loading teachers:', err);
            container.style.opacity = '1';
        }
    }

    // Render reviews from database
    async function renderReviews() {
        try {
            const response = await fetch('/api/reviews', { credentials: 'same-origin' });
            if (!response.ok) throw new Error('Failed to fetch reviews');

            const data = await response.json();
            const reviews = (data.reviews || []).filter(r => r.status === 'published');

            const container = document.querySelector('.testimonials-grid');
            if (!container) return;

            container.innerHTML = reviews.map(review => `
                <div class="testimonial-card ${review.author === 'Азиза Эргашева' ? 'success-story' : ''}">
                    <div class="testimonial-header">
                        <div class="testimonial-avatar">
                            <span class="avatar-icon">${getAvatarEmoji(review.author)}</span>
                        </div>
                        <div class="testimonial-author">
                            <h3 class="author-name">${review.author}</h3>
                            <p class="author-role">${getAuthorRole(review.author)}</p>
                        </div>
                    </div>
                    <div class="testimonial-content">
                        ${review.author === 'Азиза Эргашева' ? '<div class="success-badge">История успеха</div>' : '<div class="quote-icon">"</div>'}
                        <p class="testimonial-text">${currentLanguage === 'uz' ? review.text_uz : review.text_ru}</p>
                        <div class="testimonial-rating">⭐⭐⭐⭐⭐</div>
                    </div>
                </div>
            `).join('');
        } catch (err) {
            console.error('Error loading reviews:', err);
        }
    }

    // Helper function to get avatar emoji based on author
    function getAvatarEmoji(author) {
        const emojis = {
            'Алишер Каримов': '👨‍💼',
            'Дилноза Рахимова': '👩‍🎓',
            'Нигора Усманова': '👩‍💼',
            'Жасур Абдуллаев': '👨‍🎓',
            'Равшан Турсунов': '👨‍💼',
            'Азиза Эргашева': '🏆'
        };
        return emojis[author] || '👤';
    }

    // Helper function to get author role
    function getAuthorRole(author) {
        const roles = {
            'Алишер Каримов': currentLanguage === 'uz' ? 'Talabaaning ota-onasi, 7-sinf' : 'Родитель ученика 7-го класса',
            'Дилноза Рахимова': currentLanguage === 'uz' ? '2024 yil bitiruvchisi' : 'Выпускница 2024 года',
            'Нигора Усманова': currentLanguage === 'uz' ? 'Talabaning ota-onasi, 5-sinf' : 'Родитель ученицы 5-го класса',
            'Жасур Абдуллаев': currentLanguage === 'uz' ? '10-sinf talabasi' : 'Ученик 10-го класса',
            'Равшан Турсунов': currentLanguage === 'uz' ? 'Talabaaning ota-onasi, 3-sinf' : 'Родитель ученика 3-го класса',
            'Азиза Эргашева': currentLanguage === 'uz' ? '2023 yil bitiruvchisi' : 'Выпускница 2023 года'
        };
        return roles[author] || '';
    }

    // Initialize on page load
    document.addEventListener('DOMContentLoaded', () => {
        // renderTeachers(); // Disabled - use static HTML instead
        renderReviews();
    });

    // Also call on page visible (for language switch)
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            const newLanguage = localStorage.getItem('language') || 'ru';
            if (newLanguage !== currentLanguage) {
                location.reload();
            }
        }
    });
})();
