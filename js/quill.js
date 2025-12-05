const toolbarOptions = {
    container: [
        ['emoji'],
        ['bold', 'italic', 'underline', 'strike'],
        ['link', { list: 'ordered' }, { list: 'bullet' }],
        ['code-block'],
    ],
    handlers: {
        emoji: function () { }
    }
};

const quill = new Quill('#editor', {
    theme: 'snow',
    placeholder: 'スレッドへのメッセージ',
    modules: {
        toolbar: toolbarOptions,

        'emoji-toolbar': true,
        'emoji-shortname': true,
        keyboard: {
            bindings: {
                // Ctrl + Enter で送信
                ctrl_enter: {
                    key: 'Enter',
                    ctrlKey: true,
                    handler: function () {
                        $('#send').click();
                        return false;
                    }
                },
                // Tabで送信ボタンにフォーカス
                tab: {
                    key: 'Tab',
                    handler: function () {
                        $('#send').focus();
                        return false
                    }
                }
            }
        }
    },
});