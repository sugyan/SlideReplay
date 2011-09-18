$(function () {
    var started = false;
    var messages = {};
    var appendMessage = function (data) {
        $('#messages').prepend(
            $('<div>').addClass('message')
                .append($('<span>').addClass('timer').text(data.timer))
                .append($('<span>').addClass('body').text((data.name || 'you') + ': ' + data.message))
        );
        var timer = data.timer;
        delete data.timer;
        if (! messages[timer]) {
            messages[timer] = [];
        }
        messages[timer].push(data);
    };
    var displayMessage = function (message) {
        var hex = '0123456789ABCDEF'.split('');
        var color = '#' + $.map([0, 0, 0, 0, 0, 0], function (i, e) {
            return hex[Math.floor(Math.random() * 16)];
        }).join('');
        var div = $('<div>').addClass('overlay').css({
            color: color,
            left: 600,
            top: Math.floor(Math.random() * $('#overlay').height() * 0.9)
        }).text(message);
        $('#overlay').append(div);
        setTimeout(function () {
            div.remove();
        }, 7000);
    };
    // socket.io
    var socket = io.connect();
    socket.on('connect', function () {
        socket.emit('join', location.pathname.replace(RegExp('/play/([0-9a-f]+)'), '$1'));
    });
    socket.on('connection', function (data) {
        if (data.total) {
            $('#total').text('total: ' + data.total);
        }
        if (data.room) {
            $('#room').text('here: ' + data.room);
        }
    });
    socket.on('message', appendMessage);
    // swf player
    var onSwfLoad = function () {
        var offset = $('#player').position();
        var parent = $('#player').parent();
        parent.append($('<div>').attr({ id: 'overlay' }).css({
            position: 'absolute',
            top: offset.top,
            bottom: 0,
            width: 598,
            height: 480,
            'background-color': 'clear',
            'z-index': 10
        }).append($('<div>').css({
            position: 'relative',
            top: 452,
            left: 239,
            width: 120,
            color: 'red',
            'text-align': 'center',
            'font-weight': 'bold',
            'background-color': 'lightgray'
        }).text('Auto Playing')));

        var start = function () {
            var bar = $('#progressbar');
            var progress_ratio = 0;
            started = true;
            // timer
            var start = new Date().getTime();
            var timer = setInterval(function () {
                var ds = Math.floor((new Date().getTime() - start) / 100);
                ds = (ds < 10 ? '0' + ds : String(ds)).replace(/(\d)$/, '.$1');
                var message = messages[ds];
                if (message) {
                    delete messages[ds];
                    $.each(message, function (i, e) {
                        displayMessage(e.name + ': ' + e.message);
                    });
                }
                $('#timer').text(ds);
                bar.progressbar(
                    'option', 'value', bar.progressbar('option', 'value') + progress_ratio
                );
            }, 100);
            // auto play
            var next = function () { document.getElementById('player').next(); };
            var loop; loop = function (timeout) {
                bar.progressbar('option', 'value', 0);
                progress_ratio = 10000 / timeout;
                setTimeout(function () {
                    next();
                    var wait = replay.shift();
                    if (wait === undefined) {
                        started = false;
                        clearInterval(timer);
                        return;
                    }
                    loop(wait * 1000);
                }, timeout);
            };
            loop(replay.shift() * 1000);
        };
        var count = 3;
        var countdown; countdown = setInterval(function () {
            $('#timer').css({ color: 'red' }).text(count--);
            if (count < 0) {
                $('#timer').css({ color: 'black' });
                clearInterval(countdown);
                start();
            }
        }, 1000);
    };
    swfobject.embedSWF(
        'http://static.slidesharecdn.com/swf/ssplayer2.swf',
        'player', '598', '480', '8', null, flashvars, {
            allowScriptAccess: 'always',
            wmode: 'transparent'
        }, {
            id: 'player'
        }, onSwfLoad
    );
    // message
    $('#form_message').submit(function (e) {
        e.preventDefault();
        var message = $('#message');
        var val = message.val();
        if (val.length > 0 && val.length < 50 && started) {
            var data = {
                timer: $('#timer').text(),
                message: val
            };
            socket.emit('message', data);
            appendMessage(data);
            displayMessage(val);
        }
        message.val('');
    });
    $('#message').focus();
    // move overlay messages
    setInterval(function () {
        $('.overlay').each(function (i, e) {
            var offset = $(e).offset();
            offset.left -= 15;
            $(e).offset(offset);
        });
    }, 100);
    // progress bar
    $("#progressbar").progressbar({
        value: 0
    });
});
