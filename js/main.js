// 引入你刚才导出的 auth 和 db
import { auth, db, ref, update, push, onChildAdded, onValue, runTransaction, query, orderByChild, limitToLast, get, endAt, remove, serverTimestamp } from "./firebase-config.js";
//import {    getDatabase, ref, push, onChildAdded, onValue, runTransaction,query, orderByChild, limitToLast, get, endAt, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
// 页面加载时自动匿名登录

const publishBtn = document.getElementById("publish-btn");
const contentInput = document.getElementById("commentInput");
console.log("当前登录用户:", auth.currentUser ? auth.currentUser.uid : "未登录");
// 关键词拦截库 (可根据需要自行增加)
const SPAM_WORDS = ["博彩", "点位", "加微", "跑分", "招人", "换汇", "联系", "飞机", "电话", "代理", "微信", "wechat"];
let isCoolingDown = false;
publishBtn.addEventListener("click", async () => {
    if (isCoolingDown) return; // 如果正在冷却，直接返回


    // publish.js
    const lastPost = localStorage.getItem("last_post_at");
    if (lastPost && (Date.now() - lastPost < 60000)) {
        alert("发布太快了，请稍等一分钟。");
        return;
    }

    const content = contentInput.value.trim();
    const user = auth.currentUser;

    // 1. 基础校验
    if (!user) return alert("系统正在初始化，请稍后...");
    if (content.length < 10) return alert("内容太短了，请至少输入10个字。");

    // 2. 关键词过滤
    const isSpam = SPAM_WORDS.some(word => content.includes(word));
    if (isSpam) return alert("内容包含违规词汇，请重新编辑。");

    // 3. 准备写入路径 (多路径原子更新)
    const postId = `post_${Date.now()}`;
    const now = serverTimestamp();

    //const updates = {};
    //// 写入帖子内容
    //updates[`/posts/${postId}`] = {
    //    content: content,
    //    uid: user.uid,
    //    timestamp: now,
    //    status: "pending" // 初始为待审核
    //};
    //// 写入最后发帖时间（用于 Rules 的 1 分钟频率限制）
    //updates[`/user_metadata/${user.uid}/last_post_at`] = now;

    // 4. 执行写入
    publishBtn.disabled = true; // 防止连续点击
    publishBtn.innerText = "正在发布...";
    isCoolingDown = true;
    // 直接指向 posts 路径
    const postsRef = ref(db, "posts");

    const postData = {
        content: content,
        uid: user.uid, // 确保这个 uid 和规则里的 auth.uid 对应
        timestamp: serverTimestamp(),
        status: "pending"
    };

    try {
        //await update(ref(db), updates);
        await push(ref(db, "posts"), postData);
        localStorage.setItem("last_post_at", Date.now());
        alert("发布成功！审核通过后将显示。");
        contentInput.value = ""; // 清空输入框
    } catch (error) {
        if (error.message.includes("Permission denied")) {
            alert("发帖太快了，请休息 1-2 分钟再试。");
        } else {
            console.error("写入失败:", error);
            alert("发布失败，请检查网络。");
        }
    } finally {
        publishBtn.disabled = false;
        publishBtn.innerText = "发布办事体验";
        isCoolingDown = false;

    }
});

// 监听投票并动态更新 UI
export function syncVotes() {
    onValue(ref(db, 'votes'), (snapshot) => {
        const allVotes = snapshot.val() || {};
        document.querySelectorAll('[data-vote-for]').forEach(el => {
            const loc = el.getAttribute('data-vote-for').replace(/[.#$/[\]]/g, "_");
            const status = el.getAttribute('data-status');
            const count = (allVotes[loc] && allVotes[loc][status]) || 0;
            el.innerText = `${status} (${count})`;
        });
    });
}
export function voteStatus(locName, status)   {
    // 关键：清理掉名称中的非法字符（Firebase key 限制）
    const safeKey = locName.replace(/[.#$/[\]]/g, "_");
    const voteRef = ref(db, `votes/${safeKey}/${status}`);

    // 使用 runTransaction 确保并发安全
    runTransaction(voteRef, (currentValue) => {
        return (currentValue || 0) + 1;
    }).then(() => {
        console.log("投票成功:", safeKey, status);
        alert(`[${locName}] 感谢反馈！`);
    }).catch((error) => {
        console.error("投票失败:", error);
        alert("由于网络或权限原因，反馈暂未提交。");
    });
};
// 1. 变量准备
let clickCount = 0;
let lastClickTime = 0;
const _sc = "202b20d4bce8ff9594b180ff42fe5543a89505a3a9e29faa5a8a47b29c5ada86";

// 2. SHA-256 加密工具函数
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// 3. 隐藏手势：点击标题触发管理模式
window.triggerAdmin = async () => {

    const now = Date.now();
    // 如果两次点击超过 500ms，重置计数
    if (now - lastClickTime > 500) clickCount = 0;

    clickCount++;
    lastClickTime = now;

    if (clickCount === 5) {
        clickCount = 0;
        const input = prompt("请输入管理暗号：");

        // 1. 如果用户点了取消，直接返回
        if (input === null) return;

        // 2. 自动去掉前后空格 (防止手机输入法自动加空格)
        const cleanInput = input.trim();

        // 3. 执行加密比对
        const hashedInput = await sha256(cleanInput);

        // 调试专用：如果还是错，解除下面这行的注释，在控制台看你输入的东西加完密是什么
        // console.log("你输入的加密后为:", hashedInput);

        if (hashedInput === _sc) {
            document.body.classList.add('admin-mode');
            alert("🔒 验证通过，管理模式已开启。");
        } else {
            alert("❌ 暗号错误！");
        }
        console.log(hashedInput);
        console.log(_sc);
    }
};

window.requestDelete = (commentId) => {
    // 只有开启了管理模式才允许操作
    if (!document.body.classList.contains('admin-mode')) return;

    // 找到当前点击的这个 HTML 元素
    // 我们假设你的 renderComment 函数给 div 设置了 id，如果没有，请看下方的修改
    const targetCard = document.querySelector(`[data-id="${commentId}"]`);

    if (confirm("确定要永久移除这条情报吗？")) {
        const itemRef = ref(db, `comments/${commentId}`);

        remove(itemRef).then(() => {
            // --- 核心修复：成功后立刻从视觉上移除 ---
            if (targetCard) {
                targetCard.style.transition = "all 0.4s ease";
                targetCard.style.opacity = "0";
                targetCard.style.transform = "translateX(50px)"; // 向右滑动消失动画

                setTimeout(() => {
                    targetCard.remove(); // 动画结束后彻底从 DOM 树删除
                }, 400);
            }
            console.log("数据库已同步删除");
        }).catch(err => {
            alert("删除失败: " + err.message);
        });
    }
};
