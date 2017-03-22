<!DOCTYPE html>
<html lang="{{ page.lang }}">
<head>
  {{ partial('partial/head') }}
</head>
<body>
  {{ partial('partial/header') }}
  <div id="container">
    {{ body }}
  </div>
</body>
<script src="https://cdn.jsdelivr.net/docsearch.js/2/docsearch.min.js"></script>
<script>
docsearch({
  apiKey: '1561de31a86f79507ea00cdb54ce647c',
  indexName: 'eggjs',
  inputSelector: '#search-query',
  // debug: true // Set debug to true if you want to inspect the dropdown
});
</script>
<div class="cnzz">
<script src="https://s11.cnzz.com/z_stat.php?id=1261142226&web_id=1261142226" language="JavaScript"></script>
</div>
</html>
