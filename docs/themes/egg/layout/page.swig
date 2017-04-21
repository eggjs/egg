<div class="page-main">
  <article class="markdown-body">
    <h1>{{ page.title }}</h1>
    {{ page.content }}
  </article>
  {{ partial('partial/aside') }}
</div>
<script>
var handler = function(hash) {
    var target = document.getElementById(hash.slice(1));
    if (!target) return;
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