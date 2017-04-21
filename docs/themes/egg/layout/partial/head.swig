<title>{{ page.title || 'egg' }} - {{ __('index.slogan') }}</title>
<meta charset="utf-8">
<meta name="description" content="{{ __('') }}">
<meta http-equiv="X-UA-Compatible" content="IE=Edge,chrome=1">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="icon" href="/images/favicon.png" type="image/x-icon">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/docsearch.js/2/docsearch.min.css" />
{{ css('css/index') }}
<script src="//cdn.bootcss.com/jquery/2.2.4/jquery.min.js"></script>
<script>
var handler = function(hash) {
    var target = document.getElementById(hash.slice(1));
    if (!target) return;
    console.log('target.offset.top=' + $(target).offset().top);
    var targetOffset = $(target).offset().top - (25+56);
    $('html,body').animate({
        scrollTop: targetOffset
    }, 200);
}

$('a[href^="#"][href!="#"]').click(function() {
    handler(this.hash)
});
if (location.hash) {
    handler(location.hash)
};
</script>