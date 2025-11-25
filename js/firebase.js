import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getDatabase, ref, set, push, onChildAdded } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";;
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import firebaseConfig from "./api.js"

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// 認証関係
const provider = new GoogleAuthProvider();
const auth = getAuth(app);

let currentUser = null

// ログイン状態の監視
onAuthStateChanged(auth, (user) => {
    currentUser = user
    if (user) {
        $("#user-icon").html('<img class="user-icon" src="' + user.photoURL + '">')
    } else {
        signInWithPopup(auth, provider);
    }
});

$(document).on("click", "#sign-out", function () {
    signOut(auth)
});

// データベース関係
// Initialize Realtime Database and get a reference to the serv ice
const database = getDatabase(app);

const db = getDatabase();
const dbRef = ref(db, 'test');

$("#send").on("click", function () {
    const newPostRef = push(dbRef);
    let date = new Date(Date.now())
    console.log(date)
    console.log(date.getDay())
    const msg = {
        uI: currentUser.photoURL,
        uN: currentUser.displayName,
        date: (Number(date.getMonth())+1) + "月" + date.getDate() + "日" + date.getHours() + ":" + date.getMinutes(),
        html: quill.root.innerHTML,
    };
    set(newPostRef, msg)
    quill.setText('');
});

onChildAdded(dbRef, function (data) {
    const sendUserIcon = data.val().uI
    const sendUserName = data.val().uN;
    const sendDate = data.val().date;
    const html = data.val().html;
    let h = '<div class="chat-msg ql-snow"><p class="chat-detail"><img class="user-icon" src="' + sendUserIcon + '"><span class="username">' + sendUserName + '</span><span class="date">' + sendDate + '</span></p><div class="ql-editor">' + html + '</div></div><hr>'
    $(".chat-list").append(h);
})
