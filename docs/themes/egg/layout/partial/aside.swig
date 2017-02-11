<aside id="mobileAside" class="toc">
  <div class="mobile-menu">
    <ul>{{ menu_link() }}</ul>
  </div>
  {{ guide_toc() }}
</aside>
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
