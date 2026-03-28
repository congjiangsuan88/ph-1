import { db, ref, query, orderByChild, equalTo, limitToLast, endAt, get } from "./firebase-config.js";




// --- 核心函数：获取数据 ---
// 1. 确保这两个变量在函数外部定义
let oldestTimestamp = null; // 用于记录当前页面最旧帖子的时间戳
const PAGE_SIZE = 6;       // 每次加载的数量

async function fetchPosts(isFirstLoad = false) {
    const loadMoreBtn = document.getElementById("load-more-btn");
    const displayContainer = document.getElementById("experience-display");
    if (!loadMoreBtn || !displayContainer) return;

    loadMoreBtn.innerText = "正在加载...";
    loadMoreBtn.disabled = true;

    try {
        const postsRef = ref(db, "posts");
        let postsQuery;

        if (isFirstLoad) {
            // 第一次加载：按状态过滤最新数据
            postsQuery = query(
                postsRef,
                orderByChild("status"),
                equalTo("approved"),
                limitToLast(PAGE_SIZE)
            );
        } else {
            // 加载更多：按时间戳向前查找（不分状态，后面代码过滤）
            // 这里的 endAt(oldestTimestamp - 1) 是核心
            postsQuery = query(
                postsRef,
                orderByChild("timestamp"),
                endAt(oldestTimestamp - 1),
                limitToLast(PAGE_SIZE)
            );
        }

        const snapshot = await get(postsQuery);
        const data = snapshot.val();

        // 如果没数据，直接收工
        if (!data || typeof data !== 'object') {
            loadMoreBtn.style.display = "none";
            if (isFirstLoad) displayContainer.innerHTML = "<p class='text-center py-10 text-slate-400'>暂无办事体验</p>";
            return;
        }

        // 2. 处理数据：转为数组 -> 过滤已审核 -> 倒序排
        //let postsArray = Object.values(data);
        // 在 fetchPosts 内部，获取数据后
        let postsArray = Object.values(data).filter(p => p.status === "approved");
        // 必须过滤，因为分页查询（按时间）会把 pending 的也查出来，如果不手动过滤，首页就不会显示。

        // 关键：非首次加载时，因为是按时间查的，必须手动过滤掉 pending 的
        //if (!isFirstLoad) {
        //    postsArray = postsArray.filter(p => p.status === "approved");
        //}

        postsArray.sort((a, b) => b.timestamp - a.timestamp);

        // 3. 渲染与锚点更新
        if (postsArray.length > 0) {
            // 更新全局变量，供下次点击使用
            oldestTimestamp = postsArray[postsArray.length - 1].timestamp;
            console.log("新的时间锚点:", oldestTimestamp); // 调试用

            renderPosts(postsArray, isFirstLoad);
        }

        // 4. 判断是否显示按钮
        // 如果原始数据量达到 PAGE_SIZE，说明数据库深处可能还有
        if (Object.keys(data).length >= PAGE_SIZE) {
            loadMoreBtn.style.display = "block";
            loadMoreBtn.innerText = "︾ 点击加载更多记录";
            loadMoreBtn.disabled = false;
        } else {
            loadMoreBtn.style.display = "none";
        }

    } catch (error) {
        console.error("加载失败详情:", error);
        loadMoreBtn.innerText = "加载失败，请重试";
        loadMoreBtn.disabled = false;
    }
}

// --- 渲染函数 ---
function renderPosts(posts, isFirstLoad) {
    const displayContainer = document.getElementById("experience-display");

    const html = posts.map(post => {
        const shortId = post.uid ? post.uid.substring(post.uid.length - 4).toUpperCase() : "TEMP";

        const d = new Date(post.timestamp);
        const timeStr = `${d.getMonth() + 1}-${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;

        return `
        <div class="w-full max-w-4xl mx-auto bg-white border-b border-slate-100 p-4 hover:bg-slate-50/50 transition-colors">
            
            <div class="flex items-start justify-between gap-4">
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1.5">
                        <span class="text-[13px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">菲友-${shortId}</span>
                        <span class="text-[11px] text-slate-400 font-mono">${timeStr}</span>
                    </div>

                    <p class="text-slate-700 text-[15px] leading-relaxed whitespace-pre-wrap">
                        ${escapeHTML(post.content)}
                    </p>
                </div>
            </div>
        </div>
        `;
    }).join('');

    if (isFirstLoad) {
        displayContainer.innerHTML = html;
    } else {
        displayContainer.insertAdjacentHTML('beforeend', html);
    }
}
// 确保在 DOM 加载完成后绑定
document.addEventListener("DOMContentLoaded", () => {
    const loadMoreBtn = document.getElementById("load-more-btn");

    if (loadMoreBtn) {
        loadMoreBtn.addEventListener("click", () => {
            fetchPosts(false);
        });
    } else {
        console.error("错误：在页面上没找到 ID 为 'load-more-btn' 的按钮");
    }

    // 页面进入时自动加载第一波数据
    fetchPosts(true);
});
function escapeHTML(str) {
    const p = document.createElement('p');
    p.textContent = str;
    return p.innerHTML;
}
// ---