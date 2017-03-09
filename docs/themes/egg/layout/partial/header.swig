<div class="nav" >
  <header>
    <a href="{{ index_link() }}" class="nav-logo" alt="egg"><img src="https://zos.alipayobjects.com/rmsportal/VTcUYAaoKqXyHJbLAPyF.svg"></a>
    <ul class="nav-item">
      {{ menu_link() }}
      <!--
      <li class="translations">
        <a class="nav-link">{{ __('header.translations') }}</a>
        <span class="arrow"></span>
        <ul class="dropdown-content">
          <li><a href="/">中文</a></li>
          <li><a href="/">English</a></li>
        </ul>
      </li>
      -->
      <li><iframe src="https://ghbtns.com/github-btn.html?user=eggjs&repo=egg&type=star&count=true" frameborder="0" scrolling="0" width="150px" height="20px"></iframe></li>
      <li>
        <form id="search-form">
          <input type="text" id="search-query" class="search-query st-default-search-input">
        </form>
      </li>
    </ul>
    <a id="mobileTrigger" href="#" class="mobile-trigger">
      <ul>
        <li></li>
        <li></li>
        <li></li>
      </ul>
    </a>
  </header>
</div>
