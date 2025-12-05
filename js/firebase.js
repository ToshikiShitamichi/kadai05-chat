import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getDatabase, ref, set, push, onValue, update, get, remove, off } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import firebaseConfig from "./api.js";

// Firebase 初期化
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 認証関係
const provider = new GoogleAuthProvider();
const auth = getAuth(app);

// グローバル状態
let currentUser = null;
let currentThreadId = localStorage.getItem("current-thread") || null;
let messageRef = null;
let messageValueCallback = null;

// Realtime Database の基準パス
const THREAD_PATH = "thread";
const MESSAGE_PATH = "messages";
const LIKE_PATH = "likes";

// ローカルストレージ key
const LS_KEY_CURRENT_THREAD = "current-thread";
const LS_KEY_SCROLL = "scroll";

// ref を作るためのヘルパ
const threadRef = ref(db, THREAD_PATH);
const getMessageRef = (threadId) => ref(db, `${MESSAGE_PATH}/${threadId}`);
const getLikeRef = (messageId, userId) => ref(db, `${LIKE_PATH}/${messageId}/${userId}`);

// ログイン状態の監視
$("body").addClass("remove-scrolling");
$(".content").hide();

onAuthStateChanged(auth, (user) => {
    currentUser = user;

    if (user) {
        // ユーザーアイコンを表示
        $("#user-icon").html(
            `<img class="user-icon" src="${user.photoURL}">`
        );

        $(".start").hide();
        $(".content").show();
        $("body").removeClass("remove-scrolling");
    }
});

// ログインボタン
$(".start button").on("click", function () {
    signInWithPopup(auth, provider);
});

// スレッド作成
$(".create").on("click", function () {
    // 新規スレッド名入力欄を追加
    $(".thread-list").append('<input id="input-create-thread" type="text">')
    $("#input-create-thread").focus();
});

// フォーカス外れたら入力欄削除
$(document).on("blur", "#input-create-thread", function () {
    $("#input-create-thread").remove();
});

// Enter でスレッド作成
$(document).on("keydown", "#input-create-thread", function (e) {
    if (e.key === "Enter") {
        const title = $("#input-create-thread").val().trim();
        if (title) {
            $(".current-thread").removeClass("current-thread");
            createThread(title);
        }
        $("#input-create-thread").remove();
    }
});

// スレッド作成処理
function createThread(title) {
    // thread/ に新しい push ref を作成
    const newThreadRef = push(threadRef);
    const threadId = newThreadRef.key;

    // スレッドのタイトルを保存
    set(newThreadRef, {
        title: title,
    });

    // カレントスレッドとして保存
    currentThreadId = threadId;
    localStorage.setItem(LS_KEY_CURRENT_THREAD, threadId);
}

// スレッド一覧購読
onValue(threadRef, (snapshot) => {
    $(".thread-list").html("");

    // スナップショットを一旦配列に展開（描画のため）
    const threads = [];
    snapshot.forEach((childSnapshot) => {
        threads.push({
            id: childSnapshot.key,
            ...childSnapshot.val(),
        });
    });

    // 各スレッドを描画
    threads.forEach((thread) => {
        const isCurrent = currentThreadId && currentThreadId === thread.id;
        const itemHtml = `<p class="thread-title${isCurrent ? " current-thread" : ""}" data-thread-id="${thread.id}">${thread.title}</p>`;
        $(".thread-list").append(itemHtml);
    });

    // currentThreadId があればヘッダーと messageRef をセットして購読
    if (currentThreadId) {
        const currentThread = threads.find(
            (t) => t.id === currentThreadId
        );
        if (currentThread) {
            $(".chat-header").html(`<h3>${currentThread.title}</h3>`);
            subscribeToMessages(currentThreadId);
        }
    }
});

// スレッドをクリックした時の処理
$(document).on("click", ".thread-title", function () {
    const threadId = $(this).data("thread-id");

    // カレントクラス切り替え
    $(".current-thread").removeClass("current-thread");
    $(this).addClass("current-thread");

    // ヘッダー更新
    $(".chat-header").html(`<h3>${$(this).text()}</h3>`);

    // カレントスレッドIDを保存
    currentThreadId = threadId;
    localStorage.setItem(LS_KEY_CURRENT_THREAD, threadId);

    // メッセージ購読し直し
    subscribeToMessages(threadId);
});

// 現在のスレッドのメッセージ購読
function subscribeToMessages(threadId) {
    if (!threadId) return;

    // 既存 listener があれば off する
    if (messageRef && messageValueCallback) {
        off(messageRef, "value", messageValueCallback);
    }

    // 新しい messageRef を作成
    messageRef = getMessageRef(threadId);

    // コールバックを定義
    messageValueCallback = (snapshot) => {
        $(".chat-list").html("");

        snapshot.forEach((childSnapshot) => {
            const messageId = childSnapshot.key;
            const data = childSnapshot.val();

            const sendUserIcon = data.uI;
            const sendUserName = data.uN;
            const sendDate = data.date;
            const html = data.html;
            const likeCount = data.likeCount;

            const likeRef = getLikeRef(messageId, currentUser.uid);

            // メッセージ 1 件分の HTML
            const msgHtml = `<div class="chat-msg ql-snow" id="${messageId}"><div class="msg-header"><p class="chat-detail"><img class="user-icon" src="${sendUserIcon}"><span class="username">${sendUserName}</span><span class="date">${sendDate}</span></p><div class="user-action"><button class="material-symbols-outlined chat-delete">delete</button></div></div><div class="ql-editor"><div class="chat-html">${html}</div><button class="like-btn material-symbols-outlined">favorite</button><span class="like-count">${likeCount}</span></div></div>`;

            $(".chat-list").append(msgHtml);

            // 自分が「いいね」したかどうかチェック
            get(likeRef).then((likeSnap) => {
                if (likeSnap.val() === true) {
                    $(`.chat-msg#${messageId}`)
                        .find(".like-btn")
                        .addClass("liked");
                }
            });

            // 自分以外の投稿には削除ボタンを非表示
            if (!currentUser || sendUserName !== currentUser.displayName) {
                $(`.chat-msg#${messageId}`)
                    .find(".user-action")
                    .addClass("user-action-none");
            }
        });

        restoreScroll();
    };

    // onValue で購読開始
    onValue(messageRef, messageValueCallback);
}

// 「いいね」ボタン
$(document).on("click", ".like-btn", function () {
    if (!currentUser) return; // 念のため

    const $btn = $(this);
    const $chatMsg = $btn.closest(".chat-msg");
    const messageId = $chatMsg.attr("id");
    const $count = $btn.siblings(".like-count");

    let likeCount = Number($count.text());
    const likeRef = getLikeRef(messageId, currentUser.uid);

    const isLiked = $btn.hasClass("liked");

    if (!isLiked) {
        $btn.addClass("liked");
        likeCount += 1;
        set(likeRef, true);
    } else {
        $btn.removeClass("liked");
        likeCount -= 1;
        set(likeRef, false);
    }

    $count.text(likeCount);

    // いいね数を message に反映
    if (!currentThreadId) return;
    const postRef = ref(db, `${MESSAGE_PATH}/${currentThreadId}/${messageId}`);
    update(postRef, { likeCount });
});

// メッセージ送信
$("#send").on("click", function () {
    if (!messageRef || !currentUser) return;

    const newPostRef = push(messageRef);
    const date = new Date();

    const formattedDate =
        String(date.getMonth() + 1).padStart(2, "0") +
        "月" +
        String(date.getDate()).padStart(2, "0") +
        "日" +
        String(date.getHours()).padStart(2, "0") +
        ":" +
        String(date.getMinutes()).padStart(2, "0");

    const msg = {
        uI: currentUser.photoURL,
        uN: currentUser.displayName,
        date: formattedDate,
        html: quill.root.innerHTML,
        likeCount: 0,
    };

    set(newPostRef, msg);

    quill.setText("");
});

// メッセージ削除
$(document).on("click", ".chat-delete", function () {
    if (!currentThreadId) return;

    const messageId = $(this).closest(".chat-msg").attr("id");
    const postRef = ref(db, `${MESSAGE_PATH}/${currentThreadId}/${messageId}`);
    remove(postRef);
});

// スクロール制御
function restoreScroll() {
    const savedScroll = localStorage.getItem(LS_KEY_SCROLL);
    if (savedScroll !== null) {
        $(".chat-list").scrollTop(Number(savedScroll));
    }
}

$(".chat-list").on("scroll", function () {
    localStorage.setItem(LS_KEY_SCROLL, $(".chat-list").scrollTop());
});

// Quill 設定
const toolbarOptions = {
    container: [
        ["emoji"],
        ["bold", "italic", "underline", "strike"],
        ["link", { list: "ordered" }, { list: "bullet" }],
        ["code-block"],
    ],
    handlers: {
        emoji: function () { },
    },
};

const quill = new Quill("#editor", {
    theme: "snow",
    placeholder: "スレッドへのメッセージ",
    modules: {
        toolbar: toolbarOptions,
        "emoji-toolbar": true,
        "emoji-shortname": true,
        keyboard: {
            bindings: {
                // Ctrl + Enter で送信
                ctrl_enter: {
                    key: "Enter",
                    ctrlKey: true,
                    handler: function () {
                        $("#send").click();
                        return false;
                    },
                },
                // Tab で送信ボタンにフォーカス
                tab: {
                    key: "Tab",
                    handler: function () {
                        $("#send").focus();
                        return false;
                    },
                },
            },
        },
    },
});
