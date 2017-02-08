{{ partial('partial/header') }}
<div class="page-main">
  <article class="markdown-body">
    <h1>{{ page.title }}</h1>
    {{ page.content }}
  </article>
  <aside id="mobileAside" class="toc">
    <a id="mobileTrigger" href="#" class="mobile-trigger">
      <ul>
        <li></li>
        <li></li>
        <li></li>
      </ul>
    </a>
    <div class="mobile-menu">
      <ul>{{ menu_link() }}</ul>
    </div>
    {{ guide_toc() }}
  </aside>
</div>

<script>
var mobileTrigger = document.getElementById('mobileTrigger');
var mobileAside = document.getElementById('mobileAside');
mobileTrigger.onclick = function(e) {
  if (mobileAside.className.indexOf('mobile-show') === -1) {
    mobileAside.className += ' mobile-show';
  } else {
    mobileAside.className = 'toc';
  }
};
</script>
