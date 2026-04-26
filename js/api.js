// js/api.js (обновленная версия)
(function() {
    const SUPABASE_URL = 'https://rfjmdevsnvirrxonhsny.supabase.co';
    const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1`;

    window.API = {
        _buildUrl(endpoint) {
            const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
            return `${EDGE_FUNCTION_URL}/${cleanEndpoint}`;
        },

        async _fetchWithRetry(url, options, maxRetries = 3, timeoutMs = 60000) {
            let lastError;
            let delay = 1000; // начальная задержка 1 секунда
            
            for (let attempt = 0; attempt < maxRetries; attempt++) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
                    
                    const response = await fetch(url, {
                        ...options,
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);
                    
                    // При 503 (сервис недоступен) пробуем ещё раз
                    if (response.status === 503 && attempt < maxRetries - 1) {
                        console.warn(`Attempt ${attempt + 1}: Service unavailable (503), retrying in ${delay}ms...`);
                        await new Promise(r => setTimeout(r, delay));
                        delay *= 2; // exponential backoff
                        continue;
                    }
                    
                    // При 5xx ошибках пробуем ещё раз
                    if (response.status >= 500 && response.status < 600 && attempt < maxRetries - 1) {
                        console.warn(`Attempt ${attempt + 1}: Server error ${response.status}, retrying in ${delay}ms...`);
                        await new Promise(r => setTimeout(r, delay));
                        delay *= 2;
                        continue;
                    }
                    
                    return response;
                } catch (error) {
                    lastError = error;
                    console.warn(`Attempt ${attempt + 1} failed:`, error.message);
                    
                    if (attempt < maxRetries - 1) {
                        await new Promise(r => setTimeout(r, delay));
                        delay *= 2;
                    }
                }
            }
            throw lastError;
        },

        async request(endpoint, options = {}) {
            try {
                const url = this._buildUrl(endpoint);
                const response = await this._fetchWithRetry(url, options);
                
                let data;
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    data = await response.json();
                } else {
                    const text = await response.text();
                    throw new Error('Сервер вернул некорректный ответ');
                }
                
                if (!response.ok) {
                    throw new Error(data.error || `Ошибка ${response.status}`);
                }
                return data;
            } catch (error) {
                console.error(`Request failed for ${endpoint}:`, error);
                throw error;
            }
        },

        async register(characterName, staticId, password) {
            return this.request('register', {
                method: 'POST',
                body: JSON.stringify({ characterName, staticId, password })
            });
        },

        async login(staticId, password) {
            return this.request('login', {
                method: 'POST',
                body: JSON.stringify({ staticId, password })
            });
        },

        async verifyToken(token) {
            return this.request('verify', {
                method: 'POST',
                body: JSON.stringify({ token })
            });
        },

        async getUsers(token) {
            if (!token) throw new Error('Токен не предоставлен');
            const data = await this.request('users', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (data.users) return data.users;
            if (Array.isArray(data)) return data;
            throw new Error('Неверный формат ответа от сервера');
        },

        async updateUserRole(token, userId, newRole) {
            if (!token) throw new Error('Токен не предоставлен');
            return this.request('update-role', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ userId, newRole })
            });
        },
        
        async updateUserName(token, userId, newName) {
            if (!token) throw new Error('Токен не предоставлен');
            return this.request('update-name', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ userId, newName })
            });
        },

        async getProfile(token) {
            if (!token) throw new Error('Токен не предоставлен');
            return this.request('profile', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        },

        async updateProfile(token, updates) {
            if (!token) throw new Error('Токен не предоставлен');
            return this.request('profile', {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(updates)
            });
        },

        async deleteAvatar(token) {
            if (!token) throw new Error('Токен не предоставлен');
            return this.request('profile', {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        },

        async createAppeal(token, appealType, details = {}) {
            if (!token) throw new Error('Токен не предоставлен');
            if (!appealType) throw new Error('Тип обращения не указан');
            return this.request('create-appeal', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ appealType, details })
            });
        },

        async createAppealWithFiles(token, formData) {
            if (!token) throw new Error('Токен не предоставлен');
            const url = this._buildUrl('create-appeal');
            const response = await this._fetchWithRetry(url, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            }, 3, 90000); // 90 секунд таймаут для файлов
            
            let data;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                throw new Error('Сервер вернул некорректный ответ');
            }
            if (!response.ok) throw new Error(data.error || `Ошибка ${response.status}`);
            return data;
        },

        async getAppeals(token, status = null, userId = null) {
            if (!token) throw new Error('Токен не предоставлен');
            let endpoint = 'get-appeals';
            const params = [];
            if (status) params.push(`status=${status}`);
            if (userId) params.push(`userId=${userId}`);
            if (params.length > 0) endpoint += `?${params.join('&')}`;
            const response = await this.request(endpoint, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return response.appeals || [];
        },

        async updateAppealStatus(token, appealId, status, adminComment = null, newRoleLevel = null, discordThreadId = null) {
            if (!token) throw new Error('Токен не предоставлен');
            if (!appealId || !status) throw new Error('Не указан ID обращения или статус');
            return this.request('update-appeal-status', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ appealId, status, adminComment, newRoleLevel, discordThreadId })
            });
        },

        async linkDiscord(token) {
            if (!token) throw new Error('Token not provided');
            const width = 500;
            const height = 600;
            const left = window.screenX + (window.outerWidth - width) / 2;
            const top = window.screenY + (window.outerHeight - height) / 2;
            const authUrl = `${EDGE_FUNCTION_URL}/discord?token=${encodeURIComponent(token)}`;
            return new Promise((resolve, reject) => {
                const popup = window.open(authUrl, 'Discord Auth', `width=${width},height=${height},left=${left},top=${top}`);
                if (!popup) {
                    reject(new Error('Popup blocked. Please allow popups for this site.'));
                    return;
                }
                let resolved = false;
                let timeoutId = null;
                let intervalId = null;
                const cleanup = () => {
                    if (timeoutId) clearTimeout(timeoutId);
                    if (intervalId) clearInterval(intervalId);
                    window.removeEventListener('message', messageHandler);
                };
                const messageHandler = (event) => {
                    if (event.data === 'discord-linked') {
                        resolved = true;
                        cleanup();
                        resolve({ success: true });
                    } else if (event.data === 'discord-error') {
                        resolved = true;
                        cleanup();
                        reject(new Error('Failed to link Discord'));
                    }
                };
                window.addEventListener('message', messageHandler);
                intervalId = setInterval(() => {
                    if (popup.closed) {
                        cleanup();
                        if (!resolved) reject(new Error('Auth window was closed'));
                    }
                }, 500);
                timeoutId = setTimeout(() => {
                    cleanup();
                    if (!popup.closed && !resolved) {
                        popup.close();
                        reject(new Error('Discord auth timeout'));
                    }
                }, 300000);
            });
        },

        async unlinkDiscord(token) {
            if (!token) throw new Error('Токен не предоставлен');
            return this.request('discord', {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        },

        async getDiscordInfo(discordId) {
            if (!discordId) return null;
            return { id: discordId };
        },

        async createLawyerReport(token, articles, callResult, hadJurist) {
            if (!token) throw new Error('Токен не предоставлен');
            if (!articles || !callResult) throw new Error('Заполните все обязательные поля');
            return this.request('lawyer-reports', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ articles, callResult, hadJurist })
            });
        },

        async getLawyerReports(token, filters = {}) {
            if (!token) throw new Error('Токен не предоставлен');
            let endpoint = 'lawyer-reports';
            const params = [];
            if (filters.all) params.push('all=true');
            if (filters.userId) params.push(`user_id=${filters.userId}`);
            if (filters.limit) params.push(`limit=${filters.limit}`);
            if (filters.offset) params.push(`offset=${filters.offset}`);
            if (filters.lawyerName) params.push(`lawyerName=${encodeURIComponent(filters.lawyerName)}`);
            if (filters.startDate) params.push(`startDate=${filters.startDate}`);
            if (filters.endDate) params.push(`endDate=${filters.endDate}`);
            if (params.length > 0) endpoint += `?${params.join('&')}`;
            return this.request(endpoint, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        },

        async getLawyerRating(token) {
            if (!token) throw new Error('Токен не предоставлен');
            return this.request('lawyer-reports?rating=true', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        },

        async sendLawyerReportWithFiles(token, formData) {
            if (!token) throw new Error('Токен не предоставлен');
            const url = this._buildUrl('send-lawyer-report');
            const response = await this._fetchWithRetry(url, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            }, 3, 90000); // 90 секунд таймаут
            
            let data;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                throw new Error('Сервер вернул некорректный ответ');
            }
            if (!response.ok) throw new Error(data.error || `Ошибка ${response.status}`);
            return data;
        }
    };
})();
