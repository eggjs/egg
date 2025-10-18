<input id="input1" type="hidden" name="nonce" value="{{ctx.nonce}}">
<script id="script1" src="a.js"></script>
<script id="script2" type="text/javascript">
  var a = 1;
</script>
<script id="script3" nonce="{{ctx.nonce}}">
  var b = 2;
</script>
