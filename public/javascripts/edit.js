$(function () {
    swfobject.embedSWF(
        'http://static.slidesharecdn.com/swf/ssplayer2.swf',
        'player', '400', '320', '8', null, flashvars,
        { allowScriptAccess: 'always' },
        { id: 'player' }
    );

    var calcTotal = function () {
        var total = 0;
        $('select').each(function (i, e) {
            var m, s;
            total += Number($(e).val());
            m = Math.floor(total / 60);
            s = String(total % 60).replace(/^(\d)$/, '0$1');
            $(e).parent().find('.total').text('(total: ' + m + ':' + s + ')');
        });
    };
    calcTotal();
    $('select').change(calcTotal);
});
