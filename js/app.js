// js/app.js
(function() {
    window.showPreloader = function() {
        const preloader = document.getElementById('preloader');
        if (preloader) {
            preloader.classList.remove('fade-out');
            preloader.style.display = 'flex';
        }
    };
    
    window.hidePreloader = function() {
        const preloader = document.getElementById('preloader');
        if (preloader) {
            preloader.classList.add('fade-out');
            setTimeout(() => {
                preloader.style.display = 'none';
            }, 500);
        }
    };
    
    window.Router = {
        currentPage: 'home',
        
        async init() {
            const preloader = document.getElementById('preloader');
            const appContainer = document.getElementById('app-container');
            
            if (preloader) {
                setTimeout(function() {
                    window.hidePreloader();
                    if (appContainer) {
                        appContainer.style.display = 'block';
                    }
                }, 1000);
            } else {
                if (appContainer) {
                    appContainer.style.display = 'block';
                }
            }
            
            const pageContent = document.getElementById('page-content');
            if (pageContent) {
                pageContent.innerHTML = '<div class="loader">Загрузка...</div>';
            }
            
            if (!window.Auth) {
                return;
            }
            
            if (!window.Utils) {
                return;
            }
            
            await window.Auth.init();
            
            this.setupEventListeners();
            
            const initialPage = window.location.hash.slice(1) || 'home';
            await this.navigateTo(initialPage);
        },
        
        setupEventListeners() {
            window.addEventListener('hashchange', async () => {
                const page = window.location.hash.slice(1) || 'home';
                await this.navigateTo(page);
            });
        },
        
        async navigateTo(page) {
            window.showPreloader();
            
            this.currentPage = page;
            window.location.hash = page;
            
            const pageContent = document.getElementById('page-content');
            if (!pageContent) {
                window.hidePreloader();
                return;
            }
            
            pageContent.innerHTML = '<div class="loader">Загрузка...</div>';
            
            try {
                let pageModule = page;
                if (page === 'lawyer-reports') {
                    pageModule = 'LawyerReports';
                } else if (page === 'senior') {
                    pageModule = 'Senior';
                } else if (page === 'admin') {
                    pageModule = 'Admin';
                } else if (page === 'profile') {
                    pageModule = 'Profile';
                } else if (page === 'lawyers') {
                    pageModule = 'Lawyers';
                } else if (page === 'appeals') {
                    pageModule = 'Appeals';
                } else if (page === 'home') {
                    pageModule = 'Home';
                } else {
                    pageModule = page.charAt(0).toUpperCase() + page.slice(1);
                }
                
                switch(page) {
                    case 'home':
                        if (window.Pages && window.Pages.Home) {
                            await window.Pages.Home.render();
                        } else {
                            pageContent.innerHTML = '<div class="card">Страница не найдена</div>';
                        }
                        break;
                    case 'profile':
                        if (!window.Auth.currentUser || !window.Auth.currentUser.id) {
                            window.Auth.showAuthModal();
                            window.hidePreloader();
                            return;
                        }
                        if (window.Pages && window.Pages.Profile) {
                            await window.Pages.Profile.render();
                        } else {
                            pageContent.innerHTML = '<div class="card">Страница не найдена</div>';
                        }
                        break;
                    case 'lawyers':
                        if (window.Pages && window.Pages.Lawyers) {
                            await window.Pages.Lawyers.render();
                        } else {
                            pageContent.innerHTML = '<div class="card">Страница не найдена</div>';
                        }
                        break;
                    case 'appeals':
                        if (!window.Auth.currentUser || !window.Auth.currentUser.id) {
                            window.Auth.showAuthModal();
                            window.hidePreloader();
                            return;
                        }
                        if (window.Auth.currentUser.discord_id === null || !window.Auth.currentUser.discord_id) {
                            Utils.showNotification('Для доступа к обращениям необходимо привязать Discord в профиле', 'error');
                            await this.navigateTo('profile');
                            window.hidePreloader();
                            return;
                        }
                        if (window.Pages && window.Pages.Appeals) {
                            await window.Pages.Appeals.render();
                        } else {
                            pageContent.innerHTML = '<div class="card">Страница Обращения не найдена</div>';
                        }
                        break;
                    case 'senior':
                        if (!window.Auth.currentUser || !window.Auth.currentUser.id) {
                            window.Auth.showAuthModal();
                            window.hidePreloader();
                            return;
                        }
                        if (window.Auth.currentUser.role_level < 5) {
                            Utils.showNotification('Доступ запрещен. Требуется уровень доступа 5+', 'error');
                            await this.navigateTo('home');
                            window.hidePreloader();
                            return;
                        }
                        if (window.Pages && window.Pages.Senior) {
                            await window.Pages.Senior.render();
                        } else {
                            pageContent.innerHTML = '<div class="card">Страница не найдена</div>';
                        }
                        break;
                    case 'admin':
                        if (!window.Auth.currentUser || !window.Auth.currentUser.id) {
                            window.Auth.showAuthModal();
                            window.hidePreloader();
                            return;
                        }
                        if (window.Auth.currentUser.role_level < 5) {
                            Utils.showNotification('Доступ запрещен', 'error');
                            await this.navigateTo('home');
                            window.hidePreloader();
                            return;
                        }
                        if (window.Pages && window.Pages.Admin) {
                            await window.Pages.Admin.render();
                        } else {
                            pageContent.innerHTML = '<div class="card">Страница не найдена</div>';
                        }
                        break;
                    case 'lawyer-reports':
                        if (!window.Auth.currentUser || !window.Auth.currentUser.id) {
                            window.Auth.showAuthModal();
                            window.hidePreloader();
                            return;
                        }
                        if (window.Auth.currentUser.role_level < 4) {
                            Utils.showNotification('Доступ запрещен. Требуется уровень доступа 4+ (Адвокат)', 'error');
                            await this.navigateTo('home');
                            window.hidePreloader();
                            return;
                        }
                        if (window.Pages && window.Pages.LawyerReports) {
                            await window.Pages.LawyerReports.render();
                        } else {
                            try {
                                const module = await import('./pages/lawyer-reports.js');
                                if (module && module.LawyerReports) {
                                    window.Pages.LawyerReports = module.LawyerReports;
                                    await window.Pages.LawyerReports.render();
                                } else {
                                    throw new Error('LawyerReports module export not found');
                                }
                            } catch (loadError) {
                                pageContent.innerHTML = `
                                    <div class="card error-card">
                                        <h3>❌ Ошибка загрузки страницы</h3>
                                        <p>Не удалось загрузить модуль отчетов адвоката</p>
                                        <button onclick="window.Router.navigateTo('home')" class="btn btn-primary">
                                            Вернуться на главную
                                        </button>
                                    </div>
                                `;
                            }
                        }
                        break;
                    default:
                        if (window.Pages && window.Pages.Home) {
                            await window.Pages.Home.render();
                        } else {
                            pageContent.innerHTML = '<div class="card">Страница не найдена</div>';
                        }
                }
                
                this.updateActiveNavLink(page);
                
                setTimeout(() => {
                    window.hidePreloader();
                }, 300);
                
            } catch (error) {
                pageContent.innerHTML = `<div class="card error-card">Ошибка загрузки страницы: ${error.message}</div>`;
                window.hidePreloader();
            }
        },
        
        updateActiveNavLink(activePage) {
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
            });
            
            let pageId = activePage;
            if (activePage === 'lawyer-reports') {
                pageId = 'lawyer-reports';
            } else if (activePage === 'senior') {
                pageId = 'senior';
            } else if (activePage === 'admin') {
                pageId = 'admin';
            }
            
            const activeLink = document.querySelector(`.nav-link[data-page="${pageId}"]`);
            if (activeLink) {
                activeLink.classList.add('active');
            }
        }
    };
    
    document.addEventListener('DOMContentLoaded', () => {
        window.Router.init();
    });
    
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (link && link.getAttribute('href') && link.getAttribute('href').startsWith('#')) {
            const hash = link.getAttribute('href');
            const page = hash.slice(1);
            if (page && (page === 'lawyer-reports' || page === 'senior' || page === 'admin' || page === 'profile' || page === 'lawyers' || page === 'appeals' || page === 'home')) {
                e.preventDefault();
                window.Router.navigateTo(page);
            }
        }
    });
})();