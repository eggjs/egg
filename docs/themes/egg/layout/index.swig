<div class="nav">
  <header>
    <a href="{{ index_link() }}" class="nav-logo" alt="egg"><img src="https://zos.alipayobjects.com/rmsportal/VTcUYAaoKqXyHJbLAPyF.svg"></a>
    <ul>
      {{ menu_link() }}
      <li><iframe src="https://ghbtns.com/github-btn.html?user=eggjs&repo=egg&type=star&count=false" frameborder="0" scrolling="0" width="54px" height="20px"></iframe></li>
    </ul>
  </header>
</div>

<div class="index">
  <div class="banner block index-bg-light">
    <div class="banner-logo"><img src="https://zos.alipayobjects.com/rmsportal/JFKAMfmPehWfhBPdCjrw.svg"/></div>
    <div class="banner-info">
      <h1><p style="font-weight:bold;font-size:48px;">Born to build</p>better enterprise frameworks and apps with Node.js && koa"</h1>
      <p style="font-size: 22px;">为企业级框架和应用而生</p>
      <p class="banner-button">
        <a class="btn btn-primary" href="{{ index_link('/intro/quickstart.html') }}">{{ __('index.getstart') }}</a>
        <a class="btn btn-secondary" href="https://github.com/eggjs/egg/">Github</a>
      </p>
    </div>
  </div>
</div>
{{ partial('partial/footer') }}
<script src="/images/logo-animate.js"></script>
<script>logo('logo')</script>
