$(function () {
    var prev = '';
    setInterval(function () {
        var q = $('#search').val();
        if (q === prev) {
            return;
        }
        var onSuccess = function (data) {
            if (! data) { return; }
            var i, l;
            var meta = data.Slideshows.Meta;
            var slideshows = data.Slideshows.Slideshow;
            var onClick = function () {
                var id = $(this).closest('.result').attr('id');
                $('#create_id').val(id);
                $('form').submit();
            };

            $('#results').empty();
            $('#query').text('query: ' + meta.Query + ' (' + meta.NumResults + ' results)');
            if (! slideshows) { return; }
            for (i = 0, l = slideshows.length; i < l; i++) {
                var div = $('<div>').addClass('result').attr({ id: slideshows[i].ID })
                    .append(
                        $('<a>').attr({
                            href: slideshows[i].URL,
                            target: '_blank'
                        }).append($('<img>').attr({
                            src: slideshows[i].ThumbnailURL
                        }))
                    )
                    .append($('<div>').addClass('info')
                            .append($('<div>').html(slideshows[i].Title))
                            .append($('<div>').html(slideshows[i].Username))
                            .append($('<div>').text(slideshows[i].Created))
                            .append($('<button>').text('create').click(onClick)));
                $('#results').append(div);
            }
        };
        $.ajax({
            url: '/api/search',
            data: { q: q },
            dataType: 'json',
            success: onSuccess
        });
        prev = q;
    }, 1000);
});
