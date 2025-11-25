const quill = new Quill('#editor', {
    modules: {
        toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            ['link', { 'list': 'ordered' }, { 'list': 'bullet' }],
            ['code-block'],
        ],
        keyboard: {
            bindings: {
                // Ctrl + Enter で送信
                ctrl_enter: {
                    key: 'Enter',
                    ctrlKey: true,  // Ctrl + Enter
                    handler: function (range, context) {
                        $('#send').click();
                        return false;
                    }
                },
                tab: {
                    ker: 'Tab',
                    handler: function (range, context) {
                        $('#send').focus();
                        return false
                    }
                }
            }
        }
    },
    placeholder: 'スレッドへのメッセージ',
    theme: 'snow',
});
