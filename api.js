/**
 * V-UP 專用「送餐員」函數 (API Fetch Utility)
 * 這個檔案負責幫你從「廚房」(伺服器) 拿資料。
 */

const API_BASE_URL = 'http://localhost:3000/api';
const API_SECRET = 'vup_private_key_2026'; // SaaS 私人密鑰

/**
 * 通用的拿資料函數
 * @param {string} path - 像是 '/milestones' 或 '/profile'
 */
async function vupFetch(path, options = {}) {
    try {
        const url = API_BASE_URL + path;
        
        // 1. 出發去拿資料
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'X-VUP-Secret': API_SECRET, // 這裡是 SaaS 的安全驗證
                ...options.headers
            }
        });

        // 2. 檢查對方有沒有回應 (例如 404 代表沒這個號碼)
        if (!response.ok) {
            throw new Error(`伺服器沒開或是網址錯了 (錯誤代碼: ${response.status})`);
        }

        // 3. 把拿到的東西拆開成資料格式
        return await response.json();
    } catch (error) {
        console.error('串接失敗：', error);
        // 如果失敗了，我們丟出一個錯誤給後面的畫面的代碼處理
        throw error;
    }
}

/**
 * 貼文相關
 */
async function getPosts() { return await vupFetch('/posts'); }
async function addPost(content) {
    return await vupFetch('/posts', {
        method: 'POST',
        body: JSON.stringify({ content })
    });
}

/**
 * 相片相關
 */
async function getPhotos() { return await vupFetch('/photos'); }
async function addPhoto(data) {
    return await vupFetch('/photos', {
        method: 'POST',
        body: JSON.stringify(data)
    });
}
