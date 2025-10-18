{{ helper.foo('bar') }}
{{ helper.foo() }}
{{ helper.arr[0]('bar') }}
{{ helper.obj.a('bar') }}
{{ helper.pathFor('filters') }}

safe: {{ helper.safe('<div>foo</div>') }}
escape: {{ helper.escape('<div>foo</div>') }}
safe-escape: {{ helper.safe('<div>' + helper.escape('<span>') + '</div>') }}
csrfTag: {{ helper.csrfTag() }}
