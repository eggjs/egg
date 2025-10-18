{{ helper.safe('<safe>') }}
{{ '<escape2>' | escape | escape }}
{{ helper.escape('<helper-safe>' | safe) }}
{{ helper.escape('<helper>') }}
{{ helper.escape('<helper-escape>') | escape }}
{{ helper.escape('<helper-escape>' | escape ) }}
{{ helper.escape(helper.escape('<helper2>')) }}