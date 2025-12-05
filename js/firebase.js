import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getDatabase, ref, set, push, onValue, update, get } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";;
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import firebaseConfig from "./api.js"

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// 認証関係
const provider = new GoogleAuthProvider();
const auth = getAuth(app);

let currentUser = null

$("body").addClass("remove-scrolling");
$(".content").hide();
onAuthStateChanged(auth, (user) => {
    currentUser = user
    if (user) {
        $("#user-icon").html('<img class="user-icon" src="' + user.photoURL + '">')
        $(".start").hide();
        $(".content").show();
        $("body").removeClass("remove-scrolling");
    }
})

$(".start button").on("click", function () {
    signInWithPopup(auth, provider);
})

// データベース関係
// Initialize Realtime Database and get a reference to the serv ice
const database = getDatabase(app);

const db = getDatabase();
const threadRef = ref(db, "thread")
let current_threadId = localStorage.getItem("current-thread") || null;
let messageRef = null

$(".create").on("click", function () {
    $(".popup").addClass("popup-show").fadeIn();
    $(".popup").html('<div class="popup-content"><p><label for="input-create-thread">スレッド名</label><input id="input-create-thread" type=text name="input-create-thread"></p><button id="popup-create">作成</button><button id="popup-close">閉じる</button></div>');
    $("#input-create-thread").focus()
});

$(document).on("click", "#popup-close", function () {
    $(".popup").removeClass("popup-show");
});

$(document).on("click", "#popup-create", function () {
    $(".current-thread").removeClass("current-thread")
    createThread($("#input-create-thread").val())
    $(".popup").removeClass("popup-show");
});

function createThread(title) {
    const newThreadRef = push(threadRef);
    const threadId = newThreadRef.key;

    set(newThreadRef, {
        title: title,
    });
    localStorage.setItem("current-thread", threadId)
}

onValue(threadRef, (snapshot) => {
    $(".thread-list").html("");

    snapshot.forEach((childSnapshot) => {
        const threadId = childSnapshot.key
        const data = childSnapshot.val()

        const title = data.title

        let item = null
        setTimeout(() => {
            if (localStorage.getItem("current-thread")) {
                if (localStorage.getItem("current-thread") == threadId) {
                    item = '<p class="thread-title current-thread" id="' + threadId + '">' + title + '</p>';
                    messageRef = ref(db, 'messages/' + threadId)
                    $(".chat-header").html('<h3>' + title + '</h3>');
                }
                else {
                    item = '<p class="thread-title" id="' + threadId + '">' + title + '</p>';
                }
            } else {
                item = '<p class="thread-title" id="' + threadId + '">' + title + '</p>';
            }
            $(".thread-list").append(item);
        }, 1);
    });
    setTimeout(() => {
        subscribe()
    }, 1);
});

$(document).on("click", ".thread-title  ", function () {
    $(".current-thread").removeClass("current-thread")
    let threadId = $(this).attr("id");
    messageRef = ref(db, 'messages/' + threadId)
    localStorage.setItem("current-thread", threadId)
    $("#" + threadId).addClass("current-thread");
    $(".chat-header").html('<h3>' + $("#" + threadId).text() + '</h3>');
    subscribe()
});



function subscribe() {
    if (messageRef) {
        onValue(messageRef, (snapshot) => {
            $(".chat-list").html('');
            snapshot.forEach(childSnapshot => {
                const data = childSnapshot.val()

                const sendUserIcon = data.uI
                const sendUserName = data.uN;
                const sendDate = data.date;
                const html = data.html;
                const likeCount = data.likeCount
                const likeRef = ref(db, 'likes/' + childSnapshot.key + '/' + currentUser.uid)

                let h = '<div class="chat-msg ql-snow" id="' + childSnapshot.key + '"><div class="msg-header"><p class="chat-detail"><img class="user-icon" src="' + sendUserIcon + '"><span class="username">' + sendUserName + '</span><span class="date">' + sendDate + '</span></p><div class="user-action"><button class="material-symbols-outlined">edit</button><button class="material-symbols-outlined">delete</button></div></div><div class="ql-editor">' + html + '<br><button class="like-btn material-symbols-outlined">favorite</button><span class="like-count">' + likeCount + '</span></div></div>'
                $(".chat-list").append(h);

                get(likeRef).then((likeSnap) => {
                    if (likeSnap.val() === true) {
                        $('.chat-msg#' + childSnapshot.key).find('.like-btn').addClass('liked');
                    }
                });

                console.log($('.chat-msg#' + childSnapshot.key))

                if(sendUserName != currentUser.displayName){
                    console.log("in")
                    $('.chat-msg#' + childSnapshot.key ).find('.user-action').addClass('user-action-none');
                }
            });
            scroll()
        })
    }
}

$(document).on("click", ".like-btn", function () {
    console.log($(this).siblings(".like-count").text())
    let likeCount = Number($(this).siblings(".like-count").text())
    const likeRef = ref(db, 'likes/' + $(this).closest(".chat-msg").attr("id") + '/' + currentUser.uid)
    if ($(this).attr("class") != "like-btn material-symbols-outlined liked") {
        $(this).addClass("liked");
        likeCount += 1
        set(likeRef, true)
    } else {
        $(this).removeClass("liked");
        likeCount -= 1
        set(likeRef, false)
    }
    $(this).siblings(".like-count").text(likeCount)
    const threadId = localStorage.getItem("current-thread")
    const postRef = ref(db, 'messages/' + threadId + '/' + $(this).closest(".chat-msg").attr("id"))
    update(postRef, {
        'likeCount': likeCount
    })
});

$("#send").on("click", function () {
    const newPostRef = push(messageRef);
    let date = new Date(Date.now())
    const msg = {
        uI: currentUser.photoURL,
        uN: currentUser.displayName,
        date: (Number(date.getMonth()) + 1).toString().padStart(2, "0") + "月" + date.getDate().toString().padStart(2, "0") + "日" + date.getHours().toString().padStart(2, "0") + ":" + date.getMinutes().toString().padStart(2, "0"),
        html: quill.root.innerHTML,
        likeCount: 0,
    };
    set(newPostRef, msg)
    quill.setText('');
});

// スクロール制御
function scroll() {
    if (localStorage.getItem("scroll")) {
        const save_scroll = localStorage.getItem("scroll")
        $(".chat-list").scrollTop(save_scroll);
    }
}

$(".chat-list").on("scroll", function () {
    localStorage.setItem("scroll", $(".chat-list").scrollTop())
});